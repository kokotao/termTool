import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { SSHConnection, ConnectionGroup } from '@shared/types';
import { encrypt } from '@/lib/security';
import { v4 as uuidv4 } from 'uuid';

interface ConnectionState {
  connections: SSHConnection[];
  groups: ConnectionGroup[];
  activeConnectionId: string | null;

  addConnection: (connection: Omit<SSHConnection, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateConnection: (id: string, connection: Partial<SSHConnection>) => void;
  removeConnection: (id: string) => void;

  addGroup: (name: string, parentId?: string) => void;
  removeGroup: (id: string) => void;

  setActiveConnection: (id: string | null) => void;
}

export const useConnectionStore = create<ConnectionState>()(
  persist(
    (set) => ({
      connections: [],
      groups: [],
      activeConnectionId: null,

      addConnection: (connection) => set((state) => {
        const secureConnection = { ...connection };
        if (secureConnection.password) {
          secureConnection.password = encrypt(secureConnection.password);
        }
        if (secureConnection.passphrase) {
          secureConnection.passphrase = encrypt(secureConnection.passphrase);
        }

        const newConnection: SSHConnection = {
          ...secureConnection,
          id: uuidv4(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        return { connections: [...state.connections, newConnection] };
      }),

      updateConnection: (id, updates) => set((state) => {
        const secureUpdates = { ...updates };
        // Encrypt sensitive data if they are being updated
        if (secureUpdates.password) {
          secureUpdates.password = encrypt(secureUpdates.password);
        }
        if (secureUpdates.passphrase) {
          secureUpdates.passphrase = encrypt(secureUpdates.passphrase);
        }

        return {
          connections: state.connections.map((conn) =>
            conn.id === id ? { ...conn, ...secureUpdates, updatedAt: Date.now() } : conn
          ),
        };
      }),

      removeConnection: (id) => set((state) => ({
        connections: state.connections.filter((conn) => conn.id !== id),
      })),

      addGroup: (name, parentId) => set((state) => ({
        groups: [...state.groups, {
          id: uuidv4(),
          name,
          parentId,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }]
      })),

      removeGroup: (id) => set((state) => ({
        groups: state.groups.filter((g) => g.id !== id)
      })),

      setActiveConnection: (id) => set({ activeConnectionId: id }),
    }),
    {
      name: 'termtool-storage',
      storage: createJSONStorage(() => localStorage), // We can switch to electron-store later via IPC
    }
  )
);
