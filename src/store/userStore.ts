import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CloudUser, CloudAuthResponse } from '@shared/types';
import { cloudService } from '@/services/cloudService';
import { hashPassword } from '@/utils/crypto';
import { useCloudStore } from './cloudStore';

interface UserState {
  isLoggedIn: boolean;
  user: CloudUser | null;
  username: string | null;
  token: string | null;
  email: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, email: string, code: string) => Promise<void>;
  sendVerificationCode: (email: string, type: 'REGISTER' | 'RESET_PASSWORD') => Promise<void>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      isLoggedIn: false,
      user: null,
      username: null,
      token: null,
      email: null,

      login: async (username, password) => {
        try {
          const hashedPassword = hashPassword(password);
          const response: CloudAuthResponse = await cloudService.login(username, hashedPassword);
          
          cloudService.setToken(response.token);
          
          // Sync with CloudStore
          useCloudStore.getState().login(response.user, response.token);
          
          set({
            isLoggedIn: true,
            user: response.user,
            username: response.user.username,
            email: response.user.email || null,
            token: response.token,
          });
        } catch (error: any) {
          console.error('Login error:', error);
          throw new Error(error.message || '登录失败');
        }
      },

      register: async (username, password, email, code) => {
        try {
          const hashedPassword = hashPassword(password);
          const response: CloudAuthResponse = await cloudService.register(username, hashedPassword, email, code);
          
          cloudService.setToken(response.token);
          
          // Sync with CloudStore
          useCloudStore.getState().login(response.user, response.token);
          
          set({
            isLoggedIn: true,
            user: response.user,
            username: response.user.username,
            email: response.user.email || null,
            token: response.token,
          });
        } catch (error: any) {
          console.error('Register error:', error);
          throw new Error(error.message || '注册失败');
        }
      },

      sendVerificationCode: async (email, type) => {
        try {
          await cloudService.sendVerificationCode(email, type);
        } catch (error: any) {
          console.error('Send code error:', error);
          throw new Error(error.message || '发送验证码失败');
        }
      },

      resetPassword: async (email, code, newPassword) => {
        try {
          const hashedPassword = hashPassword(newPassword);
          await cloudService.resetPassword(email, code, hashedPassword);
        } catch (error: any) {
          console.error('Reset password error:', error);
          throw new Error(error.message || '重置密码失败');
        }
      },

      logout: async () => {
        try {
          await cloudService.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          cloudService.setToken(null);
          
          // Sync with CloudStore
          useCloudStore.getState().logout();
          
          set({
            isLoggedIn: false,
            user: null,
            username: null,
            token: null,
            email: null,
          });
        }
      },

      loadUser: async () => {
        const { token } = get();
        if (!token) return;
        
        try {
          cloudService.setToken(token);
          const user = await cloudService.getUser();
          
          // Sync with CloudStore
          useCloudStore.getState().login(user, token);
          
          set({
            user,
            username: user.username,
            email: user.email || null,
          });
        } catch (error) {
          console.error('Load user error:', error);
          
          // Sync with CloudStore
          useCloudStore.getState().logout();
          
          set({ isLoggedIn: false, user: null, token: null });
        }
      },
    }),
    {
      name: 'termtool-user',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isLoggedIn: state.isLoggedIn,
        user: state.user,
        username: state.username,
        token: state.token,
        email: state.email,
      }),
    }
  )
);
