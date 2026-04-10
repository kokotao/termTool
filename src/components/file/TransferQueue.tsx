import { useTransferStore } from '@/store/transferStore';
import { useTranslation } from 'react-i18next';
import { X, Minimize2, Maximize2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

export function TransferQueue() {
  const { t } = useTranslation();
  const { transfers, isOpen, setIsOpen, removeTransfer, clearCompleted } = useTransferStore();

  if (transfers.length === 0) return null;

  const activeTransfers = transfers.filter(t => t.status === 'transferring' || t.status === 'pending');
  const completedTransfers = transfers.filter(t => t.status === 'completed');

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className={cn(
      "fixed bottom-4 right-4 w-96 bg-card border rounded-lg shadow-xl transition-all duration-300 overflow-hidden flex flex-col z-50",
      isOpen ? "h-96" : "h-12"
    )}>
      {/* Header */}
      <div 
        className="h-12 bg-muted/50 flex items-center justify-between px-4 cursor-pointer border-b"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2 font-medium">
          {activeTransfers.length > 0 && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          <span>{t('transfer.title')} ({activeTransfers.length})</span>
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}>
            {isOpen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto p-2 space-y-2 bg-background">
        {completedTransfers.length > 0 && (
          <div className="flex justify-end px-2">
            <button onClick={clearCompleted} className="text-xs text-muted-foreground hover:text-foreground">
              {t('transfer.clearCompleted')}
            </button>
          </div>
        )}
        
        {transfers.map((transfer) => (
          <div key={transfer.id} className="p-3 border rounded bg-card/50 text-sm">
            <div className="flex justify-between items-start mb-1">
              <span className="font-medium truncate flex-1 pr-2">{transfer.name}</span>
              <button onClick={() => removeTransfer(transfer.id)} className="text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </div>
            
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span>{transfer.type === 'upload' ? t('transfer.upload') : t('transfer.download')}</span>
              <span>{formatSize(transfer.size)}</span>
            </div>

            {transfer.status === 'transferring' && (
              <div className="space-y-1">
                <div className="h-1 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${transfer.progress}%` }}
                  />
                </div>
              </div>
            )}

            {transfer.status === 'completed' && (
              <div className="flex items-center gap-1 text-green-500 text-xs">
                <CheckCircle2 className="h-3 w-3" />
                <span>{t('transfer.completed')}</span>
              </div>
            )}

            {transfer.status === 'error' && (
              <div className="flex items-center gap-1 text-destructive text-xs">
                <AlertCircle className="h-3 w-3" />
                <span className="truncate max-w-[200px]">{transfer.error}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
