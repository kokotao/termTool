/**
 * 作者：albert_luo
 * 文件作用：Electron 主进程 SSH 服务（建立连接、转发数据、处理窗口尺寸变更）
 */
import { NodeSSH } from 'node-ssh';
import { BrowserWindow, ipcMain, dialog } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants';
import { SSHConnection } from '../../shared/types';
import CryptoJS from 'crypto-js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';

const execAsync = promisify(exec);

const SECRET_KEY = 'termtool-secure-key-placeholder';

function decrypt(cipherText: string): string {
  if (!cipherText) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption failed:', error);
    return cipherText;
  }
}

interface SSHSession {
  client: NodeSSH;
  stream: any;
  connectionId: string;
}

const sessions: Map<string, SSHSession> = new Map();
let activeMainWindow: BrowserWindow | null = null;
let isSSHServiceInitialized = false;

const sendToRenderer = (channel: string, payload: unknown) => {
  if (!activeMainWindow || activeMainWindow.isDestroyed() || activeMainWindow.webContents.isDestroyed()) {
    return;
  }
  activeMainWindow.webContents.send(channel, payload);
};

export const setupSSHService = (mainWindow: BrowserWindow) => {
  activeMainWindow = mainWindow;
  mainWindow.on('closed', () => {
    if (activeMainWindow === mainWindow) {
      activeMainWindow = null;
    }
  });

  if (isSSHServiceInitialized) {
    return;
  }
  isSSHServiceInitialized = true;

  // 连接请求：从渲染进程接收配置，建立 SSH 并创建交互式 Shell
  ipcMain.handle(
    IPC_CHANNELS.SSH.CONNECT,
    async (
      _,
      {
        connectionId,
        config,
        pty,
      }: { connectionId: string; config: SSHConnection; pty?: { rows: number; cols: number } }
    ) => {
    try {
      const client = new NodeSSH();
      
      // 主动推送连接状态，便于前端更新 UI
      sendToRenderer(IPC_CHANNELS.SSH.STATUS, { connectionId, status: 'connecting' });

      await client.connect({
        host: config.host,
        port: config.port,
        username: config.username,
        // 密码在 Store 内可能已加密，这里统一解密后再交给 node-ssh
        password: decrypt(config.password || ''),
        tryKeyboard: true,
        readyTimeout: 20000,
        keepaliveInterval: 10000,
        // privateKey: config.privateKeyPath // TODO: Handle private key auth
      });

      // Get initial Home Directory
      let homeDir = '';
      try {
        const result = await client.execCommand('pwd');
        homeDir = result.stdout.trim();
      } catch (e) {
        console.warn('Failed to fetch home dir:', e);
      }

      const rows = Math.max(pty?.rows ?? 24, 5);
      const cols = Math.max(pty?.cols ?? 80, 10);
      const shell = await client.requestShell({ term: 'xterm-256color', rows, cols });

      // SSH 会话可用：推送 connected，让前端状态灯显示绿色
      sendToRenderer(IPC_CHANNELS.SSH.STATUS, { connectionId, status: 'connected' });
      
      const session: SSHSession = {
        client,
        stream: shell,
        connectionId
      };
      
      sessions.set(connectionId, session);

      // Handle incoming data from SSH stream
      shell.on('data', (data: Buffer) => {
        sendToRenderer(IPC_CHANNELS.SSH.DATA, { 
          connectionId, 
          data: data.toString('utf-8') 
        });
      });

      shell.on('close', () => {
        sendToRenderer(IPC_CHANNELS.SSH.STATUS, { connectionId, status: 'disconnected' });
        sessions.delete(connectionId);
      });

      shell.stderr?.on('data', (data: Buffer) => {
          sendToRenderer(IPC_CHANNELS.SSH.DATA, { 
            connectionId, 
            data: data.toString('utf-8') 
          });
        });

      return { success: true, homeDir };

    } catch (error: any) {
      console.error('SSH Connection Error:', error);
      sendToRenderer(IPC_CHANNELS.SSH.STATUS, { connectionId, status: 'error' });
      return { success: false, error: error.message };
    }
  }
);

  // Handle data from frontend (user input)
  ipcMain.on(IPC_CHANNELS.SSH.DATA, (_, { connectionId, data }: { connectionId: string, data: string }) => {
    const session = sessions.get(connectionId);
    if (session && session.stream) {
      session.stream.write(data);
    }
  });

  // Handle resize
  ipcMain.on(IPC_CHANNELS.SSH.RESIZE, (_, { connectionId, rows, cols }: { connectionId: string, rows: number, cols: number }) => {
    const session = sessions.get(connectionId);
    if (session && session.stream) {
      session.stream.setWindow(rows, cols, 0, 0);
    }
  });

  // Handle disconnect
  ipcMain.handle(IPC_CHANNELS.SSH.DISCONNECT, async (_, { connectionId }) => {
    const session = sessions.get(connectionId);
    if (session) {
      session.client.dispose();
      sessions.delete(connectionId);
      return true;
    }
    return false;
  });

  // Generate Key
  ipcMain.handle(IPC_CHANNELS.SSH.GENERATE_KEY, async (_, { type, bits, comment }) => {
    try {
      const dialogParent = activeMainWindow && !activeMainWindow.isDestroyed() ? activeMainWindow : undefined;
      const { filePath } = await dialog.showSaveDialog(dialogParent, {
        title: 'Save Private Key',
        defaultPath: `id_${type.toLowerCase()}`,
      });

      if (!filePath) return { success: false, error: 'Cancelled' };

      const commentArg = comment ? `-C "${comment}"` : '';
      const bitsArg = bits ? `-b ${bits}` : '';
      // -N "" for empty passphrase, -f path
      const cmd = `ssh-keygen -t ${type} ${bitsArg} ${commentArg} -f "${filePath}" -N ""`;

      await execAsync(cmd);
      
      const publicKey = await fs.readFile(`${filePath}.pub`, 'utf-8');
      
      return { success: true, privateKeyPath: filePath, publicKey };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
};
