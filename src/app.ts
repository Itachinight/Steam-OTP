// Modules to control application life and create native browser window
import {app, BrowserWindow, ipcMain} from 'electron';

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow: BrowserWindow | null;

async function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        minWidth: 650,
        minHeight: 800,
        width: 650,
        height: 800,
        webPreferences: {
            nodeIntegration: true
        },
        backgroundColor: '#8fa0cd',
        autoHideMenuBar: true,
        resizable: true,
        frame: true,
        show: true,
    });

    // and load the index.html of the app.
    await mainWindow.loadFile('dist/static/index.html');


    //mainWindow.removeMenu();

    // Open the DevTools.
    // mainWindow.webContents.openDevTools();

    // Emitted when the window is closed.
    mainWindow.on('closed', () => {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null;
    })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed',  () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', async () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) await createWindow();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

ipcMain.on("open-trades",async (event: any, args: any[]) => {
    global.sharedObject = {maFile: args};

    const tradesWindow = new BrowserWindow({
        width: 450,
        height: 800,
        webPreferences: {
            nodeIntegration: true
        },
        backgroundColor: '#8fa0cd',
        autoHideMenuBar: true,
        resizable: true,
        frame: true,
        show: true,
        modal: true,
        parent: <BrowserWindow>mainWindow
    });

    await tradesWindow.loadFile('dist/static/trades.html');

    tradesWindow.once('ready-to-show', () => {
        tradesWindow.show();
    })
});
