const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const app = process.argv[2] || 'web';
const label = process.argv[3] || app;
if (!['web', 'admin', 'builder'].includes(app) || !/^[\w-]+$/.test(label)) throw new Error('Invalid build target');
const destination = path.join(root, '.cache', 'review-build', label);
fs.mkdirSync(destination, { recursive: true });
for (const file of ['src', 'package.json', 'tsconfig.json', 'tailwind.config.js', 'postcss.config.js', 'next-env.d.ts']) {
  fs.cpSync(path.join(root, 'apps', app, file), path.join(destination, file), { recursive: true });
}
fs.writeFileSync(path.join(destination, 'next.config.js'), 'module.exports={experimental:{cpus:1},poweredByHeader:false};\n');
if (!fs.existsSync(path.join(destination, 'public'))) fs.symlinkSync(path.join(root, 'apps', app, 'public'), path.join(destination, 'public'), 'junction');
const log = fs.createWriteStream(path.join(destination, 'build.log'));
const child = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'build', '--no-lint'], {
  cwd: destination,
  env: { ...process.env, NEXT_PUBLIC_API_URL: 'http://localhost:3001', NEXT_TELEMETRY_DISABLED: '1', NODE_OPTIONS: '--max-old-space-size=2048' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
for (const stream of [child.stdout, child.stderr]) stream.on('data', data => { log.write(data); process.stdout.write(data); });
child.on('exit', code => { log.end(); process.exitCode = code || 0; });
