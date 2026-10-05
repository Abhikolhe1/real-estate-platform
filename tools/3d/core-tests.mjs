import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import ts from 'typescript';import * as THREE from 'three';import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
const output='.cache/3d-tests';fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'package.json'),'{"type":"module"}');
for(const file of ['model','Navigation']){const src=fs.readFileSync(`apps/web/src/components/property-viewer/${file}.ts`,'utf8');let js=ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ES2020}}).outputText;js=js.replace(/from ["']\.\/(\w+)["']/g,"from './$1.js'");fs.writeFileSync(path.join(output,`${file}.js`),js);}
const {validateManifest,SceneIndex}=await import('../../.cache/3d-tests/model.js');const {Navigation}=await import('../../.cache/3d-tests/Navigation.js');
const raw=fs.readFileSync('apps/web/public/models/duplex/duplex.glb');const {scene}=await new GLTFLoader().parseAsync(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.length),'');
const manifest=JSON.parse(fs.readFileSync('apps/web/public/models/duplex/manifest.json','utf8'));const results=[];
function test(name,fn){try{fn();results.push({name,result:'PASS'});}catch(e){results.push({name,result:'FAIL',reason:String(e)});}}
test('Real GLB manifest references actual nodes',()=>validateManifest(manifest,scene));
test('Missing manifest node rejected',()=>{const m=structuredClone(manifest);m.floors[0].nodeNames.push('fictional-node');assert.throws(()=>validateManifest(m,scene));});
test('Invalid manifest spawn rejected',()=>{const m=structuredClone(manifest);m.floors[1].flats[0].rooms[0].cameraSpawn=[NaN,0,0];assert.throws(()=>validateManifest(m,scene));});
const index=new SceneIndex(scene,manifest),nav=new Navigation(index);const floor=manifest.floors.find(f=>f.name==='Ground floor');
test('Semantic collision index excludes decorative furniture',()=>{assert(index.walls.length>30);assert(index.floors.length>10);assert(index.walls.every(m=>m.userData.semanticType!=='IfcFurnishingElement'));});
index.doors.forEach(m=>m.visible=false);
const living=floor.flats[0].rooms.find(r=>r.name.includes('Living'));const spawn=new THREE.Vector3().fromArray(living.cameraSpawn);
test('Living room supports human eye height',()=>{assert(nav.fits(spawn,floor.elevation));assert(Math.abs(nav.ground(spawn.x,spawn.z,0)-.019)<.001);});
test('Solid IFC wall blocks repeated movement',()=>{const p=spawn.clone();for(let i=0;i<300;i++)nav.move(p,new THREE.Vector3(0,0,-.05),0);const stopped=p.clone();for(let i=0;i<30;i++)nav.move(p,new THREE.Vector3(0,0,-.05),0);assert(p.distanceTo(stopped)<.001);assert(p.z<spawn.z-.1);assert(nav.fits(p,0));});
test('No unsupported ground outside building',()=>assert.equal(nav.ground(-30,-30,0),undefined));
test('Connected IFC rooms accessible through real openings',()=>{
 const rooms=floor.flats[0].rooms;const foyer=rooms.find(r=>r.name.includes('Foyer'));const kitchen=rooms.find(r=>r.name.includes('Kitchen'));
 // Grid search over actual floor support and body-wall clearance, not room-box adjacency.
 const step=.25,minX=.5,maxX=4.2,minZ=7.8,maxZ=17.4;const nodes=new Map();
 for(let x=minX;x<=maxX;x+=step)for(let z=minZ;z<=maxZ;z+=step){const p=new THREE.Vector3(x,1.65,z);if(nav.fits(p,0))nodes.set(`${Math.round((x-minX)/step)},${Math.round((z-minZ)/step)}`,p);}
 const nearest=r=>Array.from(nodes.entries()).sort((a,b)=>a[1].distanceTo(new THREE.Vector3().fromArray(r.cameraSpawn))-b[1].distanceTo(new THREE.Vector3().fromArray(r.cameraSpawn)))[0];
 const start=nearest(living)[0],targets=[nearest(foyer)[0],nearest(kitchen)[0]],seen=new Set([start]),queue=[start];
 while(queue.length){const key=queue.shift(),[x,z]=key.split(',').map(Number);for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const next=`${x+dx},${z+dz}`;if(nodes.has(next)&&!seen.has(next)){const p=nodes.get(key).clone();nav.move(p,nodes.get(next).clone().sub(p),0);if(Math.hypot(p.x-nodes.get(next).x,p.z-nodes.get(next).z)<.02){seen.add(next);queue.push(next);}}}}
 assert(targets.every(t=>seen.has(t)),`Reachable ${seen.size}/${nodes.size}; targets ${targets.map(t=>seen.has(t))}`);
});
fs.writeFileSync('evidence/3d/core-tests.json',JSON.stringify(results,null,2));console.log(results);if(results.some(r=>r.result==='FAIL'))process.exitCode=1;
