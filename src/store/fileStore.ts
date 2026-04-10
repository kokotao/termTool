import { create } from 'zustand';
import { FileEntry } from '@shared/types';

export interface FilePanelState {
  path: string;
  files: FileEntry[];
  loading: boolean;
  error: string | null;
  selectedFiles: string[];
}

export const initialPanelState: FilePanelState = {
  path: '',
  files: [],
  loading: false,
  error: null,
  selectedFiles: [],
};

export interface FileSession {
  id: string;
  connectionId: string | null;
  name: string;
  local: FilePanelState;
  remote: FilePanelState;
}

export interface FileState {
  sessions: FileSession[];
  activeSessionId: string | null;

  addSession: (session: FileSession) => void;
  removeSession: (id: string) => void;
  setActiveSession: (id: string) => void;

  updateSession: (sessionId: string, updates: Partial<FileSession>) => void;

  setLocalPath: (sessionId: string, path: string) => void;
  setLocalFiles: (sessionId: string, files: FileEntry[]) => void;
  setLocalLoading: (sessionId: string, loading: boolean) => void;
  setLocalError: (sessionId: string, error: string | null) => void;

  setRemotePath: (sessionId: string, path: string) => void;
  setRemoteFiles: (sessionId: string, files: FileEntry[]) => void;
  setRemoteLoading: (sessionId: string, loading: boolean) => void;
  setRemoteError: (sessionId: string, error: string | null) => void;
}

export const useFileStore = create<FileState>((set) => ({
  sessions: [],
  activeSessionId: null,

  addSession: (session) => set((state) => ({
    sessions: [...state.sessions, session],
    activeSessionId: session.id
  })),

  removeSession: (id) => set((state) => {
    // Filter out the session with the given id
    const newSessions = state.sessions.filter(s => s.id !== id);
    let newActiveId = state.activeSessionId;
    // If the removed session was active, set a new active session
    if (state.activeSessionId === id) {
      // Select the last remaining session as active, or null if no sessions remain
      newActiveId = newSessions.length > 0 ? newSessions[newSessions.length - 1].id : null;
    }
    return {
      sessions: newSessions,
      activeSessionId: newActiveId
    };
  }),

  setActiveSession: (id) => set({ activeSessionId: id }),

  updateSession: (sessionId, updates) => set((state) => ({
    sessions: state.sessions.map(s => s.id === sessionId ? { ...s, ...updates } : s)
  })),

  setLocalPath: (sessionId, path) => set((state) => ({
    sessions: state.sessions.map(s => s.id === sessionId ? { ...s, local: { ...s.local, path } } : s)
  })),
  
  setLocalFiles: (sessionId, files) => set((state) => ({
    sessions: state.sessions.map(s => s.id === sessionId ? { ...s, local: { ...s.local, files, error: null } } : s)
  })),

  setLocalLoading: (sessionId, loading) => set((state) => ({
    sessions: state.sessions.map(s => s.id === sessionId ? { ...s, local: { ...s.local, loading } } : s)
  })),

  setLocalError: (sessionId, error) => set((state) => ({
    sessions: state.sessions.map(s => s.id === sessionId ? { ...s, local: { ...s.local, error } } : s)
  })),

  setRemotePath: (sessionId, path) => set((state) => ({
    sessions: state.sessions.map(s => s.id === sessionId ? { ...s, remote: { ...s.remote, path } } : s)
  })),

  setRemoteFiles: (sessionId, files) => set((state) => ({
    sessions: state.sessions.map(s => s.id === sessionId ? { ...s, remote: { ...s.remote, files, error: null } } : s)
  })),

  setRemoteLoading: (sessionId, loading) => set((state) => ({
    sessions: state.sessions.map(s => s.id === sessionId ? { ...s, remote: { ...s.remote, loading } } : s)
  })),

  setRemoteError: (sessionId, error) => set((state) => ({
    sessions: state.sessions.map(s => s.id === sessionId ? { ...s, remote: { ...s.remote, error } } : s)
  })),
}));
