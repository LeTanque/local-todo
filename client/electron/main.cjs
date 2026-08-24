/* eslint-disable @typescript-eslint/no-require-imports */

const { app, BrowserWindow, dialog, shell } = require("electron");
const { execFile, spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

if (!app) {
  throw new Error("Run this process with Electron, not Node. Unset ELECTRON_RUN_AS_NODE.");
}

app.setName("cyberpunk2077-todo");

const webPort = Number(process.env.WEB_PORT ?? 4310);
const apiPort = Number(process.env.API_PORT ?? 4311);
const appUrl = `http://127.0.0.1:${webPort}`;
const apiHealthUrl = `http://127.0.0.1:${apiPort}/health`;

const repoRoot = path.join(__dirname, "..", "..");
const clientDir = path.join(__dirname, "..");
const serverDir = path.join(repoRoot, "server");

let mainWindow;
let creatingWindow = false;
const children = [];

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function isHttpUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isAppUrl(url) {
  try {
    return new URL(url).origin === new URL(appUrl).origin;
  } catch {
    return false;
  }
}

function openInBrowser(url) {
  if (!isHttpUrl(url) || isAppUrl(url)) return;
  void shell.openExternal(url);
}

function handleExternalLinks(window) {
  window.webContents.setWindowOpenHandler(({ url }) => {
    openInBrowser(url);
    return { action: "deny" };
  });

  window.webContents.on("will-navigate", (event, url) => {
    if (isAppUrl(url) || !isHttpUrl(url)) return;
    event.preventDefault();
    openInBrowser(url);
  });
}

function withoutElectronAsNode(env) {
  const nextEnv = { ...env };
  delete nextEnv.ELECTRON_RUN_AS_NODE;
  return nextEnv;
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const parsed = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    parsed[trimmed.slice(0, separator)] = trimmed.slice(separator + 1);
  }
  return parsed;
}

function apiEnvironment() {
  const packagedEnvPath = path.join(process.resourcesPath, "api.env");
  const localEnvPath = path.join(serverDir, ".env");
  const fileEnv = parseEnvFile(app.isPackaged ? packagedEnvPath : localEnvPath);

  return {
    ...withoutElectronAsNode(process.env),
    ...fileEnv,
    PORT: String(apiPort),
    DB_HOST: fileEnv.DB_HOST ?? process.env.DB_HOST ?? "127.0.0.1",
    DB_PORT: fileEnv.DB_PORT ?? process.env.DB_PORT ?? "5432",
    DB_NAME: fileEnv.DB_NAME ?? process.env.DB_NAME ?? "todo",
    DB_USER: fileEnv.DB_USER ?? process.env.DB_USER ?? "todo",
    DB_PASSWORD: fileEnv.DB_PASSWORD ?? process.env.DB_PASSWORD ?? "todo",
  };
}

function bin(name) {
  const candidates = [
    path.join(clientDir, "node_modules", ".bin", name),
    path.join(serverDir, "node_modules", ".bin", name),
    path.join(repoRoot, "node_modules", ".bin", name),
  ];
  const match = candidates.find((candidate) => fs.existsSync(candidate));
  if (!match) throw new Error(`Could not find ${name} in node_modules/.bin`);
  return match;
}

async function isReachable(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForServer(url, label, child, attempts = 40) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (await isReachable(url)) return;
    if (child && child.exitCode != null && child.exitCode !== 0) {
      throw new Error(
        `${label} failed to start at ${url}. Port may already be in use.`,
      );
    }
    await wait(250);
  }

  throw new Error(`${label} did not start at ${url}`);
}

function track(child, label) {
  if (!child) return child;

  children.push(child);
  child.stdout?.on("data", (output) => {
    console.log(`${label}: ${output}`);
  });
  child.stderr?.on("data", (output) => {
    console.error(`${label}: ${output}`);
  });
  child.on("error", (error) => {
    console.error(`${label} failed to start:`, error);
  });
  child.on("exit", (code, signal) => {
    child.exitCode = code;
    if (code && code !== 0) {
      console.error(`${label} exited with code ${code}${signal ? ` (${signal})` : ""}`);
    }
  });
  return child;
}

function killChildren() {
  for (const child of children) {
    if (!child?.pid) continue;
    try {
      if (process.platform === "win32") {
        spawn("taskkill", ["/pid", String(child.pid), "/f", "/t"]);
      } else {
        process.kill(-child.pid, "SIGTERM");
      }
    } catch {
      try {
        child.kill("SIGTERM");
      } catch {
        // Already gone.
      }
    }
  }
}

function standaloneServerPath() {
  const root = app.isPackaged
    ? path.join(process.resourcesPath, "app.asar.unpacked", ".next", "standalone")
    : path.join(clientDir, ".next", "standalone");
  const candidates = [
    path.join(root, "server.js"),
    path.join(root, "client", "server.js"),
  ];
  const match = candidates.find((candidate) => fs.existsSync(candidate));
  if (!match) {
    throw new Error(`Could not find Next.js server.js under ${root}`);
  }
  return match;
}

function startPackagedApi() {
  const apiPath = path.join(process.resourcesPath, "api.cjs");
  if (!fs.existsSync(apiPath)) {
    throw new Error(`Could not find bundled API at ${apiPath}`);
  }
  return track(
    execFile(process.execPath, [apiPath], {
      cwd: process.resourcesPath,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...apiEnvironment(),
        ELECTRON_RUN_AS_NODE: "1",
        NODE_ENV: "production",
      },
    }),
    "API",
  );
}

function startPackagedNext() {
  const serverPath = standaloneServerPath();
  const standaloneDirectory = path.dirname(serverPath);

  return track(
    execFile(process.execPath, [serverPath], {
      cwd: standaloneDirectory,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...withoutElectronAsNode(process.env),
        ELECTRON_RUN_AS_NODE: "1",
        NODE_ENV: "production",
        HOSTNAME: "127.0.0.1",
        PORT: String(webPort),
        API_URL: `http://127.0.0.1:${apiPort}`,
      },
    }),
    "Next.js",
  );
}

function startDevProcess(command, args, cwd, label, env = withoutElectronAsNode(process.env)) {
  return track(
    spawn(command, args, {
      cwd,
      env,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    }),
    label,
  );
}

async function startBackend() {
  if (await isReachable(apiHealthUrl)) return;

  const child = app.isPackaged
    ? startPackagedApi()
    : startDevProcess(bin("tsx"), ["src/server.ts"], serverDir, "API", apiEnvironment());

  await waitForServer(apiHealthUrl, "API", child);
}

async function startFrontend() {
  if (await isReachable(appUrl)) return;

  const child = app.isPackaged
    ? startPackagedNext()
    : startDevProcess(bin("next"), ["dev", "-p", String(webPort)], clientDir, "Next.js");

  await waitForServer(appUrl, "Next.js", child);
}

async function createWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    return;
  }
  if (creatingWindow) return;
  creatingWindow = true;

  try {
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      title: "cyberpunk2077-todo",
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    handleExternalLinks(mainWindow);

    await startBackend();
    await startFrontend();
    await mainWindow.loadURL(appUrl);
  } finally {
    creatingWindow = false;
  }
}

app
  .whenReady()
  .then(createWindow)
  .catch((error) => {
    console.error(error);
    dialog.showErrorBox(
      "cyberpunk2077-todo",
      error instanceof Error ? error.message : String(error),
    );
    app.quit();
  });

app.on("before-quit", killChildren);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    killChildren();
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) void createWindow();
});
