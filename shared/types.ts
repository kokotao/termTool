export type AuthType = 'password' | 'privateKey' | 'agent';

export interface SSHConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authType: AuthType;
  password?: string; // Encrypted
  privateKeyPath?: string;
  passphrase?: string; // Encrypted
  groupId?: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  lastConnected?: number;
}

export interface ConnectionGroup {
  id: string;
  name: string;
  parentId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface FileEntry {
  name: string;
  type: 'd' | '-' | 'l'; // directory, file, link
  size: number;
  modifyTime: number;
  permissions?: string;
  path: string; // Full path
}

export interface FileTransfer {
  id: string;
  name: string;
  type: 'upload' | 'download';
  status: 'pending' | 'transferring' | 'completed' | 'error';
  progress: number;
  size: number;
  transferred: number;
  localPath: string;
  remotePath: string;
  error?: string;
}

export interface TerminalTheme {
  background: string;
  foreground: string;
  cursor: string;
  selectionBackground: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
}

export interface UIThemeTokens {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
}

export interface AppTheme {
  id: string;
  name: string;
  type: 'dark' | 'light';
  ui: UIThemeTokens;
  terminal: TerminalTheme;
}

export interface AppConfig {
  themeMode: 'light' | 'dark' | 'system';
  currentThemeId: string;
  customThemes: AppTheme[];
  fontSize: number;
  fontFamily: string;
}

export interface CloudSyncConfig {
  enabled: boolean;
  lastSyncTime: number;
  autoSync: boolean;
  syncInterval: number;
}

export interface SyncStatus {
  syncing: boolean;
  lastSyncTime: number | null;
  error: string | null;
}

export interface CloudUser {
  id: string;
  username: string;
  email?: string;
  createdAt: number;
}

export interface CloudAuthResponse {
  user: CloudUser;
  token: string;
}

export interface CloudSyncData {
  userId: string;
  config?: AppConfig;
  connections?: SSHConnection[];
  groups?: ConnectionGroup[];
  lastModified: number;
}

export interface SyncConflict {
  type: 'config' | 'connection' | 'group';
  localData: any;
  remoteData: any;
  timestamp: number;
}
