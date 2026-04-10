import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { ConnectionList } from '@/components/connection/ConnectionList';
import { TerminalManager } from '@/components/terminal/TerminalManager';
import { FileManager } from '@/components/file/FileManager';
import { Settings } from '@/components/settings/Settings';
import { KeyVault } from '@/components/keys/KeyVault';
import { useTranslation } from 'react-i18next';
import { useSettingStore } from '@/store/settingStore';
import { useUserStore } from '@/store/userStore';
import { presetThemes } from '@/utils/themes';
import { Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Toaster } from 'sonner';

function App() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('connections');
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const { config, getActiveTheme } = useSettingStore();
  const { loadUser } = useUserStore();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    const root = window.document.documentElement;
    const theme = getActiveTheme();

    root.style.setProperty('--background', theme.ui.background);
    root.style.setProperty('--foreground', theme.ui.foreground);
    root.style.setProperty('--card', theme.ui.card);
    root.style.setProperty('--card-foreground', theme.ui.cardForeground);
    root.style.setProperty('--popover', theme.ui.popover);
    root.style.setProperty('--popover-foreground', theme.ui.popoverForeground);
    root.style.setProperty('--primary', theme.ui.primary);
    root.style.setProperty('--primary-foreground', theme.ui.primaryForeground);
    root.style.setProperty('--secondary', theme.ui.secondary);
    root.style.setProperty('--secondary-foreground', theme.ui.secondaryForeground);
    root.style.setProperty('--muted', theme.ui.muted);
    root.style.setProperty('--muted-foreground', theme.ui.mutedForeground);
    root.style.setProperty('--accent', theme.ui.accent);
    root.style.setProperty('--accent-foreground', theme.ui.accentForeground);
    root.style.setProperty('--destructive', theme.ui.destructive);
    root.style.setProperty('--destructive-foreground', theme.ui.destructiveForeground);
    root.style.setProperty('--border', theme.ui.border);
    root.style.setProperty('--input', theme.ui.input);
    root.style.setProperty('--ring', theme.ui.ring);

    root.classList.remove('light', 'dark');
    root.classList.add(theme.type);
  }, [config.currentThemeId, config.customThemes, getActiveTheme]);

  useEffect(() => {
    const handleNavigate = (e: CustomEvent) => {
      setActiveTab(e.detail);
    };
    window.addEventListener('navigate', handleNavigate as EventListener);
    return () => window.removeEventListener('navigate', handleNavigate as EventListener);
  }, []);

  return (
    <div className="h-screen w-full flex bg-background text-foreground overflow-hidden">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-background/50">
        <Toaster />
        <header className="h-11 border-b flex items-center px-4 draggable-area select-none bg-card/60 backdrop-blur-sm z-10 justify-between">
          <div className="font-semibold text-sm">{t('common.appName')}</div>
          <div className="flex items-center gap-2 nondraggable-area">
            <div className="relative">
              <button
                onClick={() => setShowThemeDropdown(!showThemeDropdown)}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-md border transition-all",
                  showThemeDropdown ? "bg-accent/50 border-border" : "border-transparent hover:bg-accent/50 hover:border-border"
                )}
              >
                 <div className="h-5 w-5 rounded-full border shadow-sm" style={{ backgroundColor: getActiveTheme().terminal.background }} />
                 <span className="text-xs font-medium hidden sm:block max-w-[100px] truncate">{getActiveTheme().name}</span>
                 <Palette className="h-4 w-4 text-muted-foreground" />
              </button>
              
              {showThemeDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-40"
                    onClick={() => setShowThemeDropdown(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border bg-popover text-popover-foreground shadow-lg overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-2 bg-muted/30 text-xs font-medium text-muted-foreground border-b">
                      Select Theme
                    </div>
                    <div className="max-h-[300px] overflow-auto p-1">
                      {[...presetThemes, ...config.customThemes].map((th) => (
                        <button
                          key={th.id}
                          onClick={() => {
                            useSettingStore.getState().updateConfig({ currentThemeId: th.id });
                            setShowThemeDropdown(false);
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left text-sm transition-colors",
                            config.currentThemeId === th.id ? "bg-accent" : "hover:bg-accent/50"
                          )}
                        >
                          <div className="h-4 w-4 rounded-full border flex-shrink-0" style={{ backgroundColor: th.terminal.background }} />
                          <span className="flex-1 truncate">{th.name}</span>
                          {config.currentThemeId === th.id && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
        
        <div className="flex-1 overflow-hidden relative">
          <div className={activeTab === 'connections' ? 'h-full w-full' : 'hidden'}>
            <ConnectionList />
          </div>
          <div className={activeTab === 'terminals' ? 'h-full w-full' : 'hidden'}>
            <TerminalManager />
          </div>
          <div className={activeTab === 'files' ? 'h-full w-full' : 'hidden'}>
            <FileManager />
          </div>
          <div className={activeTab === 'keys' ? 'h-full w-full' : 'hidden'}>
            <KeyVault />
          </div>
          <div className={activeTab === 'settings' ? 'h-full w-full' : 'hidden'}>
            <Settings />
          </div>
          {activeTab !== 'connections' && activeTab !== 'terminals' && activeTab !== 'files' && activeTab !== 'settings' && activeTab !== 'keys' && (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Module "{activeTab}" under construction
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
