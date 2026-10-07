"""AUDIT ONLY: read existing assets; diagnostic fixtures stay in this directory.
No product output, database, OCR model downloads, or external API calls.
"""
import sys, json, hashlib, struct, collections, time, importlib.util, platform
from pathlib import Path
root = Path(__file__).resolve().parents[2]
sys.dont_write_bytecode = True
sys.path.insert(0, str(root / 'apps/ai-service'))
import ezdxf, networkx, shapely
from parser import CADParser
from geometry import GeometryEngine
out = Path(__file__).parent
report = {'environment': {'python': sys.version, 'platform': platform.platform(), 'ezdxf': ezdxf.__version__, 'networkx': networkx.__version__, 'shapely': shapely.__version__}, 'fixtures': [], 'probes': []}
for module in ['cv2', 'pypdfium2', 'paddleocr', 'paddle', 'sklearn', 'google.generativeai', 'pypdf']:
    try: report['environment'][module] = bool(importlib.util.find_spec(module))
    except ModuleNotFoundError: report['environment'][module] = False
for p in [root/'test_tower_10_floors.dxf', root/'apps/ai-service/test_tower_10_floors.dxf', root/'docs/cad/building_layout.dxf', root/'docs/cad/test_building_blueprint.dxf', root/'apps/builder/public/test_building_blueprint.dxf']:
    doc = ezdxf.readfile(p)
    start = time.perf_counter()
    raw = CADParser(str(p)).parse()
    rooms, walls, aps = GeometryEngine().detect_rooms(raw['walls'], raw['labels'], raw['doors'], raw['windows'])
    report['fixtures'].append({'path': str(p.relative_to(root)), 'bytes': p.stat().st_size, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest(), 'insunits': doc.header.get('$INSUNITS'), 'entities':dict(collections.Counter(e.dxftype() for e in doc.modelspace())), 'layers':dict(collections.Counter(e.dxf.layer for e in doc.modelspace())), 'raw':{k:len(v) for k,v in raw.items()}, 'rooms': rooms, 'wallCount':len(walls), 'apertures':aps, 'elapsedMs':round((time.perf_counter()-start)*1000,2)})
def probe(name, make):
    doc=ezdxf.new('R2010'); doc.layers.new('WALLS'); make(doc)
    p=out/(name+'.dxf');doc.saveas(p)
    raw=CADParser(str(p)).parse()
    rooms,walls,aps=GeometryEngine().detect_rooms(raw['walls'],raw['labels'],raw['doors'],raw['windows'])
    report['probes'].append({'name':name,'raw':raw,'rooms':rooms,'walls':walls,'apertures':aps})
def square(doc, units=6):
    doc.header['$INSUNITS']=units
    for a,b in [((0,0),(4,0)),((4,0),(4,3)),((4,3),(0,3)),((0,3),(0,0))]: doc.modelspace().add_line(a,b,dxfattribs={'layer':'WALLS'})
probe('meters-square',lambda d:square(d,6))
probe('millimeters-square',lambda d:square(d,4))
probe('lwpolyline-square',lambda d:d.modelspace().add_lwpolyline([(0,0),(4,0),(4,3),(0,3)],close=True,dxfattribs={'layer':'WALLS'}))
probe('polyline-square',lambda d:d.modelspace().add_polyline2d([(0,0),(4,0),(4,3),(0,3)],close=True,dxfattribs={'layer':'WALLS'}))
def t_junction(doc):
    square(doc);doc.modelspace().add_line((2,0),(2,3),dxfattribs={'layer':'WALLS'})
probe('t-junction',t_junction)
def offset_door(doc):
    square(doc);doc.layers.new('DOORS');doc.modelspace().add_line((1,0),(2,0),dxfattribs={'layer':'DOORS'})
probe('door-midpoint-offset',offset_door)
def ignored(doc):
    doc.layers.new('DOORS');doc.modelspace().add_line((0,0),(4,0),dxfattribs={'layer':'WALLS'})
    doc.modelspace().add_circle((2,2),1,dxfattribs={'layer':'WALLS'})
probe('circle-ignored',ignored)
for p in list((root/'apps').rglob('*.glb')):
    if any(x in p.parts for x in ['node_modules','.next']):continue
    data=p.read_bytes();item={'path':str(p.relative_to(root)),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
    try:
        magic,version,total=struct.unpack_from('<4sII',data);length,kind=struct.unpack_from('<II',data,12)
        g=json.loads(data[20:20+length]);item.update({'magic':magic.decode(),'version':version,'declaredBytes':total,'meshes':len(g.get('meshes',[])),'nodes':len(g.get('nodes',[])),'materials':len(g.get('materials',[])),'images':len(g.get('images',[])),'extensionsUsed':g.get('extensionsUsed',[]),'extensionsRequired':g.get('extensionsRequired',[]),'nodeExtrasExample':next((n.get('extras') for n in g.get('nodes',[]) if n.get('extras')),None),'meshExtrasExample':next((n.get('extras') for n in g.get('meshes',[]) if n.get('extras')),None),'triangles':sum(g['accessors'][v['indices']]['count']//3 for m in g.get('meshes',[]) for v in m['primitives'] if v.get('mode',4)==4 and 'indices' in v)})
    except Exception as e:item['error']=str(e)
    report.setdefault('glbs',[]).append(item)
manifest=json.loads((root/'apps/web/public/models/duplex/manifest.json').read_text(encoding='utf-8'))
report['manifest']={'floors':[{'id':f['id'],'name':f['name'],'elevation':f['elevation'],'nodes':len(f['nodeNames']),'units':len(f['flats']),'rooms':sum(len(u['rooms']) for u in f['flats'])} for f in manifest['floors']],'elements':len(manifest['elements']),'elementTypes':dict(collections.Counter(e['type'] for e in manifest['elements'])),'elementKeys':sorted({k for e in manifest['elements'] for k in e})}
src=root/'.cache/Duplex_A_20110907.ifc'
if src.exists():report['ifcSource']={'bytes':src.stat().st_size,'sha256':hashlib.sha256(src.read_bytes()).hexdigest(),'headerValid':src.read_bytes().startswith(b'ISO-10303-21;')}
(out/'diagnostics.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps({'environment':report['environment'],'fixtures':[{'path':f['path'],'units':f['insunits'],'raw':f['raw'],'rooms':len(f['rooms']),'walls':f['wallCount'],'apertures':len(f['apertures']),'ms':f['elapsedMs']} for f in report['fixtures']],'probes':[{'name':p['name'],'rawWalls':len(p['raw']['walls']),'rooms':len(p['rooms']),'apertures':p['apertures']} for p in report['probes']],'manifest':report['manifest'],'glbs':report['glbs']},indent=2))
