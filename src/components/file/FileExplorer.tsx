import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FileEntry } from '@shared/types';
import { Folder, FileText, Loader2, ArrowUp, RefreshCw, Upload, Download, FolderPlus, Pencil, Trash2, Shield, Search, Image, Code, FileVideo, FileAudio, FileArchive, File as FileIcon, Copy, ExternalLink } from 'lucide-react';
import { toast } from "sonner";
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/ContextMenu";

interface FileExplorerProps {
  type: 'local' | 'remote';
  path: string;
  files: FileEntry[];
  loading: boolean;
  error: string | null;
  onNavigate: (path: string) => void;
  onRefresh: () => void;
  onSelect?: (files: FileEntry[]) => void;
  onTransfer?: (file: FileEntry) => void;
  onCreateFolder?: () => void;
  onRename?: (file: FileEntry) => void;
  onDelete?: (file: FileEntry) => void;
  onChmod?: (file: FileEntry) => void;
  onOpen?: (file: FileEntry) => void;
  onDropFiles?: (files: string[]) => void;
  onDropInternal?: (file: any) => void;
  onFileDragStart?: (file: FileEntry, e: React.DragEvent) => void;
}

export function FileExplorer({
  type,
  path: currentPath,
  files,
  loading,
  error,
  onNavigate,
  onRefresh,
  onTransfer,
  onCreateFolder,
  onRename,
  onDelete,
  onChmod,
  onOpen,
  onDropFiles,
  onDropInternal,
  onFileDragStart
}: FileExplorerProps) {
  const { t } = useTranslation();
  const [pathInput, setPathInput] = useState(currentPath || '/');
  const [filter, setFilter] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  useEffect(() => {
    setPathInput(currentPath || '/');
  }, [currentPath]);

  const filteredFiles = useMemo(() => {
    if (!filter) return files;
    return files.filter(f => f.name.toLowerCase().includes(filter.toLowerCase()));
  }, [files, filter]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
       onNavigate(pathInput);
    }
  };

  const getFileIcon = (file: FileEntry) => {
    if (file.type === 'd') return <Folder className="h-4 w-4 text-yellow-500 fill-yellow-500/20" />;
    const ext = file.name.split('.').pop()?.toLowerCase();
    switch(ext) {
        case 'png': case 'jpg': case 'jpeg': case 'gif': case 'svg':
            return <Image className="h-4 w-4 text-purple-500" />;
        case 'js': case 'ts': case 'tsx': case 'jsx': case 'json': case 'html': case 'css':
            return <Code className="h-4 w-4 text-blue-500" />;
        case 'mp4': case 'mov':
            return <FileVideo className="h-4 w-4 text-red-500" />;
        case 'mp3': case 'wav':
            return <FileAudio className="h-4 w-4 text-pink-500" />;
        case 'zip': case 'tar': case 'gz': case 'rar':
            return <FileArchive className="h-4 w-4 text-orange-500" />;
        default:
            return <FileIcon className="h-4 w-4 text-gray-400" />;
    }
  };
  
  const getFileType = (file: FileEntry) => {
    if (file.type === 'd') return t('file.folder');
    const ext = file.name.split('.').pop()?.toUpperCase();
    return ext ? `${ext} File` : t('file.unknown');
  };

  const handleNavigateUp = () => {
    if (!currentPath || currentPath === '/') return;
    const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
    onNavigate(parentPath);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (ms: number) => {
    return new Date(ms).toLocaleString();
  };

  const handleCopyPath = (file: FileEntry) => {
    navigator.clipboard.writeText(file.path);
    toast.success(t('file.pathCopied'));
  };

  const handleOpenWith = async (file: FileEntry) => {
    // If it's a remote file, we need to handle it differently (likely download temp then open)
    // For now, this is mainly for local files as per context menu condition
    if (type === 'local' && window.electronAPI?.localFs) {
         try {
             // Use shell.openPath or similar via main process
             await window.electronAPI.localFs.openPath(file.path);
         } catch (e) {
             console.error('Failed to open file:', e);
         }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingOver) setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    // Handle internal drag (Panel to Panel)
    const internalData = e.dataTransfer.getData('application/termtool-file');
    if (internalData) {
        try {
            const fileData = JSON.parse(internalData);
            // If dropping on the same panel type, ignore (or move/copy if supported)
            // But here we rely on parent to handle transfer
            // We pass the parsed data to parent via a new callback or reuse existing
            // Since props are specific (onDropFiles is for paths), let's add onDropInternal
            if (onDropInternal) onDropInternal(fileData);
            return;
        } catch (e) {
            console.error('Failed to parse internal drag data', e);
        }
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        // Electron adds 'path' property to File object
        const paths = Array.from(e.dataTransfer.files).map((f: any) => f.path);
        if (onDropFiles && paths.length > 0) {
            onDropFiles(paths);
        }
    }
  };

  const getPathFontSize = (path: string) => {
    const length = path.length;
    if (length > 60) return 'text-[10px]';
    if (length > 40) return 'text-xs';
    return 'text-sm';
  };

  return (
    <div 
      className={cn(
        "flex flex-col h-full border rounded-md bg-card transition-colors",
        isDraggingOver && "border-primary ring-2 ring-primary/20 bg-accent/50"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="p-2 border-b flex items-center gap-2 bg-muted/30">
        <div className="font-medium text-sm px-2 min-w-[60px] shrink-0">
          {type === 'local' ? t('file.local') : t('file.remote')}
        </div>
        
        {/* Path Input - Flexible width */}
        <Input
          value={pathInput}
          onChange={(e) => setPathInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className={cn(
            "flex-1 h-8 font-mono bg-background min-w-[100px] transition-all",
            getPathFontSize(pathInput)
          )}
        />

        {/* Right side controls - Auto layout */}
        <div className="flex items-center gap-1 shrink-0 ml-auto">
             <div className="w-40 relative hidden sm:block">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input 
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      className="h-8 pl-7 text-xs"
                      placeholder={t('common.search')}
                  />
             </div>
             
             <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleNavigateUp} disabled={!currentPath || currentPath === '/'}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onRefresh} disabled={loading} title={t('common.refresh')}>
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                </Button>
                {onCreateFolder && (
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onCreateFolder} disabled={loading} title={t('file.newFolder')}>
                    <FolderPlus className="h-4 w-4" />
                  </Button>
                )}
             </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 text-sm text-destructive bg-destructive/10 border-b">
          {error}
        </div>
      )}

      {/* File List */}
      <div className="flex-1 overflow-auto h-full block">
          <div className="flex-1 overflow-auto">
            {loading && files.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            {t('common.loading')}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0 z-10">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="p-2 font-medium">{t('file.name')}</th>
                <th className="p-2 font-medium w-24">{t('file.type')}</th>
                <th className="p-2 font-medium w-24">{t('file.size')}</th>
                <th className="p-2 font-medium w-36">{t('file.date')}</th>
                <th className="p-2 font-medium w-20 text-right pr-4">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredFiles.map((file) => (
                <ContextMenu key={file.name}>
                  <ContextMenuTrigger asChild>
                    <tr 
                      className="hover:bg-accent/50 cursor-pointer group border-b border-border/50 last:border-0"
                      draggable
                      onDragStart={(e) => {
                          if (onFileDragStart) onFileDragStart(file, e);
                      }}
                      onDoubleClick={() => {
                        if (file.type === 'd') {
                          onNavigate(file.path);
                          setFilter('');
                        } else if (onOpen) {
                          onOpen(file);
                        }
                      }}
                    >
                      <td className="p-2 flex items-center gap-2">
                        {getFileIcon(file)}
                        <span className="truncate max-w-[200px]" title={file.name}>{file.name}</span>
                      </td>
                      <td className="p-2 text-muted-foreground text-xs">{getFileType(file)}</td>
                      <td className="p-2 text-muted-foreground font-mono text-xs">{file.type === 'd' ? '-' : formatSize(file.size)}</td>
                      <td className="p-2 text-muted-foreground text-xs">{formatDate(file.modifyTime)}</td>
                      <td className="p-2 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {file.type !== 'd' && onTransfer && (
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              onTransfer(file);
                            }}
                            title={type === 'local' ? t('transfer.upload') : t('transfer.download')}
                          >
                            {type === 'local' ? <Upload className="h-3 w-3" /> : <Download className="h-3 w-3" />}
                          </Button>
                        )}
                        {onRename && (
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onRename(file); }} title={t('common.rename')}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                        {onChmod && (
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onChmod(file); }} title={t('common.permissions')}>
                            <Shield className="h-3 w-3" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(file); }} title={t('common.delete')}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    {file.type !== 'd' && onTransfer && (
                      <ContextMenuItem onClick={() => onTransfer(file)}>
                        {type === 'local' ? <Upload className="mr-2 h-4 w-4" /> : <Download className="mr-2 h-4 w-4" />}
                        {type === 'local' ? t('transfer.upload') : t('transfer.download')}
                      </ContextMenuItem>
                    )}
                    {onRename && (
                      <ContextMenuItem onClick={() => onRename(file)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        {t('common.rename')}
                      </ContextMenuItem>
                    )}
                    {onChmod && (
                      <ContextMenuItem onClick={() => onChmod(file)}>
                        <Shield className="mr-2 h-4 w-4" />
                        {t('common.permissions')}
                      </ContextMenuItem>
                    )}
                    <ContextMenuItem onClick={() => handleCopyPath(file)}>
                      <Copy className="mr-2 h-4 w-4" />
                      {t('file.copyPath')}
                    </ContextMenuItem>
                    {file.type !== 'd' && (
                      <ContextMenuItem onClick={() => {
                        if (type === 'local') {
                           handleOpenWith(file);
                        } else if (onOpen) {
                           onOpen(file);
                        }
                      }}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        {t('file.openWith')}
                      </ContextMenuItem>
                    )}
                    <ContextMenuSeparator />
                    {onDelete && (
                      <ContextMenuItem 
                        className="text-destructive focus:text-destructive" 
                        onClick={() => onDelete(file)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t('common.delete')}
                      </ContextMenuItem>
                    )}
                  </ContextMenuContent>
                </ContextMenu>
              ))}
              {files.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted-foreground">
                    {t('file.empty')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      </div>
    </div>
  );
}
