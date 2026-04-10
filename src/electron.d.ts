import { SSHConnection, FileEntry } from '@shared/types';

export interface ElectronAPI {
  platform: string;
  ssh: {
    connect: (id: string, config: SSHConnection, pty?: { rows: number; cols: number }) => Promise<{ success: boolean; error?: string; homeDir?: string }>;
    disconnect: (id: string) => Promise<boolean>;
    sendData: (id: string, data: string) => void;
    resize: (id: string, rows: number, cols: number) => void;
    onData: (callback: (event: any, payload: { connectionId: string; data: string }) => void) => () => void;
    onStatus: (callback: (event: any, payload: { connectionId: string; status: string }) => void) => () => void;
    generateKey: (options: { type: 'rsa' | 'ed25519'; bits?: number; comment?: string }) => Promise<{ success: boolean; privateKeyPath?: string; publicKey?: string; error?: string }>;
  };
  sftp: {
    connect: (id: string, config: SSHConnection) => Promise<{ success: boolean; error?: string }>;
    disconnect: (id: string) => Promise<boolean>;
    list: (id: string, path: string) => Promise<{ success: boolean; files?: FileEntry[]; error?: string }>;
    upload: (id: string, local: string, remote: string) => Promise<{ success: boolean; error?: string }>;
    download: (id: string, remote: string, local: string) => Promise<{ success: boolean; error?: string }>;
    delete: (id: string, path: string, isDir: boolean) => Promise<{ success: boolean; error?: string }>;
    mkdir: (id: string, path: string) => Promise<{ success: boolean; error?: string }>;
    rename: (id: string, oldPath: string, newPath: string) => Promise<{ success: boolean; error?: string }>;
    chmod: (id: string, path: string, mode: string | number) => Promise<{ success: boolean; error?: string }>;
    getCwd: (id: string) => Promise<{ success: boolean; cwd?: string; error?: string }>;
  };
  localFs: {
    getHome: () => Promise<string>;
    list: (path: string) => Promise<{ success: boolean; files?: FileEntry[]; error?: string }>;
    delete: (path: string, isDir: boolean) => Promise<{ success: boolean; error?: string }>;
    mkdir: (path: string) => Promise<{ success: boolean; error?: string }>;
    rename: (oldPath: string, newPath: string) => Promise<{ success: boolean; error?: string }>;
    chmod: (path: string, mode: string | number) => Promise<{ success: boolean; error?: string }>;
    openPath: (path: string) => Promise<{ success: boolean; error?: string }>;
    startDrag: (path: string) => void;
    getTempDir: () => Promise<{ success: boolean; path?: string; error?: string }>;
  };
  app: {
    getVersion: () => Promise<string>;
    checkForUpdates: () => Promise<{ success: boolean; error?: string }>;
    downloadUpdate: () => Promise<{ success: boolean; error?: string }>;
    installUpdate: () => Promise<{ success: boolean; error?: string }>;
    onUpdateStatus: (callback: (event: any, payload: { status: string; version?: string; progress?: number; message?: string }) => void) => () => void;
  };
  cloud?: {
    uploadConfig: (token: string, config: any) => Promise<void>;
    downloadConfig: (token: string) => Promise<any>;
    uploadConnections: (token: string, connections: any[]) => Promise<void>;
    downloadConnections: (token: string) => Promise<any[]>;
    uploadGroups: (token: string, groups: any[]) => Promise<void>;
    downloadGroups: (token: string) => Promise<any[]>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
