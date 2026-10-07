const fs = require("fs"),
  path = require("path"),
  { spawn } = require("child_process");
const root = process.cwd(),
  next = path.join(root, "node_modules/next/dist/bin/next");
const selected = process.argv.slice(2);
const apps = selected.length ? selected : ["web", "builder", "admin"];
(async () => {
  const results = fs.existsSync("evidence/canonical/builds.json")
    ? JSON.parse(
        fs.readFileSync("evidence/canonical/builds.json", "utf8"),
      ).filter((r) => !apps.includes(r.app))
    : [];
  for (const app of apps) {
    if (!["web", "builder", "admin"].includes(app))
      throw new Error("Unknown app");
    const source = path.join(root, "apps", app),
      target = path.join(root, ".cache/canonical-build", app);
    fs.mkdirSync(target, { recursive: true });
    const copiedSource = path.resolve(target, "src");
    if (
      !copiedSource.startsWith(
        path.resolve(root, ".cache/canonical-build") + path.sep,
      )
    )
      throw new Error("Invalid generated build path");
    fs.rmSync(copiedSource, { recursive: true, force: true });
    for (const name of [
      "src",
      "public",
      "package.json",
      "next-env.d.ts",
      "postcss.config.js",
      "tailwind.config.js",
    ]) {
      const src = path.join(source, name);
      if (fs.existsSync(src))
        fs.cpSync(src, path.join(target, name), { recursive: true });
    }
    const config = JSON.parse(
      fs.readFileSync(path.join(source, "tsconfig.json"), "utf8"),
    );
    config.compilerOptions.paths["@aether/ui"] = [
      path.join(root, "packages/ui/src/index.ts"),
    ];
    config.exclude = ["node_modules"];
    fs.writeFileSync(
      path.join(target, "tsconfig.json"),
      JSON.stringify(config, null, 2),
    );
    fs.writeFileSync(
      path.join(target, "next.config.mjs"),
      `export default {experimental:{cpus:1},eslint:{ignoreDuringBuilds:true}};\n`,
    );
    const logfile = path.join(root, "evidence/canonical", `${app}-build.log`);
    fs.mkdirSync(path.dirname(logfile), { recursive: true });
    const out = fs.openSync(logfile, "w");
    console.log(`Building ${app} in isolated cache…`);
    const started = Date.now();
    const child = spawn(process.execPath, [next, "build"], {
      cwd: target,
      env: {
        ...process.env,
        NEXT_TELEMETRY_DISABLED: "1",
        NEXT_PUBLIC_API_URL: "http://localhost:3195",
        NEXT_PUBLIC_VIEWER_URL: "http://localhost:3191",
      },
      stdio: ["ignore", out, out],
      windowsHide: true,
    });
    const code = await new Promise((resolve, reject) => {
      child.on("exit", resolve);
      child.on("error", reject);
    });
    fs.closeSync(out);
    results.push({
      app,
      result: code === 0 ? "PASS" : "FAILED",
      exitCode: code,
      durationMs: Date.now() - started,
      log: logfile,
    });
    console.log(`${app}: ${results.at(-1).result}`);
  }
  const current = fs.existsSync("evidence/canonical/builds.json")
    ? JSON.parse(
        fs.readFileSync("evidence/canonical/builds.json", "utf8"),
      ).filter((r) => !apps.includes(r.app))
    : [];
  const merged = [...current, ...results.filter((r) => apps.includes(r.app))];
  fs.writeFileSync(
    "evidence/canonical/builds.json",
    JSON.stringify(merged, null, 2),
  );
  if (merged.some((r) => r.result !== "PASS")) process.exitCode = 1;
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
