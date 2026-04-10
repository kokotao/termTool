import { useEffect, useState } from 'react';
import { useFileStore } from '@/store/fileStore';
import { useConnectionStore } from '@/store/connectionStore';
import { useTransferStore } from '@/store/transferStore';
import { FileExplorer } from './FileExplorer';
import { SSHConnection, FileEntry } from '@shared/types';
import { useTranslation } from 'react-i18next';
import { ArrowRightLeft } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

interface FileSessionViewProps {
  sessionId: string;
}

export function FileSessionView({ sessionId }: FileSessionViewProps) {
  const { t } = useTranslation();
  const { connections } = useConnectionStore();
  const {
    sessions,
    setLocalPath, setLocalFiles, setLocalLoading, setLocalError,
    setRemotePath, setRemoteFiles, setRemoteLoading, setRemoteError
  } = useFileStore();

  const session = sessions.find(s => s.id === sessionId);

  if (!session) return null;

  const { local, remote, connectionId } = session;
  const { addTransfer, updateTransfer } = useTransferStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'mkdir' | 'rename' | 'delete' | 'chmod' | null>(null);
  const [dialogContext, setDialogContext] = useState<{ type: 'local' | 'remote', file?: FileEntry } | null>(null);
  const [inputValue, setInputValue] = useState('');

  const hasFileApis =
    typeof window !== 'undefined' &&
    !!(window as any).electronAPI?.localFs &&
    !!(window as any).electronAPI?.sftp;

  useEffect(() => {
    if (!hasFileApis) return;
    if (!local.path) {
        loadLocalPath();
    }
  }, [hasFileApis]);

  useEffect(() => {
    if (!hasFileApis || !connectionId) return;
    
    const conn = connections.find(c => c.id === connectionId);
    if (conn) {
        connectAndLoadRemote(conn);
    }
  }, [connectionId, hasFileApis]);

  const loadLocalPath = async (path?: string) => {
    if (!hasFileApis) {
      setLocalError(sessionId, t('common.electronRequired'));
      return;
    }
    setLocalLoading(sessionId, true);
    try {
      const targetPath = path || await window.electronAPI.localFs.getHome();
      setLocalPath(sessionId, targetPath);

      const result = await window.electronAPI.localFs.list(targetPath);
      if (result.success && result.files) {
        setLocalFiles(sessionId, result.files);
      } else {
        setLocalError(sessionId, result.error || 'Failed to list local files');
      }
    } catch (err: any) {
      setLocalError(sessionId, err.message);
    } finally {
      setLocalLoading(sessionId, false);
    }
  };

  const connectAndLoadRemote = async (conn: SSHConnection) => {
    if (!hasFileApis) {
      setRemoteError(sessionId, t('common.electronRequired'));
      return;
    }
    setRemoteLoading(sessionId, true);
    try {
      await window.electronAPI.sftp.connect(conn.id, conn);

      let targetPath = remote.path;
      if (!targetPath) {
        const cwdResult = await window.electronAPI.sftp.getCwd(conn.id);
        targetPath = (cwdResult.success && cwdResult.cwd) ? cwdResult.cwd : '/';
      }

      setRemotePath(sessionId, targetPath);

      const result = await window.electronAPI.sftp.list(conn.id, targetPath);
      if (result.success && result.files) {
        setRemoteFiles(sessionId, result.files);
      } else {
        setRemoteError(sessionId, result.error || 'Failed to list remote files');
      }
    } catch (err: any) {
      setRemoteError(sessionId, err.message);
    } finally {
      setRemoteLoading(sessionId, false);
    }
  };

  const loadRemotePath = async (path: string) => {
    if (!hasFileApis) {
      setRemoteError(sessionId, t('common.electronRequired'));
      return;
    }
    if (!connectionId) return;

    setRemoteLoading(sessionId, true);
    setRemotePath(sessionId, path);
    try {
      const result = await window.electronAPI.sftp.list(connectionId, path);
      if (result.success && result.files) {
        setRemoteFiles(sessionId, result.files);
      } else {
        setRemoteError(sessionId, result.error || 'Failed to list remote files');
      }
    } catch (err: any) {
      setRemoteError(sessionId, err.message);
    } finally {
      setRemoteLoading(sessionId, false);
    }
  };

  const handleOpenLocal = async (file: FileEntry) => {
    if (!hasFileApis) return;
    try {
      await window.electronAPI.localFs.openPath(file.path);
    } catch (err) {
      console.error('Failed to open file:', err);
    }
  };

  const handleOpenRemote = async (file: FileEntry) => {
    if (!hasFileApis || !connectionId) return;
    try {
        // Download to temp directory then open
        const tempPathResult = await window.electronAPI.localFs.getTempDir();
        if (!tempPathResult.success || !tempPathResult.path) {
            toast.error(t('file.tempDirError') || 'Failed to get temp directory');
            return;
        }

        const localTempPath = `${tempPathResult.path}/${file.name}`;
        const toastId = toast.loading(t('file.downloading') || 'Downloading for preview...');
        
        const result = await window.electronAPI.sftp.download(
            connectionId, 
            file.path, 
            localTempPath
        );

        if (result.success) {
            toast.dismiss(toastId);
            await window.electronAPI.localFs.openPath(localTempPath);
        } else {
            toast.error(result.error || 'Failed to download file');
        }
    } catch (err: any) {
        toast.error(err.message);
    }
  };

  const transferFile = async (direction: 'upload' | 'download', file: FileEntry) => {
    if (!hasFileApis) return;
    if (!connectionId) return;

    const transferId = addTransfer({
      name: file.name,
      type: direction,
      size: file.size,
      localPath: direction === 'upload' ? file.path : `${local.path}/${file.name}`,
      remotePath: direction === 'download' ? file.path : `${remote.path}/${file.name}`,
    });

    try {
      updateTransfer(transferId, { status: 'transferring', progress: 0 });

      let result;
      if (direction === 'upload') {
        result = await window.electronAPI.sftp.upload(
          connectionId, 
          file.path, 
          `${remote.path}/${file.name}`
        );
      } else {
        result = await window.electronAPI.sftp.download(
          connectionId, 
          file.path, 
          `${local.path}/${file.name}`
        );
      }

      if (result.success) {
        updateTransfer(transferId, { status: 'completed', progress: 100 });
        if (direction === 'upload') loadRemotePath(remote.path);
        else loadLocalPath(local.path);
      } else {
        updateTransfer(transferId, { status: 'error', error: result.error });
      }
    } catch (err: any) {
      updateTransfer(transferId, { status: 'error', error: err.message });
    }
  };

  const openDialog = (type: 'mkdir' | 'rename' | 'delete' | 'chmod', context: { type: 'local' | 'remote', file?: FileEntry }) => {
    setDialogType(type);
    setDialogContext(context);
    if (type === 'rename' && context.file) {
      setInputValue(context.file.name);
    } else if (type === 'chmod') {
      setInputValue('755');
    } else {
      setInputValue('');
    }
    setDialogOpen(true);
  };

  const handleDialogSubmit = async () => {
    if (!dialogContext || !dialogType) return;
    const { type, file } = dialogContext;
    const isLocal = type === 'local';
    const currentPath = isLocal ? local.path : remote.path;

    if (!isLocal && !connectionId) return;

    try {
      if (dialogType === 'mkdir') {
        const targetPath = currentPath.endsWith('/') ? currentPath + inputValue : currentPath + '/' + inputValue;

        if (isLocal) {
          await window.electronAPI.localFs.mkdir(targetPath);
          loadLocalPath(currentPath);
        } else {
          await window.electronAPI.sftp.mkdir(connectionId!, targetPath);
          loadRemotePath(currentPath);
        }
      } else if (dialogType === 'rename' && file) {
        const oldPath = file.path;
        const newPath = currentPath.endsWith('/') ? currentPath + inputValue : currentPath + '/' + inputValue;

        if (isLocal) {
          await window.electronAPI.localFs.rename(oldPath, newPath);
          loadLocalPath(currentPath);
        } else {
          await window.electronAPI.sftp.rename(connectionId!, oldPath, newPath);
          loadRemotePath(currentPath);
        }
      } else if (dialogType === 'chmod' && file) {
        const mode = parseInt(inputValue, 8);
        if (isLocal) {
          await window.electronAPI.localFs.chmod(file.path, mode);
          loadLocalPath(currentPath);
        } else {
          await window.electronAPI.sftp.chmod(connectionId!, file.path, mode);
          loadRemotePath(currentPath);
        }
      } else if (dialogType === 'delete' && file) {
        if (isLocal) {
          await window.electronAPI.localFs.delete(file.path, file.type === 'd');
          loadLocalPath(currentPath);
        } else {
          await window.electronAPI.sftp.delete(connectionId!, file.path, file.type === 'd');
          loadRemotePath(currentPath);
        }
      }
      setDialogOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleLocalDragStart = (file: FileEntry, e: React.DragEvent) => {
      e.preventDefault();
      if (window.electronAPI?.localFs?.startDrag) {
          window.electronAPI.localFs.startDrag(file.path);
      }
  };

  const handleRemoteDragStart = (file: FileEntry, e: React.DragEvent) => {
      e.dataTransfer.setData('application/termtool-file', JSON.stringify({ ...file, origin: 'remote' }));
  };

  const handleUploadDropped = async (files: string[]) => {
      if (!connectionId) return;
      
      for (const filePath of files) {
          const name = filePath.split(/[/\\]/).pop() || 'unknown';
          const transferId = addTransfer({
              name: name,
              type: 'upload',
              size: 0,
              localPath: filePath,
              remotePath: `${remote.path}/${name}`,
          });
          
          try {
             updateTransfer(transferId, { status: 'transferring', progress: 0 });
             // TODO: Check if directory and handle recursive upload
             const result = await window.electronAPI.sftp.upload(connectionId, filePath, `${remote.path}/${name}`);
             if (result.success) {
                 updateTransfer(transferId, { status: 'completed', progress: 100 });
             } else {
                 updateTransfer(transferId, { status: 'error', error: result.error });
             }
          } catch (e: any) {
             updateTransfer(transferId, { status: 'error', error: e.message });
          }
      }
      loadRemotePath(remote.path);
  };

  const handleLocalDropInternal = async (data: any) => {
      if (data.origin === 'remote') {
          transferFile('download', data);
      }
  };

  return (
    <div className="h-full flex flex-col">
       {/* Panels */}
       <div className="flex-1 flex overflow-hidden">
        {/* Local Panel */}
        <div className="flex-1 overflow-hidden">
          <FileExplorer
            type="local"
            path={local.path}
            files={local.files}
            loading={local.loading}
            error={local.error}
            onNavigate={(path) => loadLocalPath(path)}
            onRefresh={() => loadLocalPath(local.path)}
            onTransfer={(file) => transferFile('upload', file)}
            onCreateFolder={() => openDialog('mkdir', { type: 'local' })}
            onRename={(file) => openDialog('rename', { type: 'local', file })}
            onDelete={(file) => openDialog('delete', { type: 'local', file })}
            onChmod={(file) => openDialog('chmod', { type: 'local', file })}
            onOpen={handleOpenLocal}
            onFileDragStart={handleLocalDragStart}
            onDropInternal={handleLocalDropInternal}
          />
        </div>

        {/* Transfer Status / Queue could go here in middle or separate panel */}
        <div className="w-1 bg-border cursor-col-resize hover:bg-primary/50 transition-colors" />

        {/* Remote Panel */}
        <div className="flex-1 overflow-hidden">
           {connectionId ? (
              <FileExplorer
                type="remote"
                path={remote.path}
                files={remote.files}
                loading={remote.loading}
                error={remote.error}
                onNavigate={(path) => loadRemotePath(path)}
                onRefresh={() => loadRemotePath(remote.path)}
                onTransfer={(file) => transferFile('download', file)}
                onCreateFolder={() => openDialog('mkdir', { type: 'remote' })}
                onRename={(file) => openDialog('rename', { type: 'remote', file })}
                onDelete={(file) => openDialog('delete', { type: 'remote', file })}
                onChmod={(file) => openDialog('chmod', { type: 'remote', file })}
                onOpen={handleOpenRemote}
                onDropFiles={handleUploadDropped}
                onFileDragStart={handleRemoteDragStart}
              />
           ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground bg-muted/10 border rounded-md">
              {t('file.selectConnection')}
            </div>
          )}
        </div>
      </div>

      <Dialog 
        isOpen={dialogOpen} 
        onClose={() => setDialogOpen(false)}
        title={
          dialogType === 'mkdir' ? t('file.newFolder') : 
          dialogType === 'rename' ? t('common.rename') : 
          dialogType === 'chmod' ? t('common.permissions') :
          t('common.delete')
        }
      >
        <div className="space-y-4">
          {dialogType === 'delete' ? (
            <p>
              {t('common.confirmDelete')} <span className="font-semibold">{dialogContext?.file?.name}</span>?
            </p>
          ) : (
            <Input 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={dialogType === 'mkdir' ? t('file.folderName') : t('file.name')}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleDialogSubmit()}
            />
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button 
              variant={dialogType === 'delete' ? 'danger' : 'primary'} 
              onClick={handleDialogSubmit}
            >
              {t('common.confirm')}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
