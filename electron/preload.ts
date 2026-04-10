import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/constants'
import { SSHConnection } from '../shared/types'

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  ssh: {
    connect: (connectionId: string, config: SSHConnection, pty?: { rows: number; cols: number }) =>
      ipcRenderer.invoke(IPC_CHANNELS.SSH.CONNECT, { connectionId, config, pty }),
    
    disconnect: (connectionId: string) => 
      ipcRenderer.invoke(IPC_CHANNELS.SSH.DISCONNECT, { connectionId }),
    
    sendData: (connectionId: string, data: string) => 
      ipcRenderer.send(IPC_CHANNELS.SSH.DATA, { connectionId, data }),
    
    resize: (connectionId: string, rows: number, cols: number) => 
      ipcRenderer.send(IPC_CHANNELS.SSH.RESIZE, { connectionId, rows, cols }),
    
    onData: (callback: (event: any, payload: { connectionId: string, data: string }) => void) => {
      const subscription = (_: any, payload: any) => callback(_, payload);
      ipcRenderer.on(IPC_CHANNELS.SSH.DATA, subscription);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.SSH.DATA, subscription);
    },

    onStatus: (callback: (event: any, payload: { connectionId: string, status: string }) => void) => {
      const subscription = (_: any, payload: any) => callback(_, payload);
      ipcRenderer.on(IPC_CHANNELS.SSH.STATUS, subscription);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.SSH.STATUS, subscription);
    },
    generateKey: (options: { type: 'rsa' | 'ed25519', bits?: number, comment?: string }) => 
      ipcRenderer.invoke(IPC_CHANNELS.SSH.GENERATE_KEY, options),
  },
  sftp: {
    connect: (connectionId: string, config: SSHConnection) => 
      ipcRenderer.invoke(IPC_CHANNELS.SFTP.CONNECT, { connectionId, config }),
    disconnect: (connectionId: string) => 
      ipcRenderer.invoke(IPC_CHANNELS.SFTP.DISCONNECT, { connectionId }),
    list: (connectionId: string, path: string) => 
      ipcRenderer.invoke(IPC_CHANNELS.SFTP.LIST, { connectionId, path }),
    upload: (connectionId: string, localPath: string, remotePath: string) => 
      ipcRenderer.invoke(IPC_CHANNELS.SFTP.UPLOAD, { connectionId, localPath, remotePath }),
    download: (connectionId: string, remotePath: string, localPath: string) => 
      ipcRenderer.invoke(IPC_CHANNELS.SFTP.DOWNLOAD, { connectionId, remotePath, localPath }),
    delete: (connectionId: string, path: string, isDir: boolean) => 
      ipcRenderer.invoke(IPC_CHANNELS.SFTP.DELETE, { connectionId, path, isDir }),
    mkdir: (connectionId: string, path: string) => 
      ipcRenderer.invoke(IPC_CHANNELS.SFTP.MKDIR, { connectionId, path }),
    rename: (connectionId: string, oldPath: string, newPath: string) => 
      ipcRenderer.invoke(IPC_CHANNELS.SFTP.RENAME, { connectionId, oldPath, newPath }),
    chmod: (connectionId: string, path: string, mode: string | number) => 
      ipcRenderer.invoke(IPC_CHANNELS.SFTP.CHMOD, { connectionId, path, mode }),
    getCwd: (connectionId: string) => 
      ipcRenderer.invoke(IPC_CHANNELS.SFTP.GET_CWD, { connectionId }),
  },
  localFs: {
    getHome: () => ipcRenderer.invoke(IPC_CHANNELS.LOCAL_FS.GET_HOME),
    list: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.LOCAL_FS.LIST, { path }),
    delete: (path: string, isDir: boolean) => ipcRenderer.invoke(IPC_CHANNELS.LOCAL_FS.DELETE, { path, isDir }),
    mkdir: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.LOCAL_FS.MKDIR, { path }),
    rename: (oldPath: string, newPath: string) => ipcRenderer.invoke(IPC_CHANNELS.LOCAL_FS.RENAME, { oldPath, newPath }),
    chmod: (path: string, mode: string | number) => ipcRenderer.invoke(IPC_CHANNELS.LOCAL_FS.CHMOD, { path, mode }),
    openPath: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.LOCAL_FS.OPEN, { path }),
    startDrag: (path: string) => ipcRenderer.send(IPC_CHANNELS.LOCAL_FS.START_DRAG, { path }),
    getTempDir: () => ipcRenderer.invoke(IPC_CHANNELS.LOCAL_FS.GET_TEMP_DIR),
  }
})
