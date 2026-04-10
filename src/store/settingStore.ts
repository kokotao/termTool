import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AppConfig, AppTheme } from '@shared/types';
import { presetThemes, termiusDarkTheme } from '../utils/themes';

interface SettingState {
  config: AppConfig;
  updateConfig: (config: Partial<AppConfig>) => void;
  resetConfig: () => void;
  getActiveTheme: () => AppTheme;
}

const defaultConfig: AppConfig = {
  themeMode: 'dark',
  currentThemeId: termiusDarkTheme.id,
  customThemes: [],
  fontSize: 14,
  fontFamily: 'Menlo, Monaco, "Courier New", monospace',
};

export const useSettingStore = create<SettingState>()(
  persist(
    (set, get) => ({
      config: defaultConfig,
      updateConfig: (updates) => set((state) => ({
        config: { ...state.config, ...updates }
      })),
      resetConfig: () => set({ config: defaultConfig }),
      getActiveTheme: () => {
        const { config } = get();
        const allThemes = [...presetThemes, ...config.customThemes];
        return allThemes.find(t => t.id === config.currentThemeId) || termiusDarkTheme;
      }
    }),
    {
      name: 'termtool-settings',
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: (persisted: any) => {
        const config = persisted?.config ?? {};

        const nextThemeMode =
          typeof config.themeMode === 'string'
            ? config.themeMode
            : typeof config.theme === 'string'
              ? config.theme
              : 'dark';

        const nextCurrentThemeId =
          typeof config.currentThemeId === 'string' ? config.currentThemeId : termiusDarkTheme.id;

        const migratedConfig: AppConfig = {
          themeMode: nextThemeMode,
          currentThemeId: nextCurrentThemeId,
          customThemes: Array.isArray(config.customThemes) ? [] : [],
          fontSize: typeof config.fontSize === 'number' ? config.fontSize : 14,
          fontFamily: typeof config.fontFamily === 'string' ? config.fontFamily : 'Menlo, Monaco, "Courier New", monospace',
        };

        return { ...persisted, config: migratedConfig };
      },
    }
  )
);
