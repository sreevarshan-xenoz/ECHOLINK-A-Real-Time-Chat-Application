const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let server;

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (!iface.internal && iface.family === 'IPv4') {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

function startServer() {
    // Start the server process
    server = spawn('node', ['server/index.js'], {
        stdio: 'pipe'
    });

    server.stdout.on('data', (data) => {
        console.log(`Server: ${data}`);
        mainWindow?.webContents.send('server-log', data.toString());
    });

    server.stderr.on('data', (data) => {
        console.error(`Server Error: ${data}`);
        mainWindow?.webContents.send('server-error', data.toString());
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: !isDev
        },
        title: 'P2P Chat',
        icon: path.join(__dirname, 'assets/icon.png'),
    });

    // In development, use React dev server
    if (isDev) {
        mainWindow.loadURL('http://localhost:3000');
        mainWindow.webContents.openDevTools();
    } else {
        // In production, load the built files
        mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
    }

    // Send local IP to renderer
    mainWindow.webContents.on('did-finish-load', () => {
        const localIP = getLocalIP();
        mainWindow.webContents.send('local-ip', localIP);
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.on('ready', () => {
    startServer();
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
    if (server) {
        server.kill();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

// Handle file sharing
ipcMain.on('open-file-dialog', (event) => {
    dialog.showOpenDialog(mainWindow, {
        properties: ['openFile']
    }).then(result => {
        if (!result.canceled) {
            event.reply('selected-file', result.filePaths[0]);
        }
    });
});

// Handle notifications
ipcMain.on('show-notification', (event, { title, body }) => {
    new Notification({ title, body }).show();
}); 