/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("node:fs");
const path = require("node:path");
const esbuild = require("esbuild");

const clientDir = path.join(__dirname, "..");
const serverDir = path.join(clientDir, "..", "server");
const resourcesDir = path.join(clientDir, "resources");
const outfile = path.join(resourcesDir, "api.cjs");
const envSource = fs.existsSync(path.join(serverDir, ".env"))
  ? path.join(serverDir, ".env")
  : path.join(serverDir, ".env.example");

fs.mkdirSync(resourcesDir, { recursive: true });
fs.copyFileSync(envSource, path.join(resourcesDir, "api.env"));

esbuild.buildSync({
  absWorkingDir: serverDir,
  entryPoints: ["src/server.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile,
  logLevel: "info",
});

console.log(`Bundled API to ${outfile}`);
