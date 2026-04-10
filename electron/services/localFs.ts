import { ipcMain, shell, nativeImage } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { IPC_CHANNELS } from '../../shared/constants';
import { FileEntry } from '../../shared/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let isLocalFsServiceInitialized = false;

export const setupLocalFsService = () => {
  if (isLocalFsServiceInitialized) {
    return;
  }
  isLocalFsServiceInitialized = true;

  ipcMain.handle(IPC_CHANNELS.LOCAL_FS.GET_HOME, () => {
    return os.homedir();
  });

  ipcMain.handle(IPC_CHANNELS.LOCAL_FS.LIST, async (_, { path: dirPath }) => {
    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      
      const files: Promise<FileEntry>[] = items.map(async (item) => {
        try {
          const fullPath = path.join(dirPath, item.name);
          const stats = await fs.stat(fullPath);
          return {
            name: item.name,
            type: item.isDirectory() ? 'd' : (item.isSymbolicLink() ? 'l' : '-'),
            size: stats.size,
            modifyTime: stats.mtimeMs,
            path: fullPath
          };
        } catch (e) {
          return null as any;
        }
      });

      const resolvedFiles = (await Promise.all(files)).filter(Boolean);

      resolvedFiles.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'd' ? -1 : 1;
      });

      return { success: true, files: resolvedFiles };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Delete Local File/Dir
  ipcMain.handle(IPC_CHANNELS.LOCAL_FS.DELETE, async (_, { path: targetPath, isDir }) => {
    try {
      await fs.rm(targetPath, { recursive: isDir, force: true });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Mkdir
  ipcMain.handle(IPC_CHANNELS.LOCAL_FS.MKDIR, async (_, { path: dirPath }) => {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Rename
  ipcMain.handle(IPC_CHANNELS.LOCAL_FS.RENAME, async (_, { oldPath, newPath }) => {
    try {
      await fs.rename(oldPath, newPath);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Chmod
  ipcMain.handle(IPC_CHANNELS.LOCAL_FS.CHMOD, async (_, { path: targetPath, mode }) => {
    try {
      await fs.chmod(targetPath, mode);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Open Path
  ipcMain.handle(IPC_CHANNELS.LOCAL_FS.OPEN, async (_, { path: targetPath }) => {
    try {
      const error = await shell.openPath(targetPath);
      if (error) {
        return { success: false, error };
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Get Temp Dir
  ipcMain.handle(IPC_CHANNELS.LOCAL_FS.GET_TEMP_DIR, () => {
    return { success: true, path: os.tmpdir() };
  });

  // Start Drag (Download)
  ipcMain.on(IPC_CHANNELS.LOCAL_FS.START_DRAG, async (event, { path: filePath }) => {
    try {
        // Use a safe, in-memory transparent icon to prevent crashes
        // This avoids dependency on external files or file types
        const icon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==');
        
        event.sender.startDrag({
          file: filePath,
          icon: icon
        });
    } catch (e) {
        console.error('Failed to start drag:', e);
    }
  });
};
