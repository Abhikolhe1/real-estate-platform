import os
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from typing import Dict, Any
from parser import CADParser
from geometry import GeometryEngine
from ocr import OCREngine

app = FastAPI(
    title="Aether AI Engine Service",
    description="Python microservice responsible for advanced CAD extraction, OCR parsing, and geometry synthesis.",
    version="1.0.0"
)

class ParseRequest(BaseModel):
    filePath: str

@app.get("/health")
def health_check() -> Dict[str, str]:
    return {"status": "healthy", "service": "aether-ai-engine"}

@app.post("/parse")
def parse_dxf_file(request: ParseRequest) -> Dict[str, Any]:
    file_path = request.filePath
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=404, 
            detail=f"Blueprint file not found at the specified path: {file_path}"
        )
    
    is_dxf = file_path.lower().endswith(".dxf")

    try:
        if is_dxf:
            print(f"Triggering production ezdxf parser on file: {file_path}")
            parser = CADParser(file_path)
            parsed_data = parser.parse()
            
            # Integrate OCR fallback for empty DXF text layouts
            if not parsed_data.get("labels"):
                print("No native DXF labels found. Executing OCR fallback engine...")
                try:
                    ocr = OCREngine()
                    parsed_data["labels"] = ocr.extract_labels(file_path)
                    print(f"OCR fallback successfully resolved {len(parsed_data['labels'])} labels.")
                except Exception as ocr_err:
                    print(f"OCR label fallback failed: {ocr_err}")

            # Run advanced computational geometry Room Detection engine
            print("Running advanced Planar Graph Cycle-Finding Room & Aperture Snapping...")
            engine = GeometryEngine(snap_tolerance=0.08)
            rooms, snapped_walls, snapped_apertures = engine.detect_rooms(
                parsed_data["walls"],
                parsed_data["labels"],
                parsed_data["doors"],
                parsed_data["windows"]
            )
            parsed_data["rooms"] = rooms
            parsed_data["walls"] = snapped_walls
            parsed_data["apertures"] = snapped_apertures
        else:
            print(f"Triggering OCR procedural parsing on non-DXF file: {file_path}")
            ocr = OCREngine()
            labels = ocr.extract_labels(file_path)
            
            rooms = []
            walls = []
            apertures = []
            
            for idx, lbl in enumerate(labels):
                name = lbl["text"]
                cx = lbl["x"]
                cz = lbl["z"]
                w = 6.0
                d = 6.0
                min_x = cx - w/2
                min_z = cz - d/2
                
                rooms.append({
                    "id": f"room-{idx+1}",
                    "name": name,
                    "x": round(min_x, 2),
                    "z": round(min_z, 2),
                    "width": w,
                    "depth": d,
                    "color": "#ece8f2" if "bed" in name.lower() else "#f5efe6",
                    "node": {
                        "x": round(cx, 2),
                        "z": round(cz, 2)
                    }
                })
                
                wall_ids = [
                    f"w-proc-{idx*4 + 1}",
                    f"w-proc-{idx*4 + 2}",
                    f"w-proc-{idx*4 + 3}",
                    f"w-proc-{idx*4 + 4}"
                ]
                
                # Bottom
                walls.append({
                    "id": wall_ids[0],
                    "startX": round(min_x, 2), "startZ": round(min_z, 2),
                    "endX": round(min_x + w, 2), "endZ": round(min_z, 2),
                    "thickness": 0.15, "height": 3.0
                })
                # Right
                walls.append({
                    "id": wall_ids[1],
                    "startX": round(min_x + w, 2), "startZ": round(min_z, 2),
                    "endX": round(min_x + w, 2), "endZ": round(min_z + d, 2),
                    "thickness": 0.15, "height": 3.0
                })
                # Top
                walls.append({
                    "id": wall_ids[2],
                    "startX": round(min_x + w, 2), "startZ": round(min_z + d, 2),
                    "endX": round(min_x, 2), "endZ": round(min_z + d, 2),
                    "thickness": 0.15, "height": 3.0
                })
                # Left
                walls.append({
                    "id": wall_ids[3],
                    "startX": round(min_x, 2), "startZ": round(min_z + d, 2),
                    "endX": round(min_x, 2), "endZ": round(min_z, 2),
                    "thickness": 0.15, "height": 3.0
                })
                
                apertures.append({
                    "id": f"ap-door-{idx+1}",
                    "wallId": wall_ids[0],
                    "type": "door",
                    "startOffset": round(w / 2, 2),
                    "width": 0.9,
                    "height": 2.1,
                    "elevation": 0.0,
                    "swing": -1
                })
                
            parsed_data = {
                "walls": walls,
                "rooms": rooms,
                "apertures": apertures,
                "furniture": [],
                "doors": [],
                "windows": [],
                "labels": labels
            }
            
        return {
            "success": True,
            "filePath": file_path,
            "data": parsed_data
        }
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"CAD parsing failed:\n{error_details}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal parser processing error: {str(e)}"
        )

@app.post("/ocr")
def run_ocr(request: ParseRequest) -> Dict[str, Any]:
    file_path = request.filePath
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=404,
            detail=f"Drawing file not found at path: {file_path}"
        )
    try:
        print(f"Triggering OCR Engine on: {file_path}")
        engine = OCREngine()
        labels = engine.extract_labels(file_path)
        return {
            "success": True,
            "filePath": file_path,
            "labels": labels
        }
    except Exception as e:
        import traceback
        print(f"OCR run failed:\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal OCR engine processing error: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
