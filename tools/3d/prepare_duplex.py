"""IfcOpenShell tessellation + trimesh GLB export. No custom IFC geometry engine.
Run: .cache/bim-venv/Scripts/python tools/3d/prepare_duplex.py .cache/Duplex_A_20110907.ifc
"""
import hashlib, json, math, sys
from pathlib import Path
import ifcopenshell, ifcopenshell.geom, ifcopenshell.util.element
import numpy as np
import trimesh

source = Path(sys.argv[1])
assert source.read_bytes().startswith(b'ISO-10303-21;'), 'Expected IFC, not an LFS pointer'
model = ifcopenshell.open(str(source))
out = Path('apps/web/public/models/duplex'); out.mkdir(parents=True, exist_ok=True)
settings = ifcopenshell.geom.settings()
settings.set(settings.USE_WORLD_COORDS, True)
settings.set(settings.WELD_VERTICES, True)
scene = trimesh.Scene()
storeys = sorted(model.by_type('IfcBuildingStorey'), key=lambda s:s.Elevation)
floors = {s.GlobalId: dict(id=s.GlobalId, name={'Level 1':'Ground floor','Level 2':'First floor'}.get(s.Name,s.Name), elevation=s.Elevation, nodeNames=[], flats=[]) for s in storeys}
elements, spaces, failures = [], [], []

def storey_of(el):
    parent = ifcopenshell.util.element.get_container(el)
    if parent and parent.is_a('IfcBuildingStorey'): return parent
    parent = ifcopenshell.util.element.get_aggregate(el)
    seen=set()
    while parent and parent.id() not in seen:
        if parent.is_a('IfcBuildingStorey'): return parent
        seen.add(parent.id()); parent=ifcopenshell.util.element.get_aggregate(parent)
    return None

def vertices(shape):
    v=np.array(shape.geometry.verts).reshape((-1,3))
    return np.column_stack((v[:,0],v[:,2],-v[:,1])) # IFC Z-up -> glTF Y-up, metres

for el in model.by_type('IfcProduct'):
    if not el.Representation or el.is_a('IfcOpeningElement') or el.is_a('IfcSite'): continue
    try:
        sh=ifcopenshell.geom.create_shape(settings,el)
        v=vertices(sh); faces=np.array(sh.geometry.faces).reshape((-1,3))
        if len(faces)==0: continue
        storey=storey_of(el)
        floor_id=storey.GlobalId if storey else None
        bounds=np.array([v.min(axis=0),v.max(axis=0)]).round(5).tolist()
        if el.is_a('IfcSpace'):
            spaces.append(dict(id=el.GlobalId,code=el.Name,name=el.LongName or el.Name,floorId=floor_id,bounds=bounds))
            continue
        names=[]
        # Partition only by original IFC surface style; keep product GUID in each node.
        mat_ids=np.array(sh.geometry.material_ids)
        for mid in np.unique(mat_ids):
            name=f'{el.GlobalId}_{mid}'
            style=sh.geometry.materials[int(mid)] if mid>=0 else None
            rgb=[style.diffuse.r(),style.diffuse.g(),style.diffuse.b()] if style else [.8,.8,.8]
            transparency=style.transparency if style else 0
            alpha=1-(transparency if math.isfinite(transparency) else 0)
            # Explicit presentation finish for source defaults, without invented textures.
            # Apply glazing only to glass styles; preserve opaque frame/jamb styles.
            if el.is_a('IfcWindow') and alpha<1: alpha=max(.22,alpha)
            if 'Live Roof' in (el.Name or ''): rgb=[.12,.22,.08]
            mat=trimesh.visual.material.PBRMaterial(name=style.name if style else el.is_a(),baseColorFactor=[*rgb,alpha],roughnessFactor=.65,metallicFactor=0,alphaMode='BLEND' if alpha<1 else 'OPAQUE',doubleSided=True)
            mesh=trimesh.Trimesh(vertices=v,faces=faces[mat_ids==mid],process=False)
            mesh.remove_unreferenced_vertices()
            # BIM solids need face normals at sharp corners, not smoothed cube normals.
            mesh.unmerge_vertices()
            mesh.vertex_normals=np.repeat(mesh.face_normals,3,axis=0)
            mesh.visual=trimesh.visual.TextureVisuals(material=mat)
            mesh.metadata={'ifcGuid':el.GlobalId,'ifcType':el.is_a(),'ifcName':el.Name,'floorId':floor_id}
            scene.add_geometry(mesh,node_name=name,geom_name=name)
            names.append(name)
        if floor_id: floors[floor_id]['nodeNames'].extend(names)
        elements.append(dict(id=el.GlobalId,name=el.Name,type=el.is_a(),floorId=floor_id,nodeNames=names,bounds=bounds))
    except Exception as exc: failures.append(dict(id=el.GlobalId,type=el.is_a(),error=str(exc)))

# Unit A/B is an explicit mapping from original Axxx/Bxxx IfcSpace names.
for room in spaces:
    if not room['floorId'] or room['code'][0] not in ('A','B') or room['name'].lower() in ('stair','room'): continue
    f=floors[room['floorId']]; unit='unit-'+room['code'][0].lower()
    flat=next((u for u in f['flats'] if u['id']==unit),None)
    if flat is None:
        flat=dict(id=unit,name='Unit '+room['code'][0],nodeNames=[],rooms=[]); f['flats'].append(flat)
    low,high=np.array(room['bounds']); center=(low+high)/2
    flat['rooms'].append(dict(id=room['id'],name=f"{room['code']} · {room['name']}",nodeNames=[],bounds=room['bounds'],cameraSpawn=[round(center[0],4),round(low[1]+1.65,4),round(center[2],4)]))

manifest=dict(version=1,modelId='bsi-duplex-v1',modelUrl='/models/duplex/duplex.glb',units='meters',upAxis='Y',
    name='Duplex Apartment',sourceSha256=hashlib.sha256(source.read_bytes()).hexdigest(),
    attribution='BSI (2020) "Duplex Apartment Test Files," buildingSMART International. CC BY 4.0.',
    floors=list(floors.values()),elements=elements,
    mappingNotes=['IFC world coordinates in metres: [X,Y,Z] -> [X,Z,-Y]. No recentering or scale change.',
      'Floors use actual IfcBuildingStorey containment and aggregation. Unit A/B explicitly mapped from original space codes.',
      'Rooms are IfcSpace bounds, not visible proxy boxes. Unit selection filters the room list; shared structural geometry remains.',
      'Roof and foundation retain their original storey. Stairs have no automatic floor transition in this MVP.',
      'IfcSpace and IfcOpeningElement volumes excluded from visible export; IfcOpenShell cuts real opening voids.',
      'Original diffuse styles retained except live-roof green muted for presentation. Transparent glazing alpha clamped to at least 0.22; opaque frames retained.',
      'Sharp face normals exported for architectural solids. No artificial normal maps or added texture claims.'])
glb=scene.export(file_type='glb')
(out/'duplex.glb').write_bytes(glb)
(out/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
# Independent GLB parsing through trimesh validates the exported binary and bounds.
check=trimesh.load(out/'duplex.glb',force='scene')
report=dict(sourceBytes=source.stat().st_size,glbBytes=len(glb),meshes=len(check.geometry),triangles=sum(len(g.faces) for g in check.geometry.values()),bounds=check.bounds.tolist(),spaces=spaces,failures=failures)
Path('evidence/3d/conversion.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k not in ('spaces',)},indent=2))
