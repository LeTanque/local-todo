/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const standalone = path.join(root, ".next", "standalone");

function findServerJs(directory) {
  const candidates = [
    path.join(directory, "server.js"),
    path.join(directory, "client", "server.js"),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate));
}

const serverPath = findServerJs(standalone);
if (!serverPath) {
  throw new Error(`Could not find Next.js standalone server.js under ${standalone}`);
}

const serverDirectory = path.dirname(serverPath);

for (const [source, destination] of [
  [path.join(root, "public"), path.join(serverDirectory, "public")],
  [
    path.join(root, ".next", "static"),
    path.join(serverDirectory, ".next", "static"),
  ],
]) {
  if (fs.existsSync(source)) {
    fs.cpSync(source, destination, { recursive: true });
  }
}

console.log(`Copied Next assets next to ${serverPath}`);
