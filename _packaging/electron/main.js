const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { startStaticServer } = require('./static-server');

// katalog bundla: dev -> ../web ; prod -> resources/web
const WEB_ROOT = app.isPackaged
  ? path.join(process.resourcesPath, 'web')
  : path.join(__dirname, '..', 'web');

let serverHandle = null;

async function createWindow() {
  serverHandle = await startStaticServer(WEB_ROOT);

  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#1a1a1a',
    title: 'Atlas anatomiczny 3D',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // pełne wsparcie WebGL2 / workerów Draco:
      webgl: true,
      backgroundThrottling: false,
    },
  });

  win.removeMenu();

  // linki zewnętrzne (np. z banera aktualizacji) -> domyślna przeglądarka, nie w oknie
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) { shell.openExternal(url); return { action: 'deny' }; }
    return { action: 'allow' };
  });

  win.loadURL(serverHandle.origin + '/');
}

// pojedyncza instancja
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const w = BrowserWindow.getAllWindows()[0];
    if (w) { if (w.isMinimized()) w.restore(); w.focus(); }
  });

  app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
    setupUpdater();
  });
}

app.on('window-all-closed', () => {
  if (serverHandle && serverHandle.server) serverHandle.server.close();
  if (process.platform !== 'darwin') app.quit();
});

// ── aktualizacje (electron-updater; feed = GitHub Releases wg package.json > build.publish) ──
function setupUpdater() {
  if (!app.isPackaged) return;
  let autoUpdater;
  try { ({ autoUpdater } = require('electron-updater')); }
  catch (_) { return; }

  // Okna dialogowe po polsku tylko dla systemu PL; w pozostalych - po francusku.
  const fr = !/^pl/i.test(app.getLocale() || '');
  const tr = (pl, frText) => (fr ? frText : pl);

  autoUpdater.autoDownload = false;
  autoUpdater.on('error', (e) => console.warn('[updater]', e && e.message));
  autoUpdater.on('update-available', async (info) => {
    const r = await dialog.showMessageBox({
      type: 'info',
      buttons: [tr('Pobierz teraz', 'Télécharger'), tr('Później', 'Plus tard')],
      defaultId: 0,
      cancelId: 1,
      title: tr('Dostępna aktualizacja', 'Mise à jour disponible'),
      message: tr('Nowa wersja atlasu: ', 'Nouvelle version de l\'atlas : ') + info.version,
      detail: info.releaseNotes ? String(info.releaseNotes).slice(0, 500) : undefined,
    });
    if (r.response === 0) autoUpdater.downloadUpdate();
  });
  autoUpdater.on('update-downloaded', async () => {
    const r = await dialog.showMessageBox({
      type: 'info',
      buttons: [tr('Zainstaluj i uruchom ponownie', 'Installer et redémarrer'), tr('Później', 'Plus tard')],
      defaultId: 0,
      title: tr('Aktualizacja gotowa', 'Mise à jour prête'),
      message: tr('Pobrano nową wersję. Zainstalować teraz?', 'La nouvelle version est téléchargée. L\'installer maintenant ?'),
    });
    if (r.response === 0) autoUpdater.quitAndInstall();
  });

  autoUpdater.checkForUpdates().catch(() => {});
}
