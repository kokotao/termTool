import { app, BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import { IPC_CHANNELS } from '../../shared/constants';

let activeMainWindow: BrowserWindow | null = null;
let isUpdaterServiceInitialized = false;

const sendUpdateStatus = (payload: Record<string, unknown>) => {
  if (!activeMainWindow || activeMainWindow.isDestroyed() || activeMainWindow.webContents.isDestroyed()) {
    return;
  }
  activeMainWindow.webContents.send(IPC_CHANNELS.APP.UPDATE_STATUS, payload);
};

export const setupUpdaterService = (mainWindow: BrowserWindow) => {
  activeMainWindow = mainWindow;
  mainWindow.on('closed', () => {
    if (activeMainWindow === mainWindow) {
      activeMainWindow = null;
    }
  });

  if (isUpdaterServiceInitialized) {
    return;
  }
  isUpdaterServiceInitialized = true;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    sendUpdateStatus({ status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    sendUpdateStatus({
      status: 'available',
      version: info.version,
      releaseName: info.releaseName,
      releaseDate: info.releaseDate,
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    sendUpdateStatus({
      status: 'latest',
      version: info.version,
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    sendUpdateStatus({
      status: 'downloading',
      progress: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendUpdateStatus({
      status: 'downloaded',
      version: info.version,
      releaseName: info.releaseName,
      releaseDate: info.releaseDate,
    });
  });

  autoUpdater.on('error', (error) => {
    sendUpdateStatus({
      status: 'error',
      message: error?.message || 'Unknown updater error',
    });
  });

  ipcMain.handle(IPC_CHANNELS.APP.GET_VERSION, () => {
    return app.getVersion();
  });

  ipcMain.handle(IPC_CHANNELS.APP.CHECK_FOR_UPDATES, async () => {
    if (!app.isPackaged) {
      return { success: false, error: 'Updater is only available in packaged app.' };
    }
    try {
      await autoUpdater.checkForUpdates();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Failed to check updates' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.APP.DOWNLOAD_UPDATE, async () => {
    if (!app.isPackaged) {
      return { success: false, error: 'Updater is only available in packaged app.' };
    }
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Failed to download update' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.APP.INSTALL_UPDATE, () => {
    if (!app.isPackaged) {
      return { success: false, error: 'Updater is only available in packaged app.' };
    }
    setImmediate(() => autoUpdater.quitAndInstall());
    return { success: true };
  });
};
