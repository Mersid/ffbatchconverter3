import { app, BrowserWindow, shell, WebContents } from "electron";
import { join } from "path";
import { electronApp, is, optimizer } from "@electron-toolkit/utils";
import icon from "../../resources/icon.png?asset";
import { installExtension, REACT_DEVELOPER_TOOLS, REDUX_DEVTOOLS } from "electron-extension-installer";
import { registerIPCHandlers } from "./encoders/misc/IPCHandlers";

export let webContents: WebContents;

async function createWindow(): Promise<void> {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 1500,
        height: 800,
        show: false,
        autoHideMenuBar: true,
        ...(process.platform === "linux" ? { icon } : {}),
        webPreferences: {
            preload: join(__dirname, "../preload/index.js"),
            sandbox: false
        },
        title: "FFBatchConverter 3"
    });

    webContents = mainWindow.webContents;

    mainWindow.on("ready-to-show", () => {
        mainWindow.show();
    });

    registerIPCHandlers();

    mainWindow.webContents.setWindowOpenHandler(details => {
        shell.openExternal(details.url);
        return { action: "deny" };
    });

    // HMR for renderer base on electron-vite cli.
    // Load the remote URL for development or the local html file for production.
    if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
        await mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
    } else {
        await mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
    }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
    // Load devtools
    await installExtension(REACT_DEVELOPER_TOOLS);
    await installExtension(REDUX_DEVTOOLS);

    // Set app user model id for windows
    electronApp.setAppUserModelId("com.mersid.ffbatchconverter3");

    // Default open or close DevTools by F12 in development
    // and ignore CommandOrControl + R in production.
    // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
    app.on("browser-window-created", (_, window) => {
        optimizer.watchWindowShortcuts(window);
    });

    await createWindow();

    app.on("activate", function () {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
