const fs = require("fs"),
  path = require("path"),
  { spawn } = require("child_process");
const root = path.resolve(__dirname, "../.."),
  directory = path.join(root, "apps/ai-service");
require("dotenv").config({
  path: [path.join(root, "apps/api/.env"), path.join(root, ".env")],
  quiet: true,
});
const python =
  process.env.PYTHON ||
  path.join(
    directory,
    ".venv",
    process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
  );
if (!fs.existsSync(python))
  throw new Error(
    "Create apps/ai-service/.venv and install requirements.txt first",
  );
if (!process.env.CAD_SERVICE_TOKEN)
  throw new Error("Configure CAD_SERVICE_TOKEN in the environment");
const allowed = new Set([
  "PATH",
  "SYSTEMROOT",
  "WINDIR",
  "COMSPEC",
  "PATHEXT",
  "TEMP",
  "TMP",
  "LANG",
  "LC_ALL",
  "PYTHONUTF8",
  "VIRTUAL_ENV",
  "HOME",
  "USERPROFILE",
  "HOMEDRIVE",
  "HOMEPATH",
  "CAD_SERVICE_TOKEN",
  "ENABLE_LEGACY_CAD_DEMOS",
]);
const environment = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => allowed.has(key.toUpperCase())),
);
const child = spawn(
  python,
  [
    "-B",
    "-m",
    "uvicorn",
    "main:app",
    "--host",
    "127.0.0.1",
    "--port",
    process.env.CAD_SERVICE_PORT || "8000",
  ],
  { cwd: directory, env: environment, stdio: "inherit", windowsHide: true },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => {
  process.exitCode = code || 0;
});
