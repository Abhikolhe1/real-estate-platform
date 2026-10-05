const {chromium}=require('playwright'), fs=require('fs');
const origin=process.argv[2]||'http://localhost:3200';
const label=process.argv[3]||'before';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-angle=d3d11']}); const results=[];
 try { for(let trial=0;trial<3;trial++) {
 const context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();
 const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
 await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:40,downloadThroughput:512000,uploadThroughput:128000});
 await page.addInitScript(()=>{window.__longTasks=[];new PerformanceObserver(list=>{window.__longTasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration})));}).observe({type:'longtask',buffered:true});});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/explorer',{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>document.querySelector('[data-testid=property-canvas]')?.getViewerSnapshot?.().state.manifest?.modelId==='bsi-duplex-v1',null,{timeout:120000});
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const metrics=await page.evaluate(()=>{const n=performance.getEntriesByType('navigation')[0],p=performance.getEntriesByType('paint'),r=performance.getEntriesByType('resource'),s=document.querySelector('[data-testid=property-canvas]').getViewerSnapshot();return{readyMs:performance.now(),ttfbMs:n.responseStart,fcpMs:p.find(x=>x.name==='first-contentful-paint')?.startTime,modelLoadMs:s.state.loadMs,scriptBytes:r.filter(x=>x.initiatorType==='script').reduce((v,x)=>v+x.decodedBodySize,0),scriptCount:r.filter(x=>x.initiatorType==='script').length,themeRequests:r.filter(x=>x.name.includes('theme-by-slug')).length,longTaskMs:window.__longTasks.reduce((v,x)=>v+Math.max(0,x.duration-50),0),meshCount:s.meshCount,error:s.state.error};});
 results.push({trial,...metrics,errors});console.log(JSON.stringify(results.at(-1)));fs.writeFileSync('evidence/performance/'+label+'.json',JSON.stringify({origin,network:'4 Mbps download, 40 ms latency, cache disabled, D3D11, 1440x1000',results},null,2));
 if(trial===0)await page.screenshot({path:'evidence/performance/'+label+'.png'});
 await context.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
