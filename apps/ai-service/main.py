import os
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from typing import Dict, Any, List
from parser import CADParser
from geometry import GeometryEngine
from ocr import OCREngine
from style import StyleIntelligence
from pdf_processor import PDFProcessor

import ezdxf

app = FastAPI(
    title="Aether AI Engine Service",
    description="Python microservice responsible for advanced CAD extraction, OCR parsing, and geometry synthesis.",
    version="1.0.0"
)

class ParseRequest(BaseModel):
    filePath: str
    snapTolerance: float = 0.25
    layerMapping: Dict[str, str] = None

@app.get("/health")
def health_check() -> Dict[str, str]:
    return {"status": "healthy", "service": "aether-ai-engine"}

@app.get("/layers")
def get_dxf_layers(filePath: str) -> Dict[str, Any]:
    if not os.path.exists(filePath):
        raise HTTPException(
            status_code=404,
            detail=f"Blueprint file not found at path: {filePath}"
        )
    if not filePath.lower().endswith(".dxf"):
        raise HTTPException(
            status_code=400,
            detail="File is not a DXF drawing."
        )
    try:
        doc = ezdxf.readfile(filePath)
        layers = [layer.dxf.name for layer in doc.layers]
        return {
            "success": True,
            "filePath": filePath,
            "layers": layers
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to read DXF layers: {str(e)}"
        )

@app.post("/parse")
def parse_dxf_file(request: ParseRequest) -> Dict[str, Any]:
    file_path = request.filePath
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=404, 
            detail=f"Blueprint file not found at the specified path: {file_path}"
        )
    
    is_dxf = file_path.lower().endswith(".dxf")
    is_pdf = file_path.lower().endswith(".pdf")

    try:
        if is_dxf:
            print(f"Triggering production ezdxf parser on file: {file_path}")
            parser = CADParser(file_path, layer_mapping=request.layerMapping)
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
            print(f"Running advanced Planar Graph Cycle-Finding Room & Aperture Snapping (tolerance={request.snapTolerance})...")
            engine = GeometryEngine(snap_tolerance=request.snapTolerance)
            rooms, snapped_walls, snapped_apertures = engine.detect_rooms(
                parsed_data["walls"],
                parsed_data["labels"],
                parsed_data["doors"],
                parsed_data["windows"]
            )
            parsed_data["rooms"] = rooms
            parsed_data["walls"] = snapped_walls
            parsed_data["apertures"] = snapped_apertures
        elif is_pdf:
            print(f"Triggering PDFProcessor on file: {file_path}")
            pdf_proc = PDFProcessor()
            parsed_data = pdf_proc.process(file_path)
        else:
            print(f"Triggering OCR procedural parsing on non-DXF/non-PDF file: {file_path}")
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

class WallData(BaseModel):
    startX: float
    startZ: float
    endX: float
    endZ: float

class ClusterRequest(BaseModel):
    walls: List[WallData]
    eps: float = 8.0
    minSamples: int = 3

@app.post("/cluster")
def run_clustering(request: ClusterRequest) -> Dict[str, Any]:
    try:
        import numpy as np
        from sklearn.cluster import DBSCAN
        
        walls = request.walls
        if not walls:
            return {"success": True, "clusters": []}
            
        # 1. Compute midpoints of all walls
        midpoints = []
        for w in walls:
            midpoints.append([
                (w.startX + w.endX) / 2.0,
                (w.startZ + w.endZ) / 2.0
            ])
        
        X = np.array(midpoints)
        
        # 2. Run DBSCAN clustering
        # Handle cases where number of samples is less than minSamples
        min_samples = min(request.minSamples, len(walls))
        if min_samples < 1:
            min_samples = 1
            
        db = DBSCAN(eps=request.eps, min_samples=min_samples).fit(X)
        labels = db.labels_
        
        # 3. Group walls by cluster label
        clusters_map = {}
        for idx, label in enumerate(labels):
            if label == -1:
                # Noise in DBSCAN is labeled as -1, ignore or map to a noise cluster
                continue
            if label not in clusters_map:
                clusters_map[label] = []
            clusters_map[label].append(walls[idx])
            
        # 4. For each cluster, compute the bounding box enclosing all its walls
        clusters_result = []
        for label, cluster_walls in clusters_map.items():
            min_x = min(min(w.startX, w.endX) for w in cluster_walls)
            min_z = min(min(w.startZ, w.endZ) for w in cluster_walls)
            max_x = max(max(w.startX, w.endX) for w in cluster_walls)
            max_z = max(max(w.startZ, w.endZ) for w in cluster_walls)
            
            # Buffer the bounding box slightly (e.g. 0.5 meters) so it cleanly surrounds the walls
            buffer = 0.5
            min_x -= buffer
            min_z -= buffer
            max_x += buffer
            max_z += buffer
            
            # Label the cluster dynamically
            cluster_name = f"Tower {chr(65 + int(label))}" if int(label) < 26 else f"Tower Region {int(label) + 1}"
            
            clusters_result.append({
                "id": f"cluster-{label}",
                "name": cluster_name,
                "minX": round(min_x, 3),
                "minZ": round(min_z, 3),
                "maxX": round(max_x, 3),
                "maxZ": round(max_z, 3)
            })
            
        # Sort clusters by name or coordinate to ensure deterministic ordering
        clusters_result.sort(key=lambda c: c["name"])
        
        return {
            "success": True,
            "clusters": clusters_result
        }
    except Exception as e:
        import traceback
        print(f"Spatial clustering failed:\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal clustering engine processing error: {str(e)}"
        )

class DetectStyleRequest(BaseModel):
    imageUrl: str

@app.post("/detect-style")
def detect_style(request: DetectStyleRequest) -> Dict[str, Any]:
    try:
        print(f"Triggering Style Intelligence on: {request.imageUrl}")
        intelligence = StyleIntelligence()
        result = intelligence.detect_style(request.imageUrl)
        return {
            "success": True,
            "imageUrl": request.imageUrl,
            "style": result["style"],
            "materials": result["materials"],
            "colors": result["colors"],
            "confidence": result["confidence"],
            "local": result.get("local", True)
        }
    except Exception as e:
        import traceback
        print(f"Style detection failed:\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal style intelligence error: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

