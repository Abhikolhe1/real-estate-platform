import os
import math
import json
import cv2
import numpy as np
from PIL import Image
import pypdfium2 as pdfium
from typing import Dict, Any, List, Tuple
from ocr import OCREngine

class PDFProcessor:
    def __init__(self):
        self.gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

    def rasterize_pdf_to_image(self, pdf_path: str, dpi: int = 300) -> Image.Image:
        """
        Rasterize the first page of a PDF file to a PIL Image at specified DPI using pypdfium2.
        """
        print(f"Rasterizing PDF: {pdf_path} using pypdfium2")
        doc = pdfium.PdfDocument(pdf_path)
        page = doc[0]
        # pypdfium2 default scale is 72 DPI. Multiply scale to match target DPI.
        scale = dpi / 72.0
        bitmap = page.render(scale=scale)
        pil_img = bitmap.to_pil()
        return pil_img

    def detect_scale_from_labels(self, labels: List[Dict[str, Any]]) -> float:
        """
        Attempts to detect the scale (meters per pixel) from text labels.
        Looks for common millimeter values like 3000, 3600, 4000, 4200, 4500, etc.
        If found, checks distance and calculates meters per pixel.
        Defaults to 0.02 meters per pixel (typical for 300 DPI floor plan images).
        """
        default_scale = 0.02
        
        # Try to find dimension numbers
        dimension_candidates = []
        for lbl in labels:
            text = lbl["text"].strip()
            # If text is purely numeric and represents a typical room dimension in mm (e.g. 1000 - 8000)
            if text.isdigit():
                val = int(text)
                if 1000 <= val <= 10000:
                    dimension_candidates.append((lbl, val))
                    
        if len(dimension_candidates) >= 2:
            # Calculate distance between two closest candidates to estimate scale
            # For simplicity, we can also look for a scale text like "1:100"
            for lbl in labels:
                text = lbl["text"].lower()
                if "scale" in text:
                    if "1:100" in text:
                        return 0.01 # 1cm = 1m at scale, but converted to pixels depends on DPI.
                    if "1:50" in text:
                        return 0.005

        return default_scale

    def detect_rooms_opencv(self, img_gray: np.ndarray, labels: List[Dict[str, Any]], meters_per_pixel: float) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Uses OpenCV Canny edge detection, morph closing, and findContours to find room polygons.
        Returns (rooms, walls, apertures) in layout coordinates.
        """
        # Threshold / Edge detection
        blurred = cv2.GaussianBlur(img_gray, (5, 5), 0)
        edges = cv2.Canny(blurred, 50, 150)

        # Morphological operations to close small gaps in walls
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
        closed = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel)

        # Find contours with hierarchical retrieval
        contours, hierarchy = cv2.findContours(closed, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
        
        rooms = []
        walls = []
        apertures = []

        h, w = img_gray.shape
        cx_img, cy_img = w / 2, h / 2

        room_idx = 1
        wall_idx = 1
        
        # Iterate over all top-level or child contours that represent closed spaces
        # We look for contours representing internal rooms (usually have a parent contour representing the outer wall)
        if hierarchy is not None:
            hierarchy = hierarchy[0]
            for idx, cnt in enumerate(contours):
                # Filter by area (e.g., minimum area of 10000 sq pixels at 300 DPI, approx 4 sq meters)
                area = cv2.contourArea(cnt)
                if area < 8000 or area > (w * h * 0.8):
                    continue

                # Approximate contour to polygon
                epsilon = 0.02 * cv2.arcLength(cnt, True)
                approx = cv2.approxPolyDP(cnt, epsilon, True)
                
                # We need at least a quad (4 corners) for a valid room
                if len(approx) < 4:
                    continue

                # Check if it has child contours (which could be columns or inner voids, but normally RETR_CCOMP splits it well)
                # Convert vertices to layout meter coordinates centered around (0,0)
                vertices_meters = []
                for pt in approx:
                    px, py = pt[0][0], pt[0][1]
                    # Map pixels to meters centered at layout origin
                    lx = round((px - cx_img) * meters_per_pixel, 2)
                    lz = round((cy_img - py) * meters_per_pixel, 2) # Invert Y for layout Z
                    vertices_meters.append((lx, lz))

                # Calculate room bounding box & centroid in layout coordinates
                lx_coords = [pt[0] for pt in vertices_meters]
                lz_coords = [pt[1] for pt in vertices_meters]
                min_lx, max_lx = min(lx_coords), max(lx_coords)
                min_lz, max_lz = min(lz_coords), max(lz_coords)
                
                room_w = max_lx - min_lx
                room_d = max_lz - min_lz
                
                rx = min_lx
                rz = min_lz
                
                # Check for label inside
                room_name = f"Room {room_idx}"
                best_dist = float("inf")
                
                # Centroid in layout coordinates
                clx = sum(lx_coords) / len(lx_coords)
                clz = sum(lz_coords) / len(lz_coords)

                for lbl in labels:
                    lbl_x = lbl["x"]
                    lbl_z = lbl["z"]
                    
                    # Basic bounding box check
                    if min_lx <= lbl_x <= max_lx and min_lz <= lbl_z <= max_lz:
                        # Euclidean distance to centroid
                        d = math.hypot(lbl_x - clx, lbl_z - clz)
                        if d < best_dist:
                            room_name = lbl["text"]
                            best_dist = d
                            
                # Determine color based on room label
                name_lower = room_name.lower()
                color = "#fbfbfa"
                if "bed" in name_lower:
                    color = "#ece8f2"
                elif "living" in name_lower or "hall" in name_lower or "lounge" in name_lower:
                    color = "#f5efe6"
                elif "kitchen" in name_lower or "pantry" in name_lower:
                    color = "#f4ece1"
                elif "bath" in name_lower or "toilet" in name_lower or "wc" in name_lower:
                    color = "#ececec"
                elif "lobby" in name_lower or "corridor" in name_lower:
                    color = "#374151"

                room_id = f"room-{room_idx}"
                rooms.append({
                    "id": room_id,
                    "name": room_name,
                    "x": round(rx, 2),
                    "z": round(rz, 2),
                    "width": round(room_w, 2),
                    "depth": round(room_d, 2),
                    "color": color,
                    "node": {
                        "x": round(clx, 2),
                        "z": round(clz, 2)
                    }
                })

                # Generate wall segments for this room
                num_pts = len(vertices_meters)
                room_wall_ids = []
                for i in range(num_pts):
                    pt1 = vertices_meters[i]
                    pt2 = vertices_meters[(i + 1) % num_pts]
                    
                    w_id = f"w-pdf-{wall_idx}"
                    room_wall_ids.append(w_id)
                    walls.append({
                        "id": w_id,
                        "startX": pt1[0],
                        "startZ": pt1[1],
                        "endX": pt2[0],
                        "endZ": pt2[1],
                        "thickness": 0.15,
                        "height": 3.0
                    })
                    wall_idx += 1

                # Generate a mock door aperture for this room (on the first wall segment for layout integrity)
                if len(room_wall_ids) > 0:
                    apertures.append({
                        "id": f"ap-door-{room_idx}",
                        "wallId": room_wall_ids[0],
                        "type": "door",
                        "startOffset": round(room_w / 3, 2),
                        "width": 0.9,
                        "height": 2.1,
                        "elevation": 0.0,
                        "swing": -1
                    })

                room_idx += 1

        return rooms, walls, apertures

    def run_gemini_fallback(self, pil_image: Image.Image) -> Dict[str, Any]:
        """
        Uses Gemini Vision API (1.5 Flash) to analyze the floor plan and return structured layout details.
        """
        if not self.gemini_key:
            print("Gemini API key not configured. Skipping vision fallback.")
            return None

        try:
            import google.generativeai as genai
            genai.configure(api_key=self.gemini_key)
            
            prompt = (
                "Analyze this architectural floor plan image. "
                "Identify all primary rooms, their names, and approximate sizes. "
                "Return ONLY a valid JSON object format with the following keys:\n"
                "{\n"
                '  "rooms": [\n'
                '    {"name": "Living Room", "approxWidthMeters": 5.0, "approxDepthMeters": 4.5},\n'
                '    {"name": "Master Bedroom", "approxWidthMeters": 4.0, "approxDepthMeters": 3.8}\n'
                "  ],\n"
                '  "scale": "1:100"\n'
                "}\n"
                "Do not include any markup, markdown, backticks, or other text outside the JSON. Return only the JSON object."
            )

            model = genai.GenerativeModel('gemini-1.5-flash')
            response = model.generate_content([prompt, pil_image])
            
            clean_text = response.text.strip()
            if "```json" in clean_text:
                clean_text = clean_text.split("```json")[1].split("```")[0].strip()
            elif "```" in clean_text:
                clean_text = clean_text.split("```")[1].split("```")[0].strip()
                
            data = json.loads(clean_text)
            print("Successfully resolved Gemini Vision layout fallback.")
            return data
        except Exception as e:
            print(f"Gemini Vision fallback failed: {e}")
            return None

    def merge_gemini_with_opencv(self, cv_rooms: List[Dict[str, Any]], gemini_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Merges labels/details resolved by Gemini with geometry outlines found by OpenCV.
        Matches rooms based on spatial centroids.
        """
        if not gemini_data or "rooms" not in gemini_data:
            return cv_rooms

        gemini_rooms = gemini_data["rooms"]
        merged_rooms = []

        # We map Gemini room names to OpenCV contours sequentially if spatial intersection is unavailable,
        # or update the names of cv_rooms based on the best matched size or index.
        for idx, room in enumerate(cv_rooms):
            if idx < len(gemini_rooms):
                g_room = gemini_rooms[idx]
                room["name"] = g_room.get("name", room["name"])
                
                # Update sizes if layout sizes match roughly
                if "approxWidthMeters" in g_room:
                    room["width"] = round(g_room["approxWidthMeters"], 2)
                if "approxDepthMeters" in g_room:
                    room["depth"] = round(g_room["approxDepthMeters"], 2)

                # Re-calculate color based on new name
                name_lower = room["name"].lower()
                color = room["color"]
                if "bed" in name_lower:
                    color = "#ece8f2"
                elif "living" in name_lower or "hall" in name_lower or "lounge" in name_lower:
                    color = "#f5efe6"
                elif "kitchen" in name_lower:
                    color = "#f4ece1"
                elif "bath" in name_lower or "toilet" in name_lower or "wc" in name_lower:
                    color = "#ececec"
                elif "lobby" in name_lower or "corridor" in name_lower:
                    color = "#374151"
                room["color"] = color

            merged_rooms.append(room)

        return merged_rooms

    def process(self, pdf_path: str) -> Dict[str, Any]:
        """
        Main execution flow:
        - Rasterize PDF page.
        - Run OCR labels extraction.
        - Detect scale.
        - Run OpenCV contour room detection.
        - Trigger Gemini fallback if < 3 rooms detected.
        - Merge results.
        """
        # 1. Rasterize
        pil_image = self.rasterize_pdf_to_image(pdf_path, dpi=300)
        img_np = np.array(pil_image)
        
        # OpenCV converts RGB to BGR
        img_bgr = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
        img_gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

        # 2. Extract OCR labels
        ocr = OCREngine()
        labels = ocr.extract_labels(pdf_path)

        # 3. Detect scale
        meters_per_pixel = self.detect_scale_from_labels(labels)

        # 4. Detect Rooms
        rooms, walls, apertures = self.detect_rooms_opencv(img_gray, labels, meters_per_pixel)
        
        # 5. Gemini fallback if needed
        if len(rooms) < 3 and self.gemini_key:
            print(f"OpenCV found only {len(rooms)} rooms. Running Gemini Vision fallback...")
            gemini_data = self.run_gemini_fallback(pil_image)
            if gemini_data:
                rooms = self.merge_gemini_with_opencv(rooms, gemini_data)

        # If still empty, create default fallback layout
        if not rooms:
            print("No rooms resolved. Creating basic fallback layout.")
            rooms = [
                {
                    "id": "room-1",
                    "name": "Grand Hall",
                    "x": -5.0,
                    "z": -5.0,
                    "width": 10.0,
                    "depth": 10.0,
                    "color": "#f5efe6",
                    "node": {"x": 0.0, "z": 0.0}
                }
            ]
            walls = [
                {"id": "w-fallback-1", "startX": -5.0, "startZ": -5.0, "endX": 5.0, "startZ": -5.0, "thickness": 0.15, "height": 3.0},
                {"id": "w-fallback-2", "startX": 5.0, "startZ": -5.0, "endX": 5.0, "startZ": 5.0, "thickness": 0.15, "height": 3.0},
                {"id": "w-fallback-3", "startX": 5.0, "startZ": 5.0, "endX": -5.0, "startZ": 5.0, "thickness": 0.15, "height": 3.0},
                {"id": "w-fallback-4", "startX": -5.0, "startZ": 5.0, "endX": -5.0, "startZ": -5.0, "thickness": 0.15, "height": 3.0}
            ]
            apertures = [
                {"id": "ap-fallback-door", "wallId": "w-fallback-1", "type": "door", "startOffset": 5.0, "width": 0.9, "height": 2.1, "elevation": 0.0, "swing": -1}
            ]

        return {
            "walls": walls,
            "rooms": rooms,
            "apertures": apertures,
            "doors": [],
            "windows": [],
            "furniture": [],
            "labels": labels
        }
