const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
 const browser = await chromium.launch({headless:true, args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page = await browser.newPage({viewport:{width:1280,height:900}});
 page.setDefaultTimeout(120000);
 const errors=[];
 page.on('pageerror', e=>errors.push(e.message));
 // Read-only API fixtures: no database or authenticated writes.
 await page.route(/(?:localhost:3001|dreams-liverpool-messaging-purchases\.trycloudflare\.com)\//, route => {
   const url=route.request().url();
   const data=url.includes('theme-by-slug') ? {id:'offline-baseline',name:'Aether'} : url.includes('digital-twin/models') && !/hotspots|tours/.test(url) ? [{id:'baseline',projectId:'offline',name:'Procedural baseline',modelType:'exterior',modelUrl:''}] : [];
   route.fulfill({json:data});
 });
 await page.addInitScript(()=>{
   window.__baseline={contexts:0,draws:0,triangles:0,frames:[]};
   const original=HTMLCanvasElement.prototype.getContext;
   HTMLCanvasElement.prototype.getContext=function(...args){
     const ctx=original.apply(this,args);
     if(ctx && /webgl/.test(args[0]) && !ctx.__counted){
       ctx.__counted=true; window.__baseline.contexts++;
       window.__baseline.gpu=ctx.getParameter(ctx.RENDERER);
       for(const name of ['drawElements','drawArrays']){
         const old=ctx[name].bind(ctx); ctx[name]=(...a)=>{window.__baseline.draws++;window.__baseline.triangles+=(name==='drawElements'?a[1]:a[2])/3;return old(...a);};
       }
     }
     return ctx;
   };
 });
 await page.goto(process.env.TARGET || 'http://localhost:3000/explorer');
 await page.waitForSelector('canvas',{timeout:120000});
 await page.waitForTimeout(5000);
 async function sample(name){
   const r=await page.evaluate(()=>new Promise(resolve=>{
     const m=window.__baseline, frames=[];m.draws=0;m.triangles=0;let last=performance.now(),start=last;
     function tick(now){frames.push(now-last);last=now;if(now-start<5000)requestAnimationFrame(tick);else {const s=[...frames].sort((a,b)=>a-b);resolve({contexts:m.contexts,gpu:m.gpu,fps:frames.length*1000/(now-start),p50Ms:s[Math.floor(s.length*.5)],p95Ms:s[Math.floor(s.length*.95)],drawsPerFrame:m.draws/frames.length,trianglesPerFrame:m.triangles/frames.length,canvasCount:document.querySelectorAll('canvas').length});}}requestAnimationFrame(tick);
   }));return {name,...r};
 }
 const results=[await sample('exterior')];
 fs.writeFileSync(`evidence/3d/${process.env.REPORT || 'baseline'}-partial.json`,JSON.stringify(results,null,2));
 await page.getByRole('button',{name:/Level 02/}).click({force:true});
 await page.waitForTimeout(1500);
 results.push(await sample('floor-change'));
 await page.getByRole('button',{name:/GO INSIDE FLAT TOUR/}).click({force:true});
 await page.waitForTimeout(1500);
 results.push(await sample('walkthrough'));
 await page.screenshot({path:`evidence/3d/${process.env.REPORT || 'baseline'}.png`});
 fs.writeFileSync(`evidence/3d/${process.env.REPORT || 'baseline'}.json`,JSON.stringify({browser:browser.version(),viewport:'1280x900',renderer:'headless SwiftShader',results,errors},null,2));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
