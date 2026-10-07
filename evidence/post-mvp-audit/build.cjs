const fs=require('fs'),path=require('path'),{spawn}=require('child_process');
const root=process.cwd(),destination=path.join(root,'.cache','post-mvp-audit-build');fs.mkdirSync(destination,{recursive:true});
for(const file of ['src','package.json','tsconfig.json','tailwind.config.js','postcss.config.js','next-env.d.ts'])fs.cpSync(path.join(root,'apps/web',file),path.join(destination,file),{recursive:true});
// Isolated build avoids touching the running developer server's .next output.
fs.writeFileSync(path.join(destination,'next.config.js'),'module.exports={experimental:{cpus:1}};\n');
if(!fs.existsSync(path.join(destination,'public')))fs.symlinkSync(path.join(root,'apps/web/public'),path.join(destination,'public'),'junction');
const output=fs.createWriteStream('evidence/post-mvp-audit/build.log');
const child=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'build','--no-lint'],{cwd:destination,env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',NODE_OPTIONS:'--max-old-space-size=1536'},stdio:['ignore','pipe','pipe']});
for(const stream of [child.stdout,child.stderr])stream.on('data',data=>{output.write(data);process.stdout.write(data);});
child.on('exit',code=>{output.end();fs.writeFileSync('evidence/post-mvp-audit/build-result.json',JSON.stringify({code,source:'apps/web',staging:'.cache/post-mvp-audit-build',lint:'separate focused ESLint run',productionConfigChanged:false},null,2));process.exitCode=code||0;});
