const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');
const isDev = process.env.NODE_ENV === 'development';
const waitOn = require('wait-on');

let mainWindow;
let server;
let loadingScreen;

function createLoadingScreen() {
    loadingScreen = new BrowserWindow({
        width: 300,
        height: 400,
        frame: false,
        transparent: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    loadingScreen.loadFile(path.join(__dirname, 'loading.html'));
    loadingScreen.center();
}

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
    return new Promise((resolve, reject) => {
        server = spawn('node', ['server/index.js'], {
            stdio: 'pipe'
        });

        server.stdout.on('data', (data) => {
            console.log(`Server: ${data}`);
            if (data.toString().includes('Server running')) {
                resolve();
            }
            mainWindow?.webContents.send('server-log', data.toString());
        });

        server.stderr.on('data', (data) => {
            console.error(`Server Error: ${data}`);
            mainWindow?.webContents.send('server-error', data.toString());
        });

        // Set a timeout for server start
        setTimeout(() => {
            reject(new Error('Server startup timeout'));
        }, 30000);
    });
}

async function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        show: false, // Don't show until ready
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
        try {
            // Wait for React dev server to be ready
            await waitOn({
                resources: ['http://localhost:3000'],
                timeout: 30000, // 30 seconds timeout
            });
            await mainWindow.loadURL('http://localhost:3000');
            mainWindow.webContents.openDevTools();
        } catch (err) {
            console.error('Failed to load React dev server:', err);
            // Fallback to production build if dev server fails
            mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
        }
    } else {
        // In production, load the built files
        mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
    }

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        if (loadingScreen) {
            loadingScreen.close();
            loadingScreen = null;
        }
        mainWindow.show();
    });

    // Send local IP to renderer
    mainWindow.webContents.on('did-finish-load', () => {
        const localIP = getLocalIP();
        mainWindow.webContents.send('local-ip', localIP);
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.on('ready', async () => {
    createLoadingScreen();
    try {
        await startServer();
        await createWindow();
    } catch (error) {
        console.error('Failed to start application:', error);
        if (loadingScreen) {
            loadingScreen.close();
        }
        app.quit();
    }
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