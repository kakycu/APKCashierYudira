const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

/* La carpeta web se sincroniza desde ../www y se empaqueta dentro de
   app.asar: en la instalación no queda una carpeta www visible. */
function webRoot(){
  return path.join(app.getAppPath(), 'www');
}

if(!app.requestSingleInstanceLock()) app.quit();

function createWindow(){
  const win = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 360,
    minHeight: 500,
    title: 'Cashier de Yudira V2.0.5',
    icon: path.join(webRoot(), 'icons', 'icon-512.png'),
    backgroundColor: '#0a0c10',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  win.setMenuBarVisibility(false);
  win.loadFile(path.join(webRoot(), 'index.html'));

  /* Los enlaces con target="_system" o "_blank" se abren en el navegador
     del sistema, nunca como una ventana interna. */
  win.webContents.setWindowOpenHandler(({ url }) => {
    if(/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    if(/^https?:/i.test(url)){
      event.preventDefault();
      shell.openExternal(url);
    }
  });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
