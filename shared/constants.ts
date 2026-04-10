export const IPC_CHANNELS = {
  SSH: {
    CONNECT: 'ssh:connect',
    DISCONNECT: 'ssh:disconnect',
    DATA: 'ssh:data',
    RESIZE: 'ssh:resize',
    ERROR: 'ssh:error',
    STATUS: 'ssh:status',
    GENERATE_KEY: 'ssh:generate-key',
  },
  SFTP: {
    CONNECT: 'sftp:connect',
    DISCONNECT: 'sftp:disconnect',
    LIST: 'sftp:list',
    DOWNLOAD: 'sftp:download',
    UPLOAD: 'sftp:upload',
    DELETE: 'sftp:delete',
    MKDIR: 'sftp:mkdir',
    RENAME: 'sftp:rename',
    CHMOD: 'sftp:chmod',
    GET_CWD: 'sftp:get-cwd',
  },
  LOCAL_FS: {
    LIST: 'local:list',
    DELETE: 'local:delete',
    MKDIR: 'local:mkdir',
    RENAME: 'local:rename',
    CHMOD: 'local:chmod',
    GET_HOME: 'local:get-home',
    OPEN: 'local:open',
    START_DRAG: 'local:start-drag',
    GET_TEMP_DIR: 'local:get-temp-dir',
  },
  APP: {
    GET_VERSION: 'app:get-version',
    CHECK_FOR_UPDATES: 'app:check-for-updates',
    DOWNLOAD_UPDATE: 'app:download-update',
    INSTALL_UPDATE: 'app:install-update',
    UPDATE_STATUS: 'app:update-status',
  }
} as const;

export type SSHStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
