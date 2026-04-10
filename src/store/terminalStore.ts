import { create } from 'zustand';
import { SSHStatus } from '@shared/constants';

export interface TerminalSession {
  id: string;
  connectionId: string;
  title: string;
  status: SSHStatus;
  cwd?: string;
  homeDir?: string;
}

interface TerminalState {
  sessions: TerminalSession[];
  activeSessionId: string | null;
  
  // Actions
  addSession: (session: TerminalSession) => void;
  removeSession: (id: string) => void;
  setActiveSession: (id: string) => void;
  updateSessionStatus: (id: string, status: SSHStatus) => void;
  updateSessionCwd: (id: string, cwd: string) => void;
  updateSessionHomeDir: (id: string, homeDir: string) => void;
}

export const useTerminalStore = create<TerminalState>((set) => ({
  sessions: [],
  activeSessionId: null,

  addSession: (session) => set((state) => ({
    sessions: [...state.sessions, session],
    activeSessionId: session.id
  })),

  removeSession: (id) => set((state) => {
    const newSessions = state.sessions.filter(s => s.id !== id);
    let newActiveId = state.activeSessionId;
    if (state.activeSessionId === id) {
      newActiveId = newSessions.length > 0 ? newSessions[newSessions.length - 1].id : null;
    }
    return {
      sessions: newSessions,
      activeSessionId: newActiveId
    };
  }),

  setActiveSession: (id) => set({ activeSessionId: id }),

  updateSessionStatus: (id, status) => set((state) => ({
    sessions: state.sessions.map(s => 
      s.id === id ? { ...s, status } : s
    )
  })),

  updateSessionCwd: (id, cwd) => set((state) => ({
    sessions: state.sessions.map(s => 
      s.id === id ? { ...s, cwd } : s
    )
  })),

  updateSessionHomeDir: (id, homeDir) => set((state) => ({
    sessions: state.sessions.map(s => 
      s.id === id ? { ...s, homeDir } : s
    )
  }))
}));
