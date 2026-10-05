"""Exercise the existing parser + geometry engine without DB/API or OCR side effects."""
import sys,json,hashlib
from pathlib import Path
sys.path.insert(0,str(Path('apps/ai-service').resolve()))
from parser import CADParser
from geometry import GeometryEngine
results=[]
for path in [Path('test_tower_10_floors.dxf'),Path('apps/ai-service/test_tower_10_floors.dxf')]:
    parsed=CADParser(str(path)).parse()
    rooms,walls,apertures=GeometryEngine(.25).detect_rooms(parsed['walls'],parsed['labels'],parsed['doors'],parsed['windows'])
    result=dict(path=str(path),sha256=hashlib.sha256(path.read_bytes()).hexdigest(),rooms=len(rooms),walls=len(walls),apertures=len(apertures),labels=len(parsed['labels']))
    assert rooms and walls, result
    results.append(result)
    if path.parent==Path('.'):
        Path('apps/web/public/models/dxf-fixture.json').write_text(json.dumps(dict(rooms=rooms,walls=walls,apertures=apertures,furniture=[])),encoding='utf-8')
Path('evidence/3d/dxf.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
print(json.dumps(results,indent=2))
