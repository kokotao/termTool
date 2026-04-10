import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

export interface SSHKey {
  id: string;
  name: string;
  type: 'rsa' | 'ed25519' | 'unknown';
  publicKey?: string;
  privateKeyPath: string;
  createdAt: number;
}

interface KeyState {
  keys: SSHKey[];
  addKey: (key: Omit<SSHKey, 'id' | 'createdAt'>) => void;
  removeKey: (id: string) => void;
}

export const useKeyStore = create<KeyState>()(
  persist(
    (set) => ({
      keys: [],
      addKey: (key) => set((state) => ({
        keys: [...state.keys, {
          ...key,
          id: uuidv4(),
          createdAt: Date.now(),
        }]
      })),
      removeKey: (id) => set((state) => ({
        keys: state.keys.filter((k) => k.id !== id)
      })),
    }),
    {
      name: 'termtool-keys',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
