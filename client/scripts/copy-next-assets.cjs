/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const standalone = path.join(root, ".next", "standalone");

for (const [source, destination] of [
  [path.join(root, "public"), path.join(standalone, "public")],
  [
    path.join(root, ".next", "static"),
    path.join(standalone, ".next", "static"),
  ],
]) {
  if (fs.existsSync(source)) {
    fs.cpSync(source, destination, { recursive: true });
  }
}
