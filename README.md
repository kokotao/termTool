# termTool

termTool 是一个跨平台的 SSH / SFTP 桌面管理工具，基于 Electron + React + TypeScript。

## 功能特性

- SSH 终端连接与会话管理
- SFTP 远程文件浏览、上传、下载与管理
- 本地文件管理与拖拽支持
- 密钥生成与连接配置管理
- 桌面端自动检查更新（GitHub Releases）

## 技术栈

- Electron 28
- React 18
- TypeScript 5
- Vite 5
- Tailwind CSS

## 本地开发

```bash
npm install
npm run electron:dev
```

## 打包构建

```bash
npm run electron:build
```

构建产物默认位于 `release/` 目录。

## 项目结构

```text
electron/        Electron 主进程与 preload
src/             前端页面与业务逻辑
shared/          主进程/渲染进程共享类型与常量
dist-electron/   Electron 构建产物
dist/            前端构建产物
release/         安装包产物（DMG 等）
```

## 作者信息

- Author: `albert_luo`
- Email: `480199976@qq.com`

## License

MIT
