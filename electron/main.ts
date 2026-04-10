/**
 * 作者：albert_luo
 * 文件作用：Electron 主进程入口（创建窗口、加载页面、注册 IPC 服务）
 */
import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import electronSquirrelStartup from 'electron-squirrel-startup'
import { setupSSHService } from './services/ssh'
import { setupSFTPService } from './services/sftp'
import { setupLocalFsService } from './services/localFs'
import { setupUpdaterService } from './services/updater'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Windows 安装/卸载场景下用于处理快捷方式（对 macOS 不影响）
if (electronSquirrelStartup) {
  app.quit()
}

const createWindow = () => {
  // 创建主窗口（Renderer 通过 preload 暴露的 API 与主进程通信）
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    backgroundColor: '#1E1E1E',
    titleBarStyle: 'hiddenInset', // macOS style
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // 注册主进程侧的各类 IPC 服务（SSH / SFTP / 本地文件）
  setupSSHService(mainWindow);
  setupSFTPService();
  setupLocalFsService();
  setupUpdaterService(mainWindow);

  // 开发环境走 Vite DevServer；生产环境加载构建后的静态文件
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
