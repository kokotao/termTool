/**
 * 作者：albert_luo
 * 文件作用：连接管理页面（增删改查、发起连接、加密导出/导入剪切板）
 */
import { useState } from 'react';
import { useConnectionStore } from '@/store/connectionStore';
import { useTerminalStore } from '@/store/terminalStore';
import { useKeyStore } from '@/store/keyStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/ContextMenu";
import { Search, Plus, Server, Trash2, Edit2, Play, Import, Share2, FolderPlus, ChevronRight, ChevronDown, Folder, LayoutList, LayoutGrid } from 'lucide-react';
import { SSHConnection } from '@shared/types';
import { v4 as uuidv4 } from 'uuid';
import { useTranslation } from 'react-i18next';
import { decrypt, encrypt } from '@/lib/security';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function ConnectionList() {
  const { t } = useTranslation();
  const { connections, groups, removeConnection, addConnection, updateConnection, addGroup, removeGroup } = useConnectionStore();
  const { addSession } = useTerminalStore();
  const { keys } = useKeyStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [newGroupName, setNewGroupName] = useState('');

  const [formData, setFormData] = useState<Partial<SSHConnection>>({
    name: '',
    host: '',
    port: 22,
    username: '',
    authType: 'password',
    password: '',
    groupId: undefined,
  });

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const handleAddGroup = () => {
    if (!newGroupName.trim()) return;
    addGroup(newGroupName);
    setNewGroupName('');
    setIsGroupDialogOpen(false);
  };

  const filteredConnections = connections.filter(conn => 
    conn.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conn.host.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = () => {
    if (!formData.name || !formData.host || !formData.username) return;

    if (editingId) {
      updateConnection(editingId, formData);
    } else {
      addConnection(formData as any);
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (conn: SSHConnection) => {
    setEditingId(conn.id);
    setFormData({
      name: conn.name,
      host: conn.host,
      port: conn.port,
      username: conn.username,
      authType: conn.authType,
      groupId: conn.groupId,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: '',
      host: '',
      port: 22,
      username: '',
      authType: 'password',
      password: '',
      groupId: undefined,
    });
  };

  const handleConnect = (conn: SSHConnection) => {
    if (!window.electronAPI?.ssh) {
      toast.error(t('common.electronRequired'));
      return;
    }

    const sessionId = uuidv4();
    addSession({
      id: sessionId,
      connectionId: conn.id,
      title: conn.name,
      status: 'connecting'
    });
    window.dispatchEvent(new CustomEvent('navigate', { detail: 'terminals' }));
  };

  const handleExport = (conn: SSHConnection) => {
    try {
      const plainPassword = conn.password ? decrypt(conn.password) : '';

      const exportData = {
        ...conn,
        password: plainPassword,
        exportedAt: Date.now(),
        app: 'termTool'
      };

      const encryptedData = encrypt(JSON.stringify(exportData));

      navigator.clipboard.writeText(`termtool://${encryptedData}`);
      toast.success(t('connection.exportedToClipboard'));
    } catch (error) {
      console.error('Export failed:', error);
      toast.error(t('connection.exportFailed'));
    }
  };

  const handleImport = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.startsWith('termtool://')) {
        toast.error(t('connection.invalidFormat'));
        return;
      }

      const encryptedData = text.replace('termtool://', '');
      const jsonStr = decrypt(encryptedData);

      if (!jsonStr) {
        toast.error(t('connection.decryptFailed'));
        return;
      }

      const data = JSON.parse(jsonStr);

      if (!data.host || !data.username) {
        toast.error(t('connection.invalidData'));
        return;
      }

      addConnection({
        name: `${data.name} (Imported)`,
        host: data.host,
        port: data.port || 22,
        username: data.username,
        authType: data.authType || 'password',
        password: data.password,
        tags: data.tags || [],
      });

      toast.success(t('connection.importedSuccess'));
    } catch (error) {
      console.error('Import failed:', error);
      toast.error(t('connection.importFailed'));
    }
  };

  const renderConnectionItem = (conn: SSHConnection) => (
    <ContextMenu key={conn.id}>
      <ContextMenuTrigger>
        <div 
          className={cn(
            "group rounded-lg border bg-card hover:border-primary/50 transition-all cursor-pointer relative overflow-hidden",
            viewMode === 'list' 
              ? "flex items-center justify-between p-4" 
              : "flex flex-col p-4 gap-3 h-[140px]"
          )}
          onDoubleClick={() => handleConnect(conn)}
        >
          <div className={cn("flex items-center", viewMode === 'list' ? "gap-4" : "gap-3")}>
            <div className={cn(
              "rounded-full bg-secondary flex items-center justify-center transition-colors group-hover:bg-primary/10",
              viewMode === 'list' ? "h-10 w-10" : "h-12 w-12"
            )}>
              <Server className={cn("text-primary", viewMode === 'list' ? "h-5 w-5" : "h-6 w-6")} />
            </div>
            <div className="min-w-0">
              <h3 className="font-medium truncate pr-4">{conn.name}</h3>
              <p className="text-sm text-muted-foreground truncate">{conn.username}@{conn.host}:{conn.port}</p>
            </div>
          </div>
          
          {viewMode === 'card' && (
            <div className="mt-auto pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex gap-2">
                 <span className="bg-secondary px-2 py-0.5 rounded text-[10px]">{conn.authType}</span>
              </div>
            </div>
          )}

          <div className={cn(
            "flex items-center gap-1 transition-opacity",
            viewMode === 'list' 
              ? "opacity-0 group-hover:opacity-100" 
              : "absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-card/80 backdrop-blur-sm rounded-md p-1 shadow-sm border"
          )}>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              title={t('connection.connect')}
              onClick={(e) => {
                e.stopPropagation();
                handleConnect(conn);
              }}
            >
              <Play className="h-4 w-4 text-green-500" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              title={t('common.edit')}
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(conn);
              }}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => handleConnect(conn)}>
          <Play className="mr-2 h-4 w-4" />
          {t('connection.connect')}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleEdit(conn)}>
          <Edit2 className="mr-2 h-4 w-4" />
          {t('common.edit')}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleExport(conn)}>
          <Share2 className="mr-2 h-4 w-4" />
          {t('connection.exportToClipboard')}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem 
          className="text-destructive focus:text-destructive" 
          onClick={() => removeConnection(conn.id)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {t('common.delete')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('connection.searchPlaceholder')}
            className="w-full h-9 pl-9 pr-4 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 items-center">
           <div className="flex items-center border rounded-md p-0.5 bg-muted/30 mr-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn("h-7 w-7 rounded-sm", viewMode === 'list' && "bg-background shadow-sm")} 
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <LayoutList className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn("h-7 w-7 rounded-sm", viewMode === 'card' && "bg-background shadow-sm")} 
              onClick={() => setViewMode('card')}
              title="Card View"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
          <div className="w-px h-6 bg-border mx-1" />
          <Button onClick={handleImport} variant="outline" size="icon" title={t('connection.importFromClipboard')}>
            <Import className="h-4 w-4" />
          </Button>
          <Button onClick={() => setIsGroupDialogOpen(true)} variant="outline" size="icon" title="New Group">
            <FolderPlus className="h-4 w-4" />
          </Button>
          <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className={cn(
        "flex-1 overflow-auto p-4",
        viewMode === 'list' ? "space-y-2" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-max"
      )}>
        {searchTerm ? (
          filteredConnections.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground col-span-full">
              <Server className="h-12 w-12 mb-4 opacity-50" />
              <p>{t('connection.noConnections')}</p>
            </div>
          ) : (
            filteredConnections.map(conn => renderConnectionItem(conn))
          )
        ) : (
          <>
            {/* Groups */}
            {groups.map(group => {
              const groupConns = connections.filter(c => c.groupId === group.id);
              const isExpanded = expandedGroups.has(group.id);
              
              if (viewMode === 'card') {
                 // In card view, render groups as sections with headers
                 return (
                   <div key={group.id} className="col-span-full space-y-2">
                     <div 
                        className="flex items-center gap-2 p-2 hover:bg-accent rounded cursor-pointer select-none group/header"
                        onClick={() => toggleGroup(group.id)}
                      >
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <Folder className="h-4 w-4 text-blue-400" />
                        <span className="font-medium text-sm flex-1">{group.name}</span>
                        <span className="text-xs text-muted-foreground">{groupConns.length}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 opacity-0 group-hover/header:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(t('common.confirmDelete'))) removeGroup(group.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                      
                      {isExpanded && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pl-4 border-l ml-3">
                          {groupConns.map(conn => renderConnectionItem(conn))}
                          {groupConns.length === 0 && (
                            <div className="col-span-full text-sm text-muted-foreground p-2 italic">No connections in this group</div>
                          )}
                        </div>
                      )}
                   </div>
                 );
              }

              return (
                <div key={group.id} className="space-y-1">
                  <div 
                    className="flex items-center gap-2 p-2 hover:bg-accent rounded cursor-pointer select-none group/header"
                    onClick={() => toggleGroup(group.id)}
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <Folder className="h-4 w-4 text-blue-400" />
                    <span className="font-medium text-sm flex-1">{group.name}</span>
                    <span className="text-xs text-muted-foreground">{groupConns.length}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 opacity-0 group-hover/header:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(t('common.confirmDelete'))) removeGroup(group.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                  {isExpanded && (
                    <div className="pl-4 space-y-2 border-l ml-2">
                      {groupConns.map(conn => renderConnectionItem(conn))}
                      {groupConns.length === 0 && (
                        <div className="text-xs text-muted-foreground p-2">{t('connection.noConnections')}</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Uncategorized */}
            {connections.filter(c => !c.groupId).length > 0 && (
              viewMode === 'card' ? (
                <>
                   {groups.length > 0 && <div className="col-span-full h-px bg-border my-2" />}
                   {connections.filter(c => !c.groupId).map(conn => renderConnectionItem(conn))}
                </>
              ) : (
                 <div className="space-y-2">
                   {groups.length > 0 && <div className="text-xs font-semibold text-muted-foreground mt-4 mb-2 pl-2">Uncategorized</div>}
                   {connections.filter(c => !c.groupId).map(conn => renderConnectionItem(conn))}
                 </div>
              )
            )}
            
            {connections.length === 0 && groups.length === 0 && (
               <div className="flex flex-col items-center justify-center h-full text-muted-foreground col-span-full">
                 <Server className="h-12 w-12 mb-4 opacity-50" />
                 <p>{t('connection.noConnections')}</p>
               </div>
            )}
          </>
        )}
      </div>

      <Dialog 
        isOpen={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)}
        title={editingId ? t('connection.edit') : t('connection.new')}
      >
        <div className="space-y-4 pt-4">
          <Input 
            label={t('connection.form.name')}
            placeholder={t('connection.form.namePlaceholder')}
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
          />
          
          <div className="space-y-1">
            <label className="text-sm font-medium">Group</label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={formData.groupId || ''}
              onChange={(e) => setFormData({...formData, groupId: e.target.value || undefined})}
            >
              <option value="">Uncategorized</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Input 
                label={t('connection.form.host')}
                placeholder={t('connection.form.hostPlaceholder')}
                value={formData.host}
                onChange={(e) => setFormData({...formData, host: e.target.value})}
              />
            </div>
            <Input 
              label={t('connection.form.port')}
              type="number" 
              placeholder="22" 
              value={formData.port}
              onChange={(e) => setFormData({...formData, port: parseInt(e.target.value)})}
            />
          </div>
          <Input 
            label={t('connection.form.username')}
            placeholder={t('connection.form.usernamePlaceholder')}
            value={formData.username}
            onChange={(e) => setFormData({...formData, username: e.target.value})}
          />
          
          <div className="space-y-1">
            <label className="text-sm font-medium">Auth Type</label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={formData.authType}
              onChange={(e) => setFormData({...formData, authType: e.target.value as any})}
            >
              <option value="password">Password</option>
              <option value="privateKey">Private Key</option>
              <option value="agent">SSH Agent</option>
            </select>
          </div>

          {formData.authType === 'password' && (
            <Input 
              label={t('connection.form.password')}
              type="password"
              placeholder={t('connection.form.passwordPlaceholder')}
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          )}

          {formData.authType === 'privateKey' && (
            <div className="space-y-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Select Key</label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  onChange={(e) => {
                    const key = keys.find(k => k.id === e.target.value);
                    if (key) {
                      setFormData({ ...formData, privateKeyPath: key.privateKeyPath });
                    }
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>Select from Key Vault...</option>
                  {keys.map(k => (
                    <option key={k.id} value={k.id}>{k.name}</option>
                  ))}
                </select>
              </div>
              <Input 
                label="Private Key Path"
                placeholder="/path/to/private/key"
                value={formData.privateKeyPath || ''}
                onChange={(e) => setFormData({...formData, privateKeyPath: e.target.value})}
              />
              <Input 
                label="Passphrase (Optional)"
                type="password"
                placeholder="Key Passphrase"
                value={formData.passphrase || ''}
                onChange={(e) => setFormData({...formData, passphrase: e.target.value})}
              />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave}>
              {t('common.save')}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog 
        isOpen={isGroupDialogOpen} 
        onClose={() => setIsGroupDialogOpen(false)}
        title="New Group"
      >
        <div className="space-y-4 pt-4">
          <Input 
            label="Group Name"
            placeholder="e.g. Production Servers"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleAddGroup()}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsGroupDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleAddGroup}>
              {t('common.save')}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
