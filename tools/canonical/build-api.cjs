const fs = require("fs"),
  path = require("path"),
  { spawn } = require("child_process");
const root = process.cwd(),
  dir = path.join(root, ".cache/canonical-api-build");
fs.mkdirSync(dir, { recursive: true });
const globRoot = root.replaceAll("\\", "/");
const config = {
  extends: path.join(root, "apps/api/tsconfig.json"),
  compilerOptions: {
    rootDir: path.join(root, "apps/api/src"),
    outDir: path.join(dir, "dist"),
    incremental: false,
  },
  include: [`${globRoot}/apps/api/src/**/*.ts`],
  exclude: [`${globRoot}/node_modules`, "**/*.spec.ts"],
};
const configPath = path.join(dir, "tsconfig.json");
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
const parsed = require("typescript").getParsedCommandLineOfConfigFile(
  configPath,
  {},
  require("typescript").sys,
);
if (!parsed.fileNames.length || parsed.errors.length)
  throw new Error(
    "Production build configuration must include real API source files",
  );
const logfile = path.join(root, "evidence/canonical/api-build.log");
const out = fs.openSync(logfile, "w"),
  started = Date.now();
const child = spawn(
  process.execPath,
  [
    path.join(root, "node_modules/@nestjs/cli/bin/nest.js"),
    "build",
    "--path",
    path.relative(path.join(root, "apps/api"), configPath),
  ],
  {
    cwd: path.join(root, "apps/api"),
    stdio: ["ignore", out, out],
    windowsHide: true,
  },
);
child.on("exit", (code) => {
  fs.closeSync(out);
  const rows = fs.existsSync("evidence/canonical/builds.json")
    ? JSON.parse(
        fs.readFileSync("evidence/canonical/builds.json", "utf8"),
      ).filter((r) => r.app !== "api")
    : [];
  rows.push({
    app: "api",
    result: code === 0 ? "PASS" : "FAILED",
    exitCode: code,
    durationMs: Date.now() - started,
    log: logfile,
  });
  fs.writeFileSync(
    "evidence/canonical/builds.json",
    JSON.stringify(rows, null, 2),
  );
  console.log(rows.at(-1));
  if (code !== 0) process.exitCode = 1;
});
