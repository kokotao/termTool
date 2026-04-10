/**
 * 作者：albert_luo
 * 文件作用：终端视图组件（xterm.js 渲染、连接初始化、数据收发、尺寸自适配）
 */
import { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';
import { useTerminalStore } from '@/store/terminalStore';
import { useSettingStore } from '@/store/settingStore';
import { useHistoryStore } from '@/store/historyStore';
import { SSHConnection } from '@shared/types';
import { SSHStatus } from '@shared/constants';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '@/components/ui/ContextMenu';
import { useTranslation } from 'react-i18next';

interface TerminalViewProps {
  sessionId: string;
  connection: SSHConnection;
  isActive: boolean;
}

export function TerminalView({ sessionId, connection, isActive }: TerminalViewProps) {
  const { t } = useTranslation();
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const { sessions, updateSessionStatus, updateSessionCwd, updateSessionHomeDir } = useTerminalStore();
  const { config, getActiveTheme } = useSettingStore();
  const commandBufferRef = useRef('');
  const { addEntry, history } = useHistoryStore();

  const session = sessions.find(s => s.id === sessionId);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!xtermRef.current) return;
    const theme = getActiveTheme();
    
    xtermRef.current.options.fontSize = config.fontSize;
    xtermRef.current.options.fontFamily = config.fontFamily;
    xtermRef.current.options.theme = {
      background: theme.terminal.background,
      foreground: theme.terminal.foreground,
      cursor: theme.terminal.cursor,
      selectionBackground: theme.terminal.selectionBackground,
      black: theme.terminal.black,
      red: theme.terminal.red,
      green: theme.terminal.green,
      yellow: theme.terminal.yellow,
      blue: theme.terminal.blue,
      magenta: theme.terminal.magenta,
      cyan: theme.terminal.cyan,
      white: theme.terminal.white,
      brightBlack: theme.terminal.brightBlack,
      brightRed: theme.terminal.brightRed,
      brightGreen: theme.terminal.brightGreen,
      brightYellow: theme.terminal.brightYellow,
      brightBlue: theme.terminal.brightBlue,
      brightMagenta: theme.terminal.brightMagenta,
      brightCyan: theme.terminal.brightCyan,
      brightWhite: theme.terminal.brightWhite,
    };
  }, [config.fontSize, config.fontFamily, config.currentThemeId, getActiveTheme]);

  // 初始化 xterm（仅在组件挂载时执行一次）
  useEffect(() => {
    if (!terminalRef.current) return;

    const sshApi = window.electronAPI?.ssh;
    const theme = getActiveTheme();

    const term = new Terminal({
      cursorBlink: true,
      fontSize: config.fontSize,
      fontFamily: config.fontFamily,
      drawBoldTextInBrightColors: true,
      theme: {
        background: theme.terminal.background,
        foreground: theme.terminal.foreground,
        cursor: theme.terminal.cursor,
        selectionBackground: theme.terminal.selectionBackground,
        black: theme.terminal.black,
        red: theme.terminal.red,
        green: theme.terminal.green,
        yellow: theme.terminal.yellow,
        blue: theme.terminal.blue,
        magenta: theme.terminal.magenta,
        cyan: theme.terminal.cyan,
        white: theme.terminal.white,
        brightBlack: theme.terminal.brightBlack,
        brightRed: theme.terminal.brightRed,
        brightGreen: theme.terminal.brightGreen,
        brightYellow: theme.terminal.brightYellow,
        brightBlue: theme.terminal.brightBlue,
        brightMagenta: theme.terminal.brightMagenta,
        brightCyan: theme.terminal.brightCyan,
        brightWhite: theme.terminal.brightWhite,
      },
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    
    // Register OSC 7 handler for tracking CWD
    term.parser.registerOscHandler(7, (data) => {
      try {
        // OSC 7 format: file://hostname/path
        // We only care about the path
        const url = new URL(data);
        if (url.pathname) {
          // Decode URI component to handle spaces and special chars
          const path = decodeURIComponent(url.pathname);
          updateSessionCwd(sessionId, path);
        }
      } catch (e) {
        // Fallback for simple paths or malformed URLs
        if (data.startsWith('/')) {
             updateSessionCwd(sessionId, data);
        } else {
             console.warn('Failed to parse OSC 7:', data);
        }
      }
      return true;
    });

    term.open(terminalRef.current);

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    const connectSSH = async (rows: number, cols: number) => {
      if (!sshApi) {
        term.writeln('Electron API not available. Run with `npm run electron:dev`.');
        updateSessionStatus(sessionId, 'error');
        return;
      }

      term.writeln(`Connecting to ${connection.username}@${connection.host}...`);

      const result = await sshApi.connect(sessionId, connection, { rows, cols });

      if (!result.success) {
        term.writeln(`\r\nError: ${result.error}`);
        updateSessionStatus(sessionId, 'error');
      } else if (result.homeDir) {
          updateSessionHomeDir(sessionId, result.homeDir);
          // Also set initial CWD to homeDir if not already set
          updateSessionCwd(sessionId, result.homeDir);
      }
    };

    setTimeout(() => {
      if (terminalRef.current?.offsetParent) {
        try {
          fitAddon.fit();
        } catch (e) {
          console.warn('Failed to fit terminal:', e);
        }
      }
      connectSSH(term.rows, term.cols);
    }, 100);

    term.onData((data) => {
      sshApi?.sendData(sessionId, data);

      if (data === '\r') {
        const cmd = commandBufferRef.current.trim();
        if (cmd) {
           addEntry(cmd, connection.id);
        }
        commandBufferRef.current = '';
      } else if (data === '\x7f') {
        commandBufferRef.current = commandBufferRef.current.slice(0, -1);
      } else if (data >= ' ' && data <= '~') {
        commandBufferRef.current += data;
      }
    });

    term.onResize(({ cols, rows }) => {
      sshApi?.resize(sessionId, rows, cols);
    });

    const handleResize = () => {
      if (terminalRef.current?.offsetParent && fitAddonRef.current) {
        try {
          fitAddonRef.current.fit();
        } catch (e) {
          console.warn('Failed to fit terminal on resize:', e);
        }
      }
    };
    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver(() => {
      if (terminalRef.current?.offsetParent && fitAddonRef.current) {
         window.requestAnimationFrame(() => {
            try {
              fitAddonRef.current?.fit();
            } catch (e) {
            }
         });
      }
    });

    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      term.dispose();
      sshApi?.disconnect(sessionId);
    };
  }, []);

  useEffect(() => {
    const sshApi = window.electronAPI?.ssh;
    if (!sshApi) return;

    const removeDataListener = sshApi.onData((_, { connectionId, data }) => {
      if (connectionId === sessionId && xtermRef.current) {
        xtermRef.current.write(data);

        // Prompt Parsing Logic (Heuristic)
        // Defer slightly to allow xterm to process buffer
        setTimeout(() => {
             if (!xtermRef.current) return;
             const buffer = xtermRef.current.buffer.active;
             const cursorY = buffer.cursorY;
             const baseY = buffer.baseY;
             const line = buffer.getLine(baseY + cursorY);
             
             if (line) {
                 const lineStr = line.translateToString(true);
                 
                 // Check for typical prompt endings
                 if (/[$#%>] ?$/.test(lineStr)) {
                     let matchedPath = '';
                     
                     // 1. user@host:path$ (Ubuntu/Debian style)
                     const match1 = lineStr.match(/:\s*([^\s]+)\s*[$#%]/); 
                     if (match1) matchedPath = match1[1];
                     
                     // 2. [user@host path]$ (CentOS style)
                     if (!matchedPath) {
                         const match2 = lineStr.match(/\[.+@.+ (.+)\][$#%]/);
                         if (match2) matchedPath = match2[1];
                     }
                     
                     if (matchedPath) {
                         const currentSessions = useTerminalStore.getState().sessions;
                         const currentSession = currentSessions.find(s => s.id === sessionId);
                         
                         let finalPath = matchedPath;
                         if (matchedPath.startsWith('~') && currentSession?.homeDir) {
                             finalPath = matchedPath.replace(/^~/, currentSession.homeDir);
                         }
                         
                         // Update if changed and looks like a path
                         if (finalPath !== currentSession?.cwd && (finalPath.startsWith('/') || finalPath.startsWith('~'))) {
                            updateSessionCwd(sessionId, finalPath);
                         }
                     }
                 }
             }
        }, 10);
      }
    });

    const removeStatusListener = sshApi.onStatus((_, { connectionId, status }) => {
      if (connectionId === sessionId) {
        updateSessionStatus(sessionId, status as SSHStatus);
        if (status === 'disconnected' && xtermRef.current) {
          xtermRef.current.writeln('\r\nConnection closed.');
        }
      }
    });

    return () => {
      removeDataListener();
      removeStatusListener();
    };
  }, [sessionId]);

  useEffect(() => {
    if (isActive && fitAddonRef.current && terminalRef.current?.offsetParent) {
      setTimeout(() => {
        fitAddonRef.current?.fit();
      }, 50);
    }
  }, [isActive]);

  useEffect(() => {
    if (xtermRef.current) {
      xtermRef.current.options.fontSize = config.fontSize;
      xtermRef.current.options.fontFamily = config.fontFamily;
      
      const theme = getActiveTheme();
      xtermRef.current.options.theme = {
        background: theme.terminal.background,
        foreground: theme.terminal.foreground,
        cursor: theme.terminal.cursor,
        selectionBackground: theme.terminal.selectionBackground,
        black: theme.terminal.black,
        red: theme.terminal.red,
        green: theme.terminal.green,
        yellow: theme.terminal.yellow,
        blue: theme.terminal.blue,
        magenta: theme.terminal.magenta,
        cyan: theme.terminal.cyan,
        white: theme.terminal.white,
        brightBlack: theme.terminal.brightBlack,
        brightRed: theme.terminal.brightRed,
        brightGreen: theme.terminal.brightGreen,
        brightYellow: theme.terminal.brightYellow,
        brightBlue: theme.terminal.brightBlue,
        brightMagenta: theme.terminal.brightMagenta,
        brightCyan: theme.terminal.brightCyan,
        brightWhite: theme.terminal.brightWhite,
      };
      
      // Update container background
      if (terminalRef.current) {
        terminalRef.current.style.backgroundColor = theme.terminal.background;
      }

      xtermRef.current.refresh(0, xtermRef.current.rows - 1);

      setTimeout(() => {
        fitAddonRef.current?.fit();
        xtermRef.current?.refresh(0, xtermRef.current?.rows - 1);
      }, 50);
    }
  }, [config.fontSize, config.fontFamily, config.currentThemeId, config.customThemes, getActiveTheme]);

  const handleCopy = () => {
    if (xtermRef.current) {
      const selection = xtermRef.current.getSelection();
      if (selection) {
        navigator.clipboard.writeText(selection);
      }
    }
  };

  const handlePaste = async () => {
    if (xtermRef.current) {
      try {
        const text = await navigator.clipboard.readText();
        xtermRef.current.paste(text);
      } catch (err) {
        console.error('Failed to read clipboard', err);
      }
    }
  };

  const handleSelectAll = () => {
    xtermRef.current?.selectAll();
  };

  const handleClear = () => {
    xtermRef.current?.clear();
  };

  const handleRunCommand = (command: string) => {
    if (xtermRef.current) {
      window.electronAPI?.ssh.sendData(sessionId, command + '\r');
      xtermRef.current.focus();
    }
  };

  const connectionHistory = history
    .filter(h => h.connectionId === connection.id)
    .slice(-10)
    .reverse();

  return (
    <ContextMenu>
      <ContextMenuTrigger className={`h-full w-full ${isActive ? 'block' : 'hidden'}`}>
        <div 
          ref={terminalRef} 
          className="h-full w-full overflow-hidden" 
          style={{ backgroundColor: getActiveTheme().terminal.background }}
        />
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onSelect={handleCopy}>
          {t('common.copy')}
        </ContextMenuItem>
        <ContextMenuItem onSelect={handlePaste}>
          {t('common.paste')}
        </ContextMenuItem>
        <ContextMenuItem onSelect={handleSelectAll}>
          {t('common.selectAll')}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            {t('terminal.commandHistory')}
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-64 max-h-80 overflow-y-auto">
            {connectionHistory.length > 0 ? (
              connectionHistory.map((entry) => (
                <ContextMenuItem
                  key={entry.id}
                  onSelect={() => handleRunCommand(entry.command)}
                  className="font-mono text-xs cursor-pointer truncate"
                >
                  {entry.command}
                </ContextMenuItem>
              ))
            ) : (
              <ContextMenuItem disabled>
                {t('terminal.noHistory')}
              </ContextMenuItem>
            )}
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={handleClear}>
          {t('common.clear')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
