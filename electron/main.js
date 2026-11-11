const { app, BrowserWindow, Menu, ipcMain, dialog } = require("electron");
const path = require("path");
const isDev = process.env.NODE_ENV === "development";

let mainWindow;

/**
 * AURA TASKS - ELECTRON MAIN PROCESS
 *
 * Builds Windows .exe app that runs Aura Tasks
 * Build: npm run electron:build
 * Dev: npm run electron:dev
 */

// Create main application window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Load app
  if (isDev) {
    // Development: connect to Next.js dev server (localhost:3000)
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools();
  } else {
    // Production: load built Next.js app
    const startUrl = `file://${path.join(__dirname, "../.next/standalone/public/index.html")}`;
    mainWindow.loadURL(startUrl);
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// App lifecycle
app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Create application menu
function createMenu() {
  const template = [
    {
      label: "File",
      submenu: [
        {
          label: "Exit",
          accelerator: "CmdOrCtrl+Q",
          click: () => app.quit(),
        },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "About Aura Tasks",
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "About Aura Tasks",
              message: "Aura Tasks - v1.0.0",
              detail:
                "Modern Project Management & Kanban Boards\n\n" +
                "Built with Next.js 16 & Electron\n" +
                "Powered by Vercel & PostgreSQL\n\n" +
                "© 2026 Aura Tasks Inc.",
              buttons: ["OK"],
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.on("ready", createMenu);

// IPC Handlers - Communication between renderer & main process
ipcMain.handle("app:get-version", () => app.getVersion());
ipcMain.handle("app:get-name", () => "Aura Tasks");
ipcMain.handle("app:get-path", (event, name) => app.getPath(name));
