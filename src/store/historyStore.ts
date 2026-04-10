import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

export interface HistoryEntry {
  id: string;
  command: string;
  timestamp: number;
  connectionId?: string;
}

interface HistoryState {
  history: HistoryEntry[];
  addEntry: (command: string, connectionId?: string) => void;
  clearHistory: () => void;
  removeEntry: (id: string) => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      history: [],
      addEntry: (command, connectionId) => set((state) => {
        const last = state.history[state.history.length - 1];
        if (last && last.command === command) {
           return {
             history: state.history.map((h, i) => i === state.history.length - 1 ? { ...h, timestamp: Date.now() } : h)
           };
        }
        const newHistory = [...state.history, {
          id: uuidv4(),
          command,
          timestamp: Date.now(),
          connectionId
        }];
        if (newHistory.length > 1000) {
          newHistory.shift();
        }
        return { history: newHistory };
      }),
      clearHistory: () => set({ history: [] }),
      removeEntry: (id) => set((state) => ({
        history: state.history.filter(h => h.id !== id)
      })),
    }),
    {
      name: 'termtool-history',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
