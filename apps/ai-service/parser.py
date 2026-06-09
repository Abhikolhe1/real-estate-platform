import os
import math
import ezdxf
from typing import Dict, List, Any, Tuple

class CADParser:
    def __init__(self, file_path: str):
        self.file_path = file_path
        self.doc = ezdxf.readfile(file_path)
        self.model_space = self.doc.modelspace()
        
        # Layer regex mappings for fuzzy normalization
        self.wall_keywords = ["wall", "wl", "block", "brick", "masonry"]
        self.door_keywords = ["door", "dr", "swing", "panel"]
        self.window_keywords = ["window", "wd", "glaze", "glass", "sash"]
        self.label_keywords = ["label", "txt", "room", "name", "title"]

    def matches_layer(self, layer_name: str, keywords: List[str]) -> bool:
        layer_lower = layer_name.lower()
        return any(kw in layer_lower for kw in keywords)

    def explode_all_blocks(self):
        """
        Recursively explodes all INSERT (block references) in the model space
        to convert complex block symbols into base lines and arcs in the main model.
        """
        inserts = self.model_space.query("INSERT")
        while len(inserts) > 0:
            for insert in inserts:
                try:
                    # ezdxf explode transforms child entities into the parent space automatically
                    insert.explode()
                except Exception as e:
                    print(f"Failed to explode block insert: {e}")
            inserts = self.model_space.query("INSERT")

    def parse(self) -> Dict[str, Any]:
        # Explode all symbols into base geometry
        self.explode_all_blocks()

        raw_walls = []
        raw_doors = []
        raw_windows = []
        raw_labels = []

        # Iterate over all basic geometry entities
        for entity in self.model_space:
            layer = entity.dxf.layer
            
            # 1. Check entity type
            etype = entity.dxftype()
            
            if etype == "LINE":
                start = entity.dxf.start
                end = entity.dxf.end
                line_data = {
                    "startX": round(start.x, 3),
                    "startZ": round(start.y, 3), # Map CAD Y to Three.js Z (depth)
                    "endX": round(end.x, 3),
                    "endZ": round(end.y, 3)
                }
                
                if self.matches_layer(layer, self.wall_keywords):
                    raw_walls.append(line_data)
                elif self.matches_layer(layer, self.door_keywords):
                    w = math.hypot(end.x - start.x, end.y - start.y)
                    raw_doors.append({
                        "type": "door",
                        "x": round((start.x + end.x) / 2, 3),
                        "z": round((start.y + end.y) / 2, 3),
                        "width": round(w, 3)
                    })
                elif self.matches_layer(layer, self.window_keywords):
                    w = math.hypot(end.x - start.x, end.y - start.y)
                    raw_windows.append({
                        "type": "window",
                        "x": round((start.x + end.x) / 2, 3),
                        "z": round((start.y + end.y) / 2, 3),
                        "width": round(w, 3)
                    })

            elif etype in ("LWPOLYLINE", "POLYLINE"):
                # Use ezdxf's flattening tool to handle bulges and arcs automatically
                try:
                    vertices = list(entity.flattening(distance=0.1))
                    if len(vertices) > 1:
                        # Construct line segments between successive coordinates
                        for idx in range(len(vertices) - 1):
                            v1 = vertices[idx]
                            v2 = vertices[idx+1]
                            line_data = {
                                "startX": round(v1.x, 3),
                                "startZ": round(v1.y, 3),
                                "endX": round(v2.x, 3),
                                "endZ": round(v2.y, 3)
                            }
                            if self.matches_layer(layer, self.wall_keywords):
                                raw_walls.append(line_data)
                            
                        # If polyline is closed, connect end back to start
                        if entity.is_closed:
                            v1 = vertices[-1]
                            v2 = vertices[0]
                            line_data = {
                                "startX": round(v1.x, 3),
                                "startZ": round(v1.y, 3),
                                "endX": round(v2.x, 3),
                                "endZ": round(v2.y, 3)
                            }
                            if self.matches_layer(layer, self.wall_keywords):
                                raw_walls.append(line_data)
                except Exception as e:
                    print(f"Polyline extraction failure: {e}")

            elif etype == "ARC":
                # Resample arcs into segment loops
                try:
                    center = entity.dxf.center
                    radius = entity.dxf.radius
                    start_angle = entity.dxf.start_angle
                    end_angle = entity.dxf.end_angle
                    
                    start_rad = math.radians(start_angle)
                    end_rad = math.radians(end_angle)
                    diff = end_rad - start_rad
                    if diff < 0:
                        diff += math.pi * 2
                        
                    steps = max(6, int(math.ceil(diff / math.radians(15))))
                    arc_vertices = []
                    for step in range(steps + 1):
                        theta = start_rad + (diff * step) / steps
                        arc_vertices.append((
                            center.x + radius * math.cos(theta),
                            center.y + radius * math.sin(theta)
                        ))
                        
                    if self.matches_layer(layer, self.wall_keywords) and len(arc_vertices) > 1:
                        for idx in range(len(arc_vertices) - 1):
                            raw_walls.append({
                                "startX": round(arc_vertices[idx][0], 3),
                                "startZ": round(arc_vertices[idx][1], 3),
                                "endX": round(arc_vertices[idx+1][0], 3),
                                "endZ": round(arc_vertices[idx+1][1], 3)
                            })
                    elif self.matches_layer(layer, self.door_keywords):
                        raw_doors.append({
                            "type": "door",
                            "x": round(center.x, 3),
                            "z": round(center.y, 3),
                            "width": round(radius, 3)
                        })
                    elif self.matches_layer(layer, self.window_keywords):
                        raw_windows.append({
                            "type": "window",
                            "x": round(center.x, 3),
                            "z": round(center.y, 3),
                            "width": round(radius, 3)
                        })
                except Exception as e:
                    print(f"Arc re-sampling failure: {e}")

            elif etype == "SPLINE":
                # Splines are flattened into short lines
                try:
                    vertices = list(entity.flattening(distance=0.1))
                    if self.matches_layer(layer, self.wall_keywords) and len(vertices) > 1:
                        for idx in range(len(vertices) - 1):
                            raw_walls.append({
                                "startX": round(vertices[idx].x, 3),
                                "startZ": round(vertices[idx].y, 3),
                                "endX": round(vertices[idx+1].x, 3),
                                "endZ": round(vertices[idx+1].y, 3)
                            })
                except Exception as e:
                    print(f"Spline flattening failure: {e}")

            elif etype in ("TEXT", "MTEXT"):
                text = entity.dxf.text if etype == "TEXT" else entity.text
                insert = entity.dxf.insert
                
                # Filter formatting noise out of MTEXT blocks
                if etype == "MTEXT":
                    # Simple cleanup of formatting overrides like {\fArial|b0|i0;ROOM_NAME}
                    import re
                    text = re.sub(r"\\P", " ", text) # Replace newlines
                    text = re.sub(r"\\{[^}]*}", "", text) # Remove brackets overrides
                    text = re.sub(r"\\[a-zA-Z0-9]+;?", "", text) # Remove generic formatting codes
                    text = text.replace("{", "").replace("}", "")
                    text = text.strip()

                if text and self.matches_layer(layer, self.label_keywords):
                    raw_labels.append({
                        "text": text,
                        "x": round(insert.x, 3),
                        "z": round(insert.y, 3)
                    })

        return {
            "walls": raw_walls,
            "doors": raw_doors,
            "windows": raw_windows,
            "labels": raw_labels
        }
