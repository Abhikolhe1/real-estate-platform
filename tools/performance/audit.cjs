const { chromium }=require('playwright'),fs=require('fs');
(async()=>{const browser=await chromium.launch({headless:true,args:['--use-angle=d3d11']});const results=[];
const save=x=>{results.push(x);console.log(JSON.stringify(x));fs.writeFileSync('evidence/performance/audit-production.json',JSON.stringify(results,null,2));};
try{
for(const app of [{name:'web',port:3000,routes:['/','/about','/amenities','/contact','/gallery','/inventory','/location','/virtual-tour','/explorer']},{name:'admin',port:3002,email:'admin@platform.com',routes:['/','/?tab=builders','/?tab=billing','/?tab=settings']},{name:'builder',port:3003,email:'admin@aethelgard.com',routes:['/','/projects','/towers','/floors','/flats','/analytics','/amenities','/leads','/team','/media','/website','/sdk','/ai-generator','/walkthroughs']}]){
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();let failures=[],errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().startsWith('http://localhost:3001')&&r.status()>=400)failures.push({url:r.url(),status:r.status()});});
 if(app.email){await page.goto('http://localhost:'+app.port+'/login',{waitUntil:'networkidle',timeout:120000});await page.locator('input[type=email]').fill(app.email);await page.locator('input[type=password]').fill('password');await page.locator('button[type=submit]').click();await page.waitForURL('http://localhost:'+app.port+'/',{timeout:120000});}
 for(const route of app.routes){failures=[];errors=[];const start=Date.now();let status;
 try{const response=await page.goto('http://localhost:'+app.port+route,{waitUntil:'domcontentloaded',timeout:120000});status=response.status();await page.waitForLoadState('networkidle',{timeout:15000}).catch(()=>{});
 await page.locator('h1').first().waitFor({timeout:15000});
 if(app.email && new URL(page.url()).pathname==='/login') throw new Error('Session lost after navigation');
 const ui=await page.evaluate(()=>({title:document.querySelector('h1')?.textContent,overflow:document.documentElement.scrollWidth>innerWidth+2,bodyLength:document.body.innerText.length}));save({app:app.name,route,status,ms:Date.now()-start,...ui,errors,failures});}
 catch(e){save({app:app.name,route,status,error:e.message,errors,failures});}
 }
 await page.setViewportSize({width:390,height:844});await page.goto('http://localhost:'+app.port+'/',{waitUntil:'networkidle',timeout:120000});const mobile=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));await page.screenshot({path:'evidence/performance/'+app.name+'-mobile-production.png'});save({app:app.name,mobile});await context.close();
}
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
