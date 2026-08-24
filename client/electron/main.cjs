/* eslint-disable @typescript-eslint/no-require-imports */

const { app, BrowserWindow } = require("electron");
const { execFile } = require("node:child_process");
const path = require("node:path");

if (!app) {
  throw new Error("Run this process with Electron, not Node. Unset ELECTRON_RUN_AS_NODE.");
}

app.setName("cyberpunk2077-todo");

const port = Number(process.env.WEB_PORT ?? 4310);
const appUrl = `http://127.0.0.1:${port}`;

let mainWindow;
let nextProcess;

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForServer(url, attempts = 30) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The server has not started listening yet.
    }

    await wait(250);
  }

  throw new Error("The bundled Next.js server did not start.");
}

function startProductionServer() {
  const standalonePath = app.isPackaged
    ? path.join(process.resourcesPath, "app.asar.unpacked", ".next", "standalone")
    : path.join(__dirname, "..", ".next", "standalone");
  const serverPath = path.join(standalonePath, "server.js");

  nextProcess = execFile(process.execPath, [serverPath], {
    cwd: standalonePath,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      PORT: String(port),
    },
  });

  nextProcess.stderr?.on("data", (output) => {
    console.error(`Next.js server: ${output}`);
  });
}

async function createWindow() {
  const isDevelopment = !app.isPackaged;

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    title: "cyberpunk2077-todo",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());

  if (isDevelopment) {
    await mainWindow.loadURL(appUrl);
    return;
  }

  startProductionServer();
  await waitForServer(appUrl);
  await mainWindow.loadURL(appUrl);
}

function stopProductionServer() {
  if (nextProcess && !nextProcess.killed) nextProcess.kill();
}

app.whenReady().then(createWindow).catch((error) => {
  console.error(error);
  app.quit();
});

app.on("before-quit", stopProductionServer);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) void createWindow();
});
