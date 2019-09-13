// Modules to control application life and create native browser window
import {app, BrowserWindow, Tray, Menu, ipcMain} from 'electron';
import {config} from "dotenv";

config();

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
const icon: string = 'dist/static/favicon.ico';
let mainWindow: BrowserWindow | null;
let tray: Tray | null;

async function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        minWidth: 650,
        minHeight: 800,
        width: 650,
        height: 800,
        backgroundColor: '#151825',
        autoHideMenuBar: true,
        resizable: true,
        frame: false,
        show: true,
        icon,
        webPreferences: {
            nodeIntegration: true
        },
    });

    // and load the index.html of the app.
    await mainWindow.loadFile('dist/static/index.html');

    mainWindow
    // Emitted before the window is closed.
        .on('close', (event: Event) => {
            event.preventDefault();
            if (mainWindow) mainWindow.hide();
        })
    // Emitted when the window is closed.
        .on('closed', () => {
            // Dereference the window object, usually you would store windows
            // in an array if your app supports multi windows, this is the time
            // when you should delete the corresponding element.
            mainWindow = null;
        });

    ipcMain.on('main-minimize', () => {
        if (mainWindow) mainWindow.minimize();
    })
}

function createTray() {
    tray = new Tray(icon);

    const contextMenu = Menu.buildFromTemplate([
        {label: 'Restore', type: 'normal', click: () => {if (mainWindow) mainWindow.show()}},
        {type: 'separator'},
        {label: 'Quit', type: 'normal', click: () => app.exit()}
    ]);
    tray.setToolTip('Steam OTP');
    tray.setContextMenu(contextMenu);

    tray
        .on('click', () => {
            if (mainWindow) mainWindow.show();
        })
        .on("right-click", () => {
            if (tray) tray.popUpContextMenu();
        });

}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app
    .on('ready', createWindow)
    .on('ready', createTray)
    // Quit when all windows are closed.
    .on('window-all-closed', () => {
        // On macOS it is common for applications and their menu bar
        // to stay active until the user quits explicitly with Cmd + Q
        if (process.platform !== 'darwin') app.quit();
    })
    .on('activate', async () => {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (mainWindow === null) await createWindow();
    });

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

ipcMain.on("open-trades", async (event: any, args: any[]) => {
    global.sharedObject = {maFile: args};

    const tradesWindow = new BrowserWindow({
        width: 420,
        height: 800,
        backgroundColor: "#151825",
        autoHideMenuBar: true,
        resizable: true,
        frame: true,
        show: true,
        modal: true,
        parent: <BrowserWindow>mainWindow,
        webPreferences: {
            nodeIntegration: true
        }
    });

    await tradesWindow.loadFile('dist/static/trades.html');

    tradesWindow.once('ready-to-show', () => tradesWindow.show());
});
