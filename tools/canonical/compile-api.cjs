const fs = require("fs"),
  path = require("path"),
  ts = require("typescript");
const src = "apps/api/src",
  out = ".cache/canonical-api";
fs.mkdirSync(out, { recursive: true });
function visit(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const name = path.join(dir, entry.name);
    if (entry.isDirectory()) visit(name);
    else if (name.endsWith(".ts")) {
      const target = path.join(
        out,
        path.relative(src, name).replace(/\.ts$/, ".js"),
      );
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(
        target,
        ts.transpileModule(fs.readFileSync(name, "utf8"), {
          compilerOptions: {
            target: ts.ScriptTarget.ES2021,
            module: ts.ModuleKind.CommonJS,
            experimentalDecorators: true,
            emitDecoratorMetadata: true,
            esModuleInterop: true,
          },
        }).outputText,
      );
    }
  }
}
visit(src);
console.log("Isolated API modules compiled");
