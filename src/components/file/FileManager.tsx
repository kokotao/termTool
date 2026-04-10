import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useFileStore, initialPanelState } from '@/store/fileStore';
import { useConnectionStore } from '@/store/connectionStore';
import { FileSessionView } from './FileSessionView';
import { TransferQueue } from './TransferQueue';
import { X, Plus, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/ContextMenu";

export function FileManager() {
  const { t } = useTranslation();
  const { sessions, activeSessionId, setActiveSession, removeSession, addSession } = useFileStore();
  const { connections } = useConnectionStore();

  const handleQuickConnect = (connectionId: string) => {
    if (!connectionId) return;
    const conn = connections.find(c => c.id === connectionId);
    if (conn) {
      addSession({
        id: uuidv4(),
        connectionId: conn.id,
        name: conn.name,
        local: { ...initialPanelState },
        remote: { ...initialPanelState }
      });
    }
  };

  const handleNewLocalSession = () => {
    addSession({
      id: uuidv4(),
      connectionId: null,
      name: t('file.local'),
      local: { ...initialPanelState },
      remote: { ...initialPanelState }
    });
  };

  if (sessions.length === 0) {
    return (
      <div className="h-full flex flex-col p-4 gap-4">
        <h2 className="text-lg font-medium">{t('sidebar.files')}</h2>
        <div className="flex-1 flex items-center justify-center border rounded-lg bg-muted/10">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">{t('file.selectConnection')}</p>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {connections.map(conn => (
                <button
                  key={conn.id}
                  onClick={() => handleQuickConnect(conn.id)}
                  className="px-4 py-2 bg-card border rounded hover:border-primary transition-colors flex items-center gap-2"
                >
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  {conn.name}
                </button>
              ))}
              <button
                 onClick={handleNewLocalSession}
                 className="px-4 py-2 bg-secondary text-secondary-foreground border rounded hover:bg-secondary/90 transition-colors flex items-center gap-2"
               >
                 <FolderOpen className="w-4 h-4" />
                 {t('file.localOnly') || 'Local Files'}
               </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <div className="flex items-center bg-muted/50 border-b justify-between">
        <div className="flex items-center overflow-x-auto flex-1 scrollbar-hide">
        {sessions.map((session) => (
          <ContextMenu key={session.id}>
            <ContextMenuTrigger asChild>
              <div
                onClick={() => setActiveSession(session.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm cursor-pointer border-r min-w-[150px] max-w-[200px] group select-none",
                  session.id === activeSessionId 
                    ? "bg-background text-foreground font-medium" 
                    : "hover:bg-accent/50 text-muted-foreground"
                )}
              >
                <div className={`w-2 h-2 rounded-full ${session.connectionId ? 'bg-green-500' : 'bg-blue-500'}`} />
                <span className="truncate flex-1">{session.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSession(session.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-muted rounded"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem 
                onClick={() => removeSession(session.id)}
                className="text-destructive focus:text-destructive"
              >
                <X className="mr-2 h-4 w-4" />
                {t('common.close')}
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        ))}
        </div>
        
        <div className="flex items-center px-2 border-l h-full gap-1 bg-background/50">
            <div className="relative">
                <select 
                    className="h-8 w-8 opacity-0 absolute inset-0 cursor-pointer z-10"
                    onChange={(e) => {
                        handleQuickConnect(e.target.value);
                        e.target.value = '';
                    }}
                    value=""
                >
                    <option value="" disabled>New Connection...</option>
                    {connections.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="New Connection">
                    <Plus className="h-4 w-4" />
                </Button>
            </div>
        </div>
      </div>

      {/* File Sessions Content */}
      <div className="flex-1 overflow-hidden relative">
          {sessions.map((session) => (
            <div 
              key={session.id} 
              className={session.id === activeSessionId ? 'h-full w-full' : 'hidden'}
            >
              <FileSessionView sessionId={session.id} />
            </div>
          ))}
      </div>
      
      <TransferQueue />
    </div>
  );
}
