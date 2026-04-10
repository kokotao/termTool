import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useKeyStore } from '@/store/keyStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { Key, Plus, Trash2, FileKey, Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function KeyVault() {
  const { t } = useTranslation();
  const { keys, addKey, removeKey } = useKeyStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode] = useState<'import' | 'generate'>('import');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    privateKeyPath: '',
    type: 'rsa' as 'rsa' | 'ed25519',
    bits: 4096,
    comment: '',
  });

  const handleSave = async () => {
    if (!formData.name) {
      toast.error(t('keys.form.required'));
      return;
    }

    if (dialogMode === 'import') {
      if (!formData.privateKeyPath) {
        toast.error(t('keys.form.required'));
        return;
      }
      addKey({
        name: formData.name,
        privateKeyPath: formData.privateKeyPath,
        type: 'unknown', // User didn't specify or we don't know
      });
      setIsDialogOpen(false);
      resetForm();
      toast.success(t('keys.added'));
    } else {
      // Generate
      setLoading(true);
      try {
        if (!window.electronAPI?.ssh?.generateKey) {
          toast.error(t('common.electronRequired'));
          return;
        }
        
        const result = await window.electronAPI.ssh.generateKey({
          type: formData.type,
          bits: formData.type === 'rsa' ? formData.bits : undefined,
          comment: formData.comment || formData.name,
        });

        if (result.success && result.privateKeyPath) {
          addKey({
            name: formData.name,
            privateKeyPath: result.privateKeyPath,
            type: formData.type,
            publicKey: result.publicKey,
          });
          setIsDialogOpen(false);
          resetForm();
          toast.success('Key generated successfully');
        } else {
          toast.error(result.error || 'Generation failed');
        }
      } catch (error: any) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const resetForm = () => {
    setFormData({ name: '', privateKeyPath: '', type: 'rsa', bits: 4096, comment: '' });
  };

  const copyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    toast.success(t('keys.pathCopied'));
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="font-semibold text-lg flex items-center gap-2">
          <Key className="h-5 w-5" />
          {t('sidebar.keys')}
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('keys.add')}
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-2">
        {keys.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Key className="h-12 w-12 mb-4 opacity-50" />
            <p>{t('keys.noKeys')}</p>
          </div>
        ) : (
          keys.map((key) => (
            <div 
              key={key.id} 
              className="group flex items-center justify-between p-4 rounded-lg border bg-card hover:border-primary/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                  <FileKey className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">{key.name}</h3>
                  <p className="text-sm text-muted-foreground font-mono truncate max-w-[300px]" title={key.privateKeyPath}>
                    {key.privateKeyPath}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="icon"
                  variant="ghost"
                  title={t('keys.copyPath')}
                  onClick={() => copyPath(key.privateKeyPath)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => removeKey(key.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog 
        isOpen={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)}
        title={dialogMode === 'import' ? 'Import Key' : 'Generate Key'}
      >
        <div className="space-y-4 pt-4">
          <Input 
            label={t('keys.form.name')}
            placeholder="My Private Key"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
          />
          
          {dialogMode === 'import' ? (
            <Input 
              label={t('keys.form.path')}
              placeholder="/Users/username/.ssh/id_rsa"
              value={formData.privateKeyPath}
              onChange={(e) => setFormData({...formData, privateKeyPath: e.target.value})}
            />
          ) : (
            <>
              <div className="space-y-1">
                <label className="text-sm font-medium">Type</label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value as 'rsa' | 'ed25519'})}
                >
                  <option value="rsa">RSA</option>
                  <option value="ed25519">ED25519</option>
                </select>
              </div>
              
              {formData.type === 'rsa' && (
                <div className="space-y-1">
                  <label className="text-sm font-medium">Bits</label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={formData.bits}
                    onChange={(e) => setFormData({...formData, bits: parseInt(e.target.value)})}
                  >
                    <option value="2048">2048</option>
                    <option value="4096">4096</option>
                  </select>
                </div>
              )}

              <Input 
                label="Comment"
                placeholder="user@host"
                value={formData.comment}
                onChange={(e) => setFormData({...formData, comment: e.target.value})}
              />
            </>
          )}

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('common.save')}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
