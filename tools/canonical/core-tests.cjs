const path = require("path"),
  fs = require("fs"),
  { spawnSync } = require("child_process");
const root = path.resolve(__dirname, "../.."),
  service = path.join(root, "apps/ai-service"),
  python =
    process.env.PYTHON ||
    path.join(
      service,
      ".venv",
      process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
    );
if (!fs.existsSync(python))
  throw new Error(
    "Install apps/ai-service/requirements.txt in its .venv first",
  );
const commands = [
  [python, ["-B", path.join(__dirname, "python-tests.py")], root],
  [python, ["-B", path.join(__dirname, "generate_fixtures.py")], root],
  [python, ["-B", path.join(__dirname, "accuracy.py")], root],
  [process.execPath, [path.join(__dirname, "schema-tests.cjs")], root],
  [process.execPath, [path.join(__dirname, "scene-tests.mjs")], root],
];
for (const [command, args, cwd] of commands) {
  const r = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    windowsHide: true,
  });
  if (r.status !== 0) process.exit(r.status || 1);
}
