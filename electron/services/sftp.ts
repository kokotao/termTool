/**
 * 作者：albert_luo
 * 文件作用：Electron 主进程 SFTP 服务（连接管理、目录列表、上传下载、删除）
 */
import Client from 'ssh2-sftp-client';
import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants';
import { SSHConnection, FileEntry } from '../../shared/types';
import path from 'path';
import CryptoJS from 'crypto-js';
import fs from 'node:fs/promises';

const clients: Map<string, any> = new Map();
let isSFTPServiceInitialized = false;

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

export const setupSFTPService = () => {
  if (isSFTPServiceInitialized) {
    return;
  }
  isSFTPServiceInitialized = true;

  // Connect
  ipcMain.handle(IPC_CHANNELS.SFTP.CONNECT, async (_, { connectionId, config }: { connectionId: string, config: SSHConnection }) => {
    try {
      const sftp = new Client();
      const connectOptions: any = {
        host: config.host,
        port: config.port,
        username: config.username,
        readyTimeout: 20000,
        keepaliveInterval: 10000,
      };

      if (config.authType === 'privateKey') {
        if (!config.privateKeyPath) {
          throw new Error('privateKeyPath 不能为空');
        }
        connectOptions.privateKey = await fs.readFile(config.privateKeyPath, 'utf-8');
        if (config.passphrase) {
          connectOptions.passphrase = decrypt(config.passphrase);
        }
      } else if (config.authType === 'agent') {
        connectOptions.agent = process.env.SSH_AUTH_SOCK;
      } else {
        connectOptions.password = decrypt(config.password || '');
      }

      await sftp.connect(connectOptions);
      
      clients.set(connectionId, sftp);
      return { success: true };
    } catch (error: any) {
      console.error('SFTP Connect Error:', error);
      return { success: false, error: error.message };
    }
  });

  // Disconnect
  ipcMain.handle(IPC_CHANNELS.SFTP.DISCONNECT, async (_, { connectionId }) => {
    const sftp = clients.get(connectionId);
    if (sftp) {
      await sftp.end();
      clients.delete(connectionId);
      return true;
    }
    return false;
  });

  // List Files
  ipcMain.handle(IPC_CHANNELS.SFTP.LIST, async (_, { connectionId, path: remotePath }) => {
    const sftp = clients.get(connectionId);
    if (!sftp) return { success: false, error: 'Not connected' };

    try {
      const list = await sftp.list(remotePath);
      const files: FileEntry[] = list.map((item: any) => ({
        name: item.name,
        type: item.type as 'd' | '-' | 'l',
        size: item.size,
        modifyTime: item.modifyTime,
        permissions: item.rights ? `${item.rights.user}${item.rights.group}${item.rights.other}` : undefined,
        path: path.posix.join(remotePath, item.name) // Use posix for remote paths
      }));
      
      // Sort: Directories first, then files
      files.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'd' ? -1 : 1;
      });

      return { success: true, files };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Get CWD
  ipcMain.handle(IPC_CHANNELS.SFTP.GET_CWD, async (_, { connectionId }) => {
    const sftp = clients.get(connectionId);
    if (!sftp) return { success: false, error: 'Not connected' };

    try {
      const cwd = await sftp.cwd();
      return { success: true, cwd };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Upload
  ipcMain.handle(IPC_CHANNELS.SFTP.UPLOAD, async (_, { connectionId, localPath, remotePath }) => {
    const sftp = clients.get(connectionId);
    if (!sftp) return { success: false, error: 'Not connected' };

    try {
      await sftp.put(localPath, remotePath);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Download
  ipcMain.handle(IPC_CHANNELS.SFTP.DOWNLOAD, async (_, { connectionId, remotePath, localPath }) => {
    const sftp = clients.get(connectionId);
    if (!sftp) return { success: false, error: 'Not connected' };

    try {
      await sftp.get(remotePath, localPath);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Delete
  ipcMain.handle(IPC_CHANNELS.SFTP.DELETE, async (_, { connectionId, path: remotePath, isDir }) => {
    const sftp = clients.get(connectionId);
    if (!sftp) return { success: false, error: 'Not connected' };

    try {
      if (isDir) {
        await sftp.rmdir(remotePath, true); // recursive
      } else {
        await sftp.delete(remotePath);
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Mkdir
  ipcMain.handle(IPC_CHANNELS.SFTP.MKDIR, async (_, { connectionId, path: remotePath }) => {
    const sftp = clients.get(connectionId);
    if (!sftp) return { success: false, error: 'Not connected' };

    try {
      await sftp.mkdir(remotePath, true); // recursive
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Rename
  ipcMain.handle(IPC_CHANNELS.SFTP.RENAME, async (_, { connectionId, oldPath, newPath }) => {
    const sftp = clients.get(connectionId);
    if (!sftp) return { success: false, error: 'Not connected' };

    try {
      await sftp.rename(oldPath, newPath);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Chmod
  ipcMain.handle(IPC_CHANNELS.SFTP.CHMOD, async (_, { connectionId, path: remotePath, mode }) => {
    const sftp = clients.get(connectionId);
    if (!sftp) return { success: false, error: 'Not connected' };

    try {
      await sftp.chmod(remotePath, mode);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
};
