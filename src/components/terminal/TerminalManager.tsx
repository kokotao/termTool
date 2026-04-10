import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useTerminalStore } from '@/store/terminalStore';
import { useConnectionStore } from '@/store/connectionStore';
import { useHistoryStore } from '@/store/historyStore';
import { useFileStore, initialPanelState } from '@/store/fileStore';
import { TerminalView } from './TerminalView';
import { X, History, Play, Trash2, Copy, Plus, FolderInput } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/ContextMenu";

export function TerminalManager() {
  const { t } = useTranslation();
  const { sessions, activeSessionId, setActiveSession, removeSession, addSession } = useTerminalStore();
  const { connections } = useConnectionStore();
  const { history, clearHistory, removeEntry } = useHistoryStore();
  const { addSession: addFileSession } = useFileStore();
  
  const [showHistory, setShowHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? sessions[0];
  const activeConnection = activeSession
    ? connections.find((c) => c.id === activeSession.connectionId)
    : undefined;

  const handleQuickConnect = (connectionId: string) => {
    if (!connectionId) return;
    const conn = connections.find(c => c.id === connectionId);
    if (conn) {
      addSession({
        id: uuidv4(),
        connectionId: conn.id,
        title: conn.name,
        status: 'disconnected'
      });
    }
  };

  const handleExecuteHistory = (command: string) => {
    if (!activeSessionId) return;
    window.electronAPI?.ssh.sendData(activeSessionId, command + '\r');
    setShowHistory(false);
  };

  const filteredHistory = history.filter(h => 
    activeConnection && h.connectionId === activeConnection.id &&
    h.command.toLowerCase().includes(historySearch.toLowerCase())
  );

  if (sessions.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 gap-8">
        <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">{t('terminal.startSession')}</h2>
            <p className="text-muted-foreground">{t('terminal.selectToConnect')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl overflow-y-auto max-h-[60vh] p-1">
            {connections.map(conn => (
                <button
                    key={conn.id}
                    onClick={() => handleQuickConnect(conn.id)}
                    className="flex flex-col items-start p-4 border rounded-xl hover:bg-accent/50 transition-all text-left group bg-card"
                >
                    <div className="flex items-center gap-2 mb-2 w-full">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="font-semibold truncate flex-1">{conn.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono truncate w-full">
                        {conn.username}@{conn.host}
                    </div>
                </button>
            ))}
             <button
                onClick={() => {
                    window.dispatchEvent(new CustomEvent('navigate', { detail: 'connections' }));
                }}
                className="flex flex-col items-center justify-center p-4 border border-dashed rounded-xl hover:bg-accent/50 transition-all text-muted-foreground hover:text-primary gap-2 min-h-[88px]"
            >
                <Plus className="h-6 w-6" />
                <span className="font-medium">{t('connection.new')}</span>
            </button>
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
                <div className={`w-2 h-2 rounded-full ${
                  session.status === 'connected' ? 'bg-green-500' : 
                  session.status === 'connecting' ? 'bg-yellow-500' : 
                  session.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
                }`} />
                <span className="truncate flex-1">{session.title}</span>
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
              <ContextMenuItem onClick={() => {
                navigator.clipboard.writeText(session.title);
              }}>
                <Copy className="mr-2 h-4 w-4" />
                {t('common.copy')}
              </ContextMenuItem>
              <ContextMenuItem onClick={() => {
                const conn = connections.find(c => c.id === session.connectionId);
                if (conn) {
                  // Use tracked CWD if available
                  const currentCwd = session.cwd;
                  
                  addFileSession({
                    id: uuidv4(),
                    connectionId: conn.id,
                    name: conn.name,
                    local: { ...initialPanelState },
                    remote: { ...initialPanelState, path: currentCwd || '' }
                  });
                  window.dispatchEvent(new CustomEvent('navigate', { detail: 'files' }));
                }
              }}>
                <FolderInput className="mr-2 h-4 w-4" />
                {t('file.openSFTP') || 'Open SFTP'}
              </ContextMenuItem>
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
             <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setShowHistory(true)}
                title="Command History"
            >
                <History className="h-4 w-4" />
            </Button>
            
            <div className="relative">
                <select 
                    className="h-8 w-8 opacity-0 absolute inset-0 cursor-pointer z-10"
                    onChange={(e) => {
                        handleQuickConnect(e.target.value);
                        e.target.value = '';
                    }}
                    value=""
                >
                    <option value="" disabled>Quick Connect...</option>
                    {connections.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Quick Connect">
                    <Plus className="h-4 w-4" />
                </Button>
            </div>
        </div>
      </div>

      {/* Terminal Content */}
      <div className="flex-1 overflow-hidden relative">
        {sessions.length > 0 ? (
          sessions.map((session) => {
            const connection = connections.find((c) => c.id === session.connectionId);
            if (!connection) return null;
            return (
              <div 
                key={session.id} 
                className={session.id === activeSessionId ? 'h-full w-full' : 'hidden'}
              >
                <TerminalView
                  sessionId={session.id}
                  connection={connection}
                  isActive={session.id === activeSessionId}
                />
              </div>
            );
          })
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            {t('terminal.noActiveSession')}
          </div>
        )}
      </div>
      <Dialog
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        title="Command History"
      >
        <div className="space-y-4 pt-4 max-h-[60vh] flex flex-col">
          <div className="flex gap-2">
            <input
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Search history..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
            />
            <Button variant="outline" onClick={clearHistory} title="Clear History">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-auto border rounded-md divide-y">
            {filteredHistory.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                No history found
              </div>
            ) : (
              filteredHistory.slice().reverse().map((entry) => (
                <div key={entry.id} className="p-2 flex items-center justify-between hover:bg-accent/50 group">
                  <div className="font-mono text-sm truncate flex-1 mr-2" title={entry.command}>
                    {entry.command}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => handleExecuteHistory(entry.command)}
                      title="Execute"
                    >
                      <Play className="h-3 w-3 text-green-500" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => removeEntry(entry.id)}
                      title="Remove"
                    >
                      <X className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Dialog>
    </div>
  );
}
