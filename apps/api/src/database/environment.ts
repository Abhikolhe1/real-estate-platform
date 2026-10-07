import { config } from "dotenv";
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
let directory = __dirname;
while (true) {
  const manifest = join(directory, "package.json");
  if (
    existsSync(manifest) &&
    JSON.parse(readFileSync(manifest, "utf8")).name === "real-estate-platform"
  ) {
    config({
      path: [join(directory, "apps/api/.env"), join(directory, ".env")],
      quiet: true,
    });
    break;
  }
  const parent = dirname(directory);
  if (parent === directory) {
    config({ quiet: true });
    break;
  }
  directory = parent;
}
