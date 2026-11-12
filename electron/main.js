const { app, BrowserWindow, Menu, dialog, shell } = require("electron");
const path = require("path");

const PRODUCTION_URL =
  process.env.AURA_TASKS_URL || "https://aura-task-seven.vercel.app";
const DEVELOPMENT_URL =
  process.env.AURA_TASKS_DEV_URL || "http://localhost:3000";

let mainWindow = null;

function getAppUrl() {
  return app.isPackaged ? PRODUCTION_URL : DEVELOPMENT_URL;
}

function isTrustedUrl(url) {
  try {
    const parsed = new URL(url);
    const appOrigin = new URL(getAppUrl()).origin;

    if (parsed.origin === appOrigin) return true;
    if (!app.isPackaged) return false;

    // OAuth providers must remain in the same WebView so their callback can
    // return to the signed-in Aura Tasks session.
    return (
      parsed.protocol === "https:" &&
      [
        "accounts.google.com",
        "github.com",
        "api.github.com",
      ].includes(parsed.hostname)
    );
  } catch {
    return false;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    title: "Aura Tasks",
    width: 1400,
    height: 900,
    minWidth: 360,
    minHeight: 600,
    show: false,
    backgroundColor: "#09090b",
    icon: path.join(__dirname, "icon.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  });

  // Keep Aura Tasks and its OAuth providers inside Electron. Open unrelated
  // links in the user's normal browser instead of granting them an app window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isTrustedUrl(url)) return { action: "allow" };

    if (url.startsWith("https://") || url.startsWith("http://")) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!isTrustedUrl(url)) event.preventDefault();
  });

  mainWindow.webContents.on(
    "did-fail-load",
    async (_event, errorCode, errorDescription, _url, isMainFrame) => {
      if (!isMainFrame || errorCode === -3 || !mainWindow) return;

      mainWindow.show();
      const { response } = await dialog.showMessageBox(mainWindow, {
        type: "error",
        title: "Aura Tasks could not connect",
        message: "Aura Tasks needs an internet connection.",
        detail: `${errorDescription} (${errorCode})`,
        buttons: ["Retry", "Open in browser", "Quit"],
        defaultId: 0,
        cancelId: 2,
      });

      if (response === 0) {
        void mainWindow.loadURL(getAppUrl());
      } else if (response === 1) {
        void shell.openExternal(getAppUrl());
      } else {
        app.quit();
      }
    },
  );

  void mainWindow.loadURL(getAppUrl());

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

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
          label: "Open Aura Tasks in browser",
          click: () => void shell.openExternal(getAppUrl()),
        },
        {
          label: "About Aura Tasks",
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "About Aura Tasks",
              message: `Aura Tasks - v${app.getVersion()}`,
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

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.setAppUserModelId("com.auratasks.app");

app.whenReady().then(() => {
  createMenu();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
