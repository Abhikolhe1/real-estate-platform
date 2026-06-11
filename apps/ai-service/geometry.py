import math
import networkx as nx
from shapely.geometry import Polygon, Point
from typing import List, Dict, Any, Tuple

class GeometryEngine:
    def __init__(self, snap_tolerance: float = 0.25):
        self.snap_tolerance = snap_tolerance

    def _snap_vertices(self, walls: List[Dict[str, float]]) -> Tuple[List[Tuple[float, float]], List[Tuple[int, int]]]:
        """
        Groups wall endpoints within snap_tolerance and merges them into unique vertex coordinates.
        Returns unique vertices list and corresponding vertex index pairs representing walls.
        """
        raw_points = []
        for w in walls:
            raw_points.append((w["startX"], w["startZ"]))
            raw_points.append((w["endX"], w["endZ"]))
            
        unique_vertices: List[Tuple[float, float]] = []
        point_to_vertex_idx = {}
        
        for pt in raw_points:
            # Check if this point snaps to an existing unique vertex
            snapped = False
            for idx, uv in enumerate(unique_vertices):
                if math.hypot(pt[0] - uv[0], pt[1] - uv[1]) < self.snap_tolerance:
                    point_to_vertex_idx[pt] = idx
                    snapped = True
                    break
            if not snapped:
                idx = len(unique_vertices)
                unique_vertices.append(pt)
                point_to_vertex_idx[pt] = idx
                
        # Build snapped edges
        edges = []
        for w in walls:
            pt1 = (w["startX"], w["startZ"])
            pt2 = (w["endX"], w["endZ"])
            idx1 = point_to_vertex_idx[pt1]
            idx2 = point_to_vertex_idx[pt2]
            if idx1 != idx2:
                edges.append((idx1, idx2))
                
        return unique_vertices, edges

    def detect_rooms(
        self, 
        walls: List[Dict[str, float]], 
        labels: List[Dict[str, Any]], 
        doors: List[Dict[str, Any]], 
        windows: List[Dict[str, Any]]
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Constructs a Planar Graph from walls, executes Minimum Cycle Basis to extract room boundaries,
        cleans them using Shapely, maps room labels, and snaps apertures to room boundary walls.
        """
        if not walls:
            return [], [], []

        vertices, edges = self._snap_vertices(walls)
        
        # 1. Build Planar Graph
        G = nx.Graph()
        for i, vert in enumerate(vertices):
            G.add_node(i, pos=vert)
        G.add_edges_from(edges)

        # 2. Extract Cycle Basis representing room footprints
        raw_cycles = nx.minimum_cycle_basis(G)
        room_polygons: List[Tuple[Polygon, List[Tuple[float, float]], List[int]]] = []

        for cycle in raw_cycles:
            if len(cycle) < 3:
                continue
            
            # Map node IDs back to coordinates
            coords = [vertices[node_id] for node_id in cycle]
            # Close the polygon loop
            coords.append(coords[0])
            
            try:
                poly = Polygon(coords)
                # Keep only valid, non-collapsed polygons (area > 1.0 sq meters)
                if poly.is_valid and poly.area > 1.0:
                    room_polygons.append((poly, coords[:-1], cycle))
            except Exception as e:
                print(f"Polygon formation skipped due to error: {e}")

        # 3. Filter out the outer void boundary enclosing the whole layout
        filtered_rooms: List[Tuple[Polygon, List[Tuple[float, float]]]] = []
        kept_cycles: List[List[int]] = []
        
        if room_polygons:
            all_coords = []
            for _, coords, _ in room_polygons:
                all_coords.extend(coords)
            all_poly = Polygon(all_coords)
            total_bounding_area = all_poly.minimum_rotated_rectangle.area
            
            for poly, coords, cycle_node_ids in room_polygons:
                contain_count = 0
                for other_poly, _, _ in room_polygons:
                    if other_poly != poly and poly.contains(other_poly):
                        contain_count += 1
                
                is_outer = False
                if len(room_polygons) > 1:
                    if contain_count == len(room_polygons) - 1:
                        is_outer = True
                    elif contain_count >= 2 and poly.area > 0.4 * total_bounding_area:
                        is_outer = True
                        
                if not is_outer:
                    filtered_rooms.append((poly, coords))
                    kept_cycles.append(cycle_node_ids)

        # 4. Generate snapped walls from planar graph edges
        snapped_walls = []
        for idx, (u, v) in enumerate(edges):
            u_pos = vertices[u]
            v_pos = vertices[v]
            snapped_walls.append({
                "id": f"w-{idx + 1}",
                "startX": round(u_pos[0], 2),
                "startZ": round(u_pos[1], 2),
                "endX": round(v_pos[0], 2),
                "endZ": round(v_pos[1], 2),
                "thickness": 0.15,
                "height": 3.0
            })

        # 5. Bind Labels to Room Polygons
        detected_rooms = []
        room_idx = 1
        
        for poly, coords in filtered_rooms:
            min_x, min_z, max_x, max_z = poly.bounds
            width = max_x - min_x
            depth = max_z - min_z
            
            # Calculate centroid coordinates
            centroid = poly.centroid
            cx, cz = centroid.x, centroid.y
            
            # Find nearest label lying inside this room boundary
            name = f"Room {room_idx}"
            best_dist = float("inf")
            for lbl in labels:
                lbl_pt = Point(lbl["x"], lbl["z"])
                if poly.contains(lbl_pt):
                    d = math.hypot(lbl["x"] - cx, lbl["z"] - cz)
                    if d < best_dist:
                        name = lbl["text"]
                        best_dist = d
            
            name_lower = name.lower()
            if "lobby" in name_lower or "lounge" in name_lower:
                color = "#374151"
            elif "living" in name_lower or "hall" in name_lower:
                color = "#f5efe6"
            elif "bed" in name_lower:
                color = "#ece8f2"
            elif "bath" in name_lower or "toilet" in name_lower or "wc" in name_lower:
                color = "#ececec"
            elif "kit" in name_lower:
                color = "#f4ece1"
            else:
                color = "#fbfbfa"

            detected_rooms.append({
                "id": f"room-{room_idx}",
                "name": name,
                "x": round(min_x, 2),
                "z": round(min_z, 2),
                "width": round(width, 2),
                "depth": round(depth, 2),
                "color": color,
                "node": {
                    "x": round(cx, 2),
                    "z": round(cz, 2)
                }
            })
            room_idx += 1

        # 6. Snapping Apertures (Doors/Windows) to room boundary walls
        room_boundary_edges = set()
        for cycle in kept_cycles:
            for idx in range(len(cycle)):
                u = cycle[idx]
                v = cycle[(idx + 1) % len(cycle)]
                room_boundary_edges.add((min(u, v), max(u, v)))
                
        edge_to_wall_id = {}
        for idx, (u, v) in enumerate(edges):
            edge_to_wall_id[(min(u, v), max(u, v))] = f"w-{idx + 1}"
            
        boundary_wall_ids = {edge_to_wall_id[edge] for edge in room_boundary_edges if edge in edge_to_wall_id}
        
        target_walls = [w for w in snapped_walls if w["id"] in boundary_wall_ids]
        if not target_walls:
            target_walls = snapped_walls
            
        snapped_apertures = []
        ap_idx = 1
        
        raw_apertures = []
        for d in doors:
            raw_apertures.append((d, "door"))
        for w in windows:
            raw_apertures.append((w, "window"))
            
        for ap, ap_type in raw_apertures:
            ap_x = ap["x"]
            ap_z = ap["z"]
            ap_w = ap.get("width", 0.9 if ap_type == "door" else 1.2)
            
            best_wall = None
            min_dist = 1.0 # 1 meter max proximity snapping threshold
            best_offset = 0.0
            
            for w in target_walls:
                sx, sz = w["startX"], w["startZ"]
                ex, ez = w["endX"], w["endZ"]
                
                dx = ex - sx
                dz = ez - sz
                len_sq = dx * dx + dz * dz
                if len_sq == 0:
                    continue
                    
                t = ((ap_x - sx) * dx + (ap_z - sz) * dz) / len_sq
                t = max(0.0, min(1.0, t))
                
                proj_x = sx + t * dx
                proj_z = sz + t * dz
                dist = math.hypot(ap_x - proj_x, ap_z - proj_z)
                
                if dist < min_dist:
                    min_dist = dist
                    best_wall = w
                    best_offset = t * math.sqrt(len_sq)
                    
            if best_wall:
                ap_data = {
                    "id": f"ap-{ap_type}-{ap_idx}",
                    "wallId": best_wall["id"],
                    "type": ap_type,
                    "startOffset": round(best_offset, 2),
                    "width": round(ap_w if ap_w > 0.4 else (0.9 if ap_type == "door" else 1.2), 2),
                    "height": 2.1 if ap_type == "door" else 1.2,
                    "elevation": 0.0 if ap_type == "door" else 0.9
                }
                if ap_type == "door":
                    ap_data["swing"] = -1
                snapped_apertures.append(ap_data)
                ap_idx += 1

        return detected_rooms, snapped_walls, snapped_apertures

