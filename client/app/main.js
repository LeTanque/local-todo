import { app, BrowserWindow } from "electron";
import { join } from "path";
import { exec } from "child_process";

let mainWindow;
let nextProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    // Development: point directly to your local Next.js dev server
    mainWindow.loadURL("http://localhost:4310");
  } else {
    // Production: Start the compiled Next.js standalone server
    const serverPath = join(__dirname, ".next", "standalone", "server.js");

    nextProcess = exec(`node ${serverPath}`, {
      env: { ...process.env, PORT: 4310 },
    });

    // Give the local server a second to boot up before loading the window
    setTimeout(() => {
      mainWindow.loadURL("http://localhost:4310");
    }, 1500);
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

// Ensure the Next.js server child process terminates when the Electron app closes
app.on("window-all-closed", () => {
  if (nextProcess) nextProcess.kill();
  if (process.platform !== "darwin") app.quit();
});
