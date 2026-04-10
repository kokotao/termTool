/**
 * 作者：albert_luo
 * 文件作用：Vite 配置入口（同时驱动 Renderer 与 Electron Main/Preload 构建）
 */
import { defineConfig } from 'vite'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        // 主进程使用 ESM 输出，并与 package.json 的 "type": "module" 保持一致，避免 CJS/ESM 混用导致启动失败
        entry: 'electron/main.ts',
        vite: {
          build: {
            lib: {
              entry: 'electron/main.ts',
              formats: ['es'],
              fileName: () => 'main.js',
            },
            rollupOptions: {
              // 主进程不建议把三方依赖打进单文件：直接走运行时的 node_modules，
              // 可以避免 CommonJS 转换带来的边界解析问题，也能显著降低产物体积。
              external: (id) => {
                if (id.startsWith('.') || path.isAbsolute(id)) return false
                return true
              },
            },
          },
        },
      },
      preload: {
        // Shortcut of `build.rollupOptions.input`.
        // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
        input: path.join(__dirname, 'electron/preload.ts'),
      },
      // Ployfill the Electron and Node.js built-in modules for Renderer process.
      // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
      renderer: {},
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './shared')
    }
  },
  server: {
    port: 5173,
    strictPort: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})
