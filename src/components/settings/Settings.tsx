import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingStore } from '@/store/settingStore';
import { useUserStore } from '@/store/userStore';
import { useCloudStore } from '@/store/cloudStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RotateCcw, Cloud, LogOut, Upload as UploadIcon, Download as DownloadIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { presetThemes } from '@/utils/themes';
import { toast } from 'sonner';

export function Settings() {
  const { t, i18n } = useTranslation();
  const { config, updateConfig, resetConfig, getActiveTheme } = useSettingStore();
  const { isLoggedIn, username, login, logout, register, sendVerificationCode, resetPassword } = useUserStore();
  const { 
    config: cloudConfig, 
    syncStatus,
    syncAll,
    uploadConfig,
    downloadConfig 
  } = useCloudStore();
  const activeTheme = getActiveTheme();
  
  const [loginInput, setLoginInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [isResetMode, setIsResetMode] = useState(false);
  const [themeSearch, setThemeSearch] = useState('');
  const [countdown, setCountdown] = useState(0);

  const handleSendCode = async (type: 'REGISTER' | 'RESET_PASSWORD') => {
    if (!emailInput) {
      toast.error(t('settings.emailRequired'));
      return;
    }
    try {
      await sendVerificationCode(emailInput, type);
      toast.success(t('settings.codeSent'));
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error: any) {
      toast.error(error.message || t('settings.sendCodeFailed'));
    }
  };

  const allThemes = useMemo(() => [...presetThemes, ...config.customThemes], [config.customThemes]);
  const filteredThemes = useMemo(() => {
    const s = themeSearch.trim().toLowerCase();
    if (!s) return allThemes;
    return allThemes.filter((th) => th.name.toLowerCase().includes(s) || th.id.toLowerCase().includes(s));
  }, [allThemes, themeSearch]);

  const presetFonts = [
    { name: 'Default (Menlo/Monaco)', value: 'Menlo, Monaco, "Courier New", monospace' },
    { name: 'Fira Code', value: '"Fira Code", monospace' },
    { name: 'JetBrains Mono', value: '"JetBrains Mono", monospace' },
    { name: 'Source Code Pro', value: '"Source Code Pro", monospace' },
    { name: 'Hack', value: '"Hack", monospace' },
    { name: 'Ubuntu Mono', value: '"Ubuntu Mono", monospace' },
    { name: 'Roboto Mono', value: '"Roboto Mono", monospace' },
  ];

  return (
    <div className="h-full overflow-auto p-6 space-y-8 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold mb-4">{t('sidebar.settings')}</h2>
        <p className="text-muted-foreground">{t('settings.description')}</p>
      </div>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">{t('settings.appearance')}</h3>
        
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium">{t('settings.themes')}</div>
              <div className="w-56">
                <Input
                  value={themeSearch}
                  onChange={(e) => setThemeSearch(e.target.value)}
                  placeholder={t('settings.searchThemes')}
                />
              </div>
            </div>
            <div className="border rounded-xl overflow-hidden bg-card/30">
              <div className="max-h-[520px] overflow-auto p-2 space-y-2">
                {filteredThemes.map((th) => (
                  <button
                    key={th.id}
                    onClick={() => updateConfig({ currentThemeId: th.id })}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left',
                      config.currentThemeId === th.id
                        ? 'border-primary bg-primary/10'
                        : 'border-transparent hover:bg-accent/40'
                    )}
                  >
                    <div
                      className="w-[88px] h-[44px] rounded-md border overflow-hidden flex flex-col justify-between p-2"
                      style={{ backgroundColor: th.terminal.background }}
                    >
                      <div className="space-y-1">
                        <div className="h-[5px] w-[58px] rounded" style={{ backgroundColor: th.terminal.green, opacity: 0.95 }} />
                        <div className="h-[5px] w-[42px] rounded" style={{ backgroundColor: th.terminal.cyan, opacity: 0.9 }} />
                        <div className="h-[5px] w-[66px] rounded" style={{ backgroundColor: th.terminal.yellow, opacity: 0.85 }} />
                      </div>
                      <div className="flex gap-1">
                        {[th.terminal.red, th.terminal.green, th.terminal.yellow, th.terminal.blue, th.terminal.magenta, th.terminal.cyan].map((c) => (
                          <div key={c} className="h-[5px] flex-1 rounded" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium truncate">{th.name}</div>
                        <div className={cn('text-xs px-2 py-0.5 rounded-full border', th.type === 'dark' ? 'bg-muted/40' : 'bg-background/60')}>
                          {th.type === 'dark' ? 'Dark' : 'Light'}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{th.id}</div>
                    </div>
                  </button>
                ))}
                {filteredThemes.length === 0 && (
                  <div className="p-6 text-sm text-muted-foreground text-center">{t('settings.noThemes')}</div>
                )}
              </div>
            </div>
          </div>

          <div className="col-span-7 space-y-3">
            <div className="text-sm font-medium">{t('settings.preview')}</div>
            <div className="border rounded-xl overflow-hidden bg-card/30">
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg border bg-background/50">
                    <div className="text-xs text-muted-foreground mb-2">{t('settings.uiAccent')}</div>
                    <div className="flex gap-2">
                      <div className="h-9 flex-1 rounded-md border bg-primary" />
                      <div className="h-9 w-20 rounded-md border bg-secondary" />
                      <div className="h-9 w-20 rounded-md border bg-accent" />
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border bg-background/50">
                    <div className="text-xs text-muted-foreground mb-2">{t('settings.textAndBorder')}</div>
                    <div className="h-9 rounded-md border flex items-center px-3 text-sm bg-background">
                      <span className="text-foreground">{t('settings.foreground')}</span>
                      <span className="ml-2 text-muted-foreground">{t('settings.muted')}</span>
                      <span className="ml-auto text-primary">{t('settings.primary')}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border overflow-hidden">
                  <div className="px-4 py-2 bg-muted/40 flex items-center justify-between">
                    <div className="text-xs font-medium">Terminal</div>
                    <div className="text-xs text-muted-foreground">{activeTheme.name}</div>
                  </div>
                  <div
                    className="p-4 font-mono text-sm leading-6"
                    style={{ backgroundColor: activeTheme.terminal.background, color: activeTheme.terminal.foreground }}
                  >
                    <div className="flex items-center gap-2">
                      <span style={{ color: activeTheme.terminal.green }}>root@server</span>
                      <span style={{ color: activeTheme.terminal.foreground }}>:</span>
                      <span style={{ color: activeTheme.terminal.blue }}>/var/log</span>
                      <span style={{ color: activeTheme.terminal.foreground }}>$</span>
                      <span style={{ color: activeTheme.terminal.cyan }}> tail -f</span>
                      <span style={{ color: activeTheme.terminal.yellow }}> app.log</span>
                    </div>
                    <div style={{ color: activeTheme.terminal.white, opacity: 0.9 }}>INFO  Server started on 0.0.0.0:8080</div>
                    <div style={{ color: activeTheme.terminal.yellow }}>WARN  Slow query detected (512ms)</div>
                    <div style={{ color: activeTheme.terminal.red }}>ERROR Connection timeout</div>
                    <div style={{ color: activeTheme.terminal.magenta }}>DEBUG retrying in 2s...</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t('settings.language')}</label>
          <div className="flex gap-2">
            <Button 
              variant={i18n.language === 'zh' ? 'primary' : 'outline'}
              onClick={() => i18n.changeLanguage('zh')}
            >
              中文
            </Button>
            <Button 
              variant={i18n.language === 'en' ? 'primary' : 'outline'}
              onClick={() => i18n.changeLanguage('en')}
            >
              English
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">{t('settings.terminal')}</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('settings.fontFamily')}</label>
              <div className="flex flex-wrap gap-2">
                {presetFonts.map((font) => (
                  <button
                    key={font.value}
                    onClick={() => updateConfig({ fontFamily: font.value })}
                    style={{ fontFamily: font.value }}
                    className={cn(
                      'px-3 py-1.5 text-xs rounded-md border transition-colors',
                      config.fontFamily === font.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    {font.name}
                  </button>
                ))}
              </div>
              <Input
                value={config.fontFamily}
                onChange={(e) => updateConfig({ fontFamily: e.target.value })}
                placeholder="Custom font family..."
                className="mt-2"
              />
            </div>

            <Input
              label={t('settings.fontSize')}
              type="number"
              value={config.fontSize}
              onChange={(e) => updateConfig({ fontSize: parseInt(e.target.value) || 14 })}
              min={10}
              max={32}
            />
          </div>

          <div className="space-y-2">
             <label className="text-sm font-medium">Preview</label>
             <div 
               className="p-4 rounded-lg border bg-black text-white h-[180px] overflow-hidden"
               style={{ 
                 fontFamily: config.fontFamily, 
                 fontSize: `${config.fontSize}px`,
                 lineHeight: 1.5
               }}
             >
               <div><span className="text-green-400">➜</span> <span className="text-blue-400">~</span> <span className="text-yellow-400">git</span> status</div>
               <div>On branch <span className="text-purple-400">main</span></div>
               <div>Your branch is up to date with '<span className="text-red-400">origin/main</span>'.</div>
               <br/>
               <div><span className="text-gray-500">#</span> font_preview.sh</div>
               <div><span className="text-blue-300">function</span> <span className="text-yellow-300">hello</span>() {'{'}</div>
               <div>  <span className="text-cyan-300">console</span>.log(<span className="text-green-300">"Hello World"</span>);</div>
               <div>{'}'}</div>
             </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">{t('settings.cloudSync')}</h3>
        
        {!isLoggedIn ? (
            <div className="space-y-4 max-w-sm">
                {!isResetMode ? (
                  <>
                    <div className="flex gap-4 border-b mb-4">
                        <button 
                            className={cn("pb-2 px-1 text-sm font-medium border-b-2 transition-colors", isLoginMode ? "border-primary text-primary" : "border-transparent text-muted-foreground")}
                            onClick={() => setIsLoginMode(true)}
                        >
                            {t('settings.login')}
                        </button>
                        <button 
                            className={cn("pb-2 px-1 text-sm font-medium border-b-2 transition-colors", !isLoginMode ? "border-primary text-primary" : "border-transparent text-muted-foreground")}
                            onClick={() => setIsLoginMode(false)}
                        >
                            {t('settings.register')}
                        </button>
                    </div>

                    <div className="space-y-3">
                        {!isLoginMode && (
                          <div className="flex gap-2 items-end">
                             <div className="flex-1">
                               <Input 
                                   label={t('settings.email')}
                                   type="email"
                                   value={emailInput} 
                                   onChange={e => setEmailInput(e.target.value)} 
                                   placeholder={t('settings.enterEmail')}
                               />
                             </div>
                             <Button 
                               onClick={() => handleSendCode('REGISTER')} 
                               disabled={countdown > 0 || !emailInput}
                               variant="outline"
                               className="mb-[2px] w-[100px]"
                             >
                               {countdown > 0 ? `${countdown}s` : t('settings.sendCode')}
                             </Button>
                          </div>
                        )}
                        
                        {!isLoginMode && (
                            <Input 
                                label={t('settings.verificationCode')}
                                value={codeInput} 
                                onChange={e => setCodeInput(e.target.value)} 
                                placeholder={t('settings.enterCode')}
                            />
                        )}

                        <Input 
                            label={t('settings.username')}
                            value={loginInput} 
                            onChange={e => setLoginInput(e.target.value)} 
                            placeholder={t('settings.enterUsername')}
                        />
                        
                        <Input 
                            label={t('settings.password')}
                            type="password"
                            value={passwordInput} 
                            onChange={e => setPasswordInput(e.target.value)} 
                            placeholder={t('settings.enterPassword')}
                        />
                    </div>

                    <Button 
                        className="w-full mt-4" 
                        onClick={async () => {
                            try {
                                if (isLoginMode) {
                                    await login(loginInput, passwordInput);
                                    toast.success(t('settings.loginSuccess'));
                                } else {
                                    await register(loginInput, passwordInput, emailInput, codeInput);
                                    toast.success(t('settings.registerSuccess'));
                                }
                            } catch (error: any) {
                                toast.error(error.message || t('settings.error'));
                            }
                        }}
                        disabled={isLoginMode ? (!loginInput || !passwordInput) : (!loginInput || !passwordInput || !emailInput || !codeInput)}
                    >
                        {isLoginMode ? t('settings.login') : t('settings.register')}
                    </Button>

                    {isLoginMode && (
                      <div className="text-right mt-2">
                        <button 
                          onClick={() => setIsResetMode(true)}
                          className="text-xs text-muted-foreground hover:text-primary"
                        >
                          {t('settings.forgotPassword')}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-4">
                      <button onClick={() => setIsResetMode(false)} className="text-muted-foreground hover:text-foreground">
                        <RotateCcw className="h-4 w-4 rotate-180" />
                      </button>
                      <h4 className="font-medium">{t('settings.resetPassword')}</h4>
                    </div>

                    <div className="flex gap-2 items-end">
                       <div className="flex-1">
                         <Input 
                             label={t('settings.email')}
                             type="email"
                             value={emailInput} 
                             onChange={e => setEmailInput(e.target.value)} 
                             placeholder={t('settings.enterEmail')}
                         />
                       </div>
                       <Button 
                         onClick={() => handleSendCode('RESET_PASSWORD')} 
                         disabled={countdown > 0 || !emailInput}
                         variant="outline"
                         className="mb-[2px] w-[100px]"
                       >
                         {countdown > 0 ? `${countdown}s` : t('settings.sendCode')}
                       </Button>
                    </div>

                    <Input 
                        label={t('settings.verificationCode')}
                        value={codeInput} 
                        onChange={e => setCodeInput(e.target.value)} 
                        placeholder={t('settings.enterCode')}
                    />

                    <Input 
                        label={t('settings.newPassword')}
                        type="password"
                        value={passwordInput} 
                        onChange={e => setPasswordInput(e.target.value)} 
                        placeholder={t('settings.enterNewPassword')}
                    />

                    <Button 
                        className="w-full mt-4" 
                        onClick={async () => {
                            try {
                                await resetPassword(emailInput, codeInput, passwordInput);
                                toast.success(t('settings.resetSuccess'));
                                setIsResetMode(false);
                                setIsLoginMode(true);
                            } catch (error: any) {
                                toast.error(error.message || t('settings.error'));
                            }
                        }}
                        disabled={!emailInput || !codeInput || !passwordInput}
                    >
                        {t('settings.resetPassword')}
                    </Button>
                  </div>
                )}
            </div>
        ) : (
            <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-secondary/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-full">
                            <Cloud className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <div className="font-medium">{t('settings.loggedAs', { username })}</div>
                            <div className="text-xs text-muted-foreground">
                                {syncStatus.syncing ? t('settings.syncing') : 
                                 syncStatus.error ? t('settings.syncError') : 
                                 t('settings.statusActive')}
                            </div>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => logout()}>
                        <LogOut className="h-4 w-4 mr-2" />
                        {t('settings.logout')}
                    </Button>
                </div>
                
                {syncStatus.error && (
                    <div className="text-xs text-red-500 bg-red-500/10 p-2 rounded">
                        {syncStatus.error}
                    </div>
                )}

                <div className="flex gap-4">
                    <Button 
                        className="flex-1" 
                        onClick={async () => {
                            try {
                                await syncAll(); // Or specifically uploadConfig/uploadConnections
                                toast.success(t('settings.syncUpSuccess'));
                            } catch (error) {
                                toast.error(t('settings.syncFailed'));
                            }
                        }}
                        disabled={syncStatus.syncing}
                    >
                        <UploadIcon className={cn("h-4 w-4 mr-2", syncStatus.syncing && "animate-spin")} />
                        {t('settings.syncUp')}
                    </Button>
                    <Button 
                        className="flex-1" 
                        variant="outline" 
                        onClick={async () => {
                            try {
                                await downloadConfig();
                                // Also download connections if needed, maybe expose downloadConnections from useCloudStore in Settings
                                toast.success(t('settings.syncDownSuccess'));
                            } catch (error) {
                                toast.error(t('settings.syncFailed'));
                            }
                        }}
                        disabled={syncStatus.syncing}
                    >
                        <DownloadIcon className={cn("h-4 w-4 mr-2", syncStatus.syncing && "animate-spin")} />
                        {t('settings.syncDown')}
                    </Button>
                </div>
            </div>
        )}
      </section>

      <div className="pt-4 border-t">
        <Button variant="danger" onClick={resetConfig} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          {t('settings.reset')}
        </Button>
      </div>
    </div>
  );
}
