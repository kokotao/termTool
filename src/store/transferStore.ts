import { create } from 'zustand';
import { FileTransfer } from '@shared/types';
import { v4 as uuidv4 } from 'uuid';

interface TransferState {
  transfers: FileTransfer[];
  isOpen: boolean;

  addTransfer: (transfer: Omit<FileTransfer, 'id' | 'status' | 'progress' | 'transferred'>) => string;
  updateTransfer: (id: string, updates: Partial<FileTransfer>) => void;
  removeTransfer: (id: string) => void;
  clearCompleted: () => void;
  setIsOpen: (isOpen: boolean) => void;
}

export const useTransferStore = create<TransferState>((set) => ({
  transfers: [],
  isOpen: false,

  addTransfer: (transfer) => {
    const id = uuidv4();
    set((state) => ({
      transfers: [
        {
          ...transfer,
          id,
          status: 'pending',
          progress: 0,
          transferred: 0,
        },
        ...state.transfers,
      ],
      isOpen: true,
    }));
    return id;
  },

  updateTransfer: (id, updates) =>
    set((state) => ({
      transfers: state.transfers.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    })),

  removeTransfer: (id) =>
    set((state) => ({
      transfers: state.transfers.filter((t) => t.id !== id),
    })),

  clearCompleted: () =>
    set((state) => ({
      transfers: state.transfers.filter((t) => t.status !== 'completed'),
    })),

  setIsOpen: (isOpen) => set({ isOpen }),
}));
