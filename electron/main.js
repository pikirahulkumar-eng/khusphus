const { app, BrowserWindow, ipcMain, session, Notification } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

let mainWindow = null;
let staticServer = null;

// Embedded secure local web server for production dist bundle
function startEmbeddedServer() {
  return new Promise((resolve, reject) => {
    const distPath = path.join(__dirname, '../dist');
    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.ttf': 'font/ttf',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.mp3': 'audio/mpeg',
    };

    staticServer = http.createServer((req, res) => {
      let cleanUrl = req.url.split('?')[0];
      if (cleanUrl === '/' || cleanUrl === '') cleanUrl = '/index.html';
      
      let filePath = path.join(distPath, cleanUrl);
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(distPath, 'index.html');
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        res.writeHead(200, {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
        });
        res.end(data);
      });
    });

    staticServer.listen(0, '127.0.0.1', () => {
      const address = staticServer.address();
      const port = typeof address === 'string' ? 0 : address.port;
      console.log(`Sunao Desktop embedded server listening on http://127.0.0.1:${port}`);
      resolve(port);
    });

    staticServer.on('error', (err) => reject(err));
  });
}

async function createWindow() {
  const port = await startEmbeddedServer();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 840,
    minHeight: 600,
    title: 'Sunao - Messenger & HD Calls',
    backgroundColor: '#0F172A',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  });

  // Auto-grant media and camera/mic permissions for WebRTC calling
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowed = ['media', 'camera', 'microphone', 'notifications', 'mediaKeySystem'];
    if (allowed.includes(permission)) {
      callback(true);
    } else {
      callback(false);
    }
  });

  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    const allowed = ['media', 'camera', 'microphone', 'notifications', 'mediaKeySystem'];
    return allowed.includes(permission);
  });

  // Load the web app from the embedded server
  await mainWindow.loadURL(`http://127.0.0.1:${port}`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC notification listener
ipcMain.on('notify', (event, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({ title: title || 'Sunao', body: body || '' }).show();
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (staticServer) {
    staticServer.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
