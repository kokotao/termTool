import { Terminal, Folder, Settings, Key, Server, Languages, ChevronRight, ChevronLeft, Info, ExternalLink, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { appConfig } from '@/config';
import { useState } from 'react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { t, i18n } = useTranslation();
  const [showAbout, setShowAbout] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'none' | 'checking' | 'latest' | 'available' | 'error'>('none');
  const [latestVersion, setLatestVersion] = useState<string>('');

  const navItems = [
    { id: 'connections', icon: Server, label: t('sidebar.connections') },
    { id: 'terminals', icon: Terminal, label: t('sidebar.terminals') },
    { id: 'files', icon: Folder, label: t('sidebar.files') },
    { id: 'keys', icon: Key, label: t('sidebar.keys') },
    { id: 'settings', icon: Settings, label: t('sidebar.settings') },
  ];

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'zh' : 'en';
    i18n.changeLanguage(newLang);
  };

  const checkUpdate = async () => {
    setCheckingUpdate(true);
    setUpdateStatus('checking');
    
    try {
      const response = await fetch('https://api.github.com/repos/albertLuo/termTool/releases/latest');
      const data = await response.json();
      const version = data.tag_name.replace('v', '');
      const currentVersion = appConfig.version;
      
      setLatestVersion(version);
      
      if (version > currentVersion) {
        setUpdateStatus('available');
      } else {
        setUpdateStatus('latest');
      }
    } catch (error) {
      setUpdateStatus('error');
    } finally {
      setCheckingUpdate(false);
    }
  };

  return (
    <>
      <div 
        className={cn(
          "border-r bg-muted/30 flex flex-col h-full transition-all duration-300 relative group",
          isExpanded ? "w-64" : "w-[70px]"
        )}
      >
        <div className={cn("p-4 border-b flex items-center gap-2", isExpanded ? "justify-between" : "flex-col justify-center")}>
          <div className={cn("flex items-center gap-2 font-bold text-lg text-primary transition-all overflow-hidden whitespace-nowrap", isExpanded ? "w-auto" : "w-8 justify-center")}>
            <Terminal className={cn("flex-shrink-0", isExpanded ? "h-6 w-6" : "h-8 w-8")} />
            <span className={cn("transition-opacity duration-300", isExpanded ? "opacity-100" : "opacity-0 w-0 hidden")}>{t('common.appName')}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={toggleLanguage} title="Switch Language" className="h-6 w-6 flex-shrink-0">
            <Languages className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex-1 py-4 flex flex-col items-center overflow-x-hidden">
          <nav className="space-y-2 px-2 w-full flex flex-col">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                title={isExpanded ? undefined : item.label}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-colors whitespace-nowrap",
                  isExpanded ? "w-full justify-start" : "w-10 h-10 justify-center mx-auto",
                  activeTab === item.id 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className={cn("flex-shrink-0", isExpanded ? "h-4 w-4" : "h-5 w-5")} />
                <span className={cn("text-sm font-medium transition-opacity duration-200", isExpanded ? "opacity-100" : "opacity-0 w-0 hidden")}>
                  {item.label}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Toggle Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="absolute -right-3 top-1/2 transform -translate-y-1/2 bg-background border rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-50 hover:bg-accent"
        >
          {isExpanded ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>

        <div 
          className="p-4 border-t text-xs text-muted-foreground text-center cursor-pointer hover:text-foreground transition-colors"
          onClick={() => setShowAbout(true)}
        >
          {isExpanded ? (
            <div className="flex items-center justify-center gap-2">
              <Info className="h-3 w-3" />
              <span>v0.1.0</span>
            </div>
          ) : (
            "v0.1"
          )}
        </div>
      </div>

      <Dialog 
        isOpen={showAbout} 
        onClose={() => setShowAbout(false)}
        title={t('common.about')}
      >
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Terminal className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center space-y-1">
            <h3 className="text-xl font-bold">{t('common.appName')}</h3>
            <p className="text-sm text-muted-foreground">Version {appConfig.version} (Beta)</p>
          </div>
          
          <div className="w-full border-t my-2" />
          
          <div className="text-center space-y-2 text-sm w-full">
            <p className="text-muted-foreground">Created by</p>
            <p className="font-medium">{appConfig.author}</p>
            <a
              href={`mailto:${appConfig.authorEmail}`}
              className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
            >
              {appConfig.authorEmail}
            </a>
            <a 
              href="https://albertluo.lizipro.cn" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
            >
              <ExternalLink className="h-3 w-3" />
              albertluo.lizipro.cn
            </a>
            <p className="text-xs text-muted-foreground mt-4">
              Designed for modern developers.
            </p>
          </div>

          <div className="w-full border-t my-2" />

          <div className="w-full space-y-3">
            <Button 
              onClick={checkUpdate}
              disabled={checkingUpdate}
              variant="outline"
              className="w-full"
            >
              {checkingUpdate ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Check for Updates
                </>
              )}
            </Button>

            {updateStatus === 'checking' && (
              <p className="text-xs text-center text-muted-foreground">Checking for updates...</p>
            )}

            {updateStatus === 'latest' && (
              <div className="flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircle className="h-4 w-4" />
                <span>You are using the latest version</span>
              </div>
            )}

            {updateStatus === 'available' && (
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 text-sm text-primary">
                  <RefreshCw className="h-4 w-4" />
                  <span>New version available: v{latestVersion}</span>
                </div>
                <a 
                  href={`https://github.com/albertLuo/termTool/releases/tag/v${latestVersion}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  View Release
                </a>
              </div>
            )}

            {updateStatus === 'error' && (
              <div className="flex items-center justify-center gap-2 text-sm text-destructive">
                <XCircle className="h-4 w-4" />
                <span>Failed to check for updates</span>
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={() => setShowAbout(false)}>Close</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
