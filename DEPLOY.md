# TermTool 打包部署指南

本文档详细说明了 TermTool 客户端在不同操作系统（Windows, macOS, Linux）下的打包与部署流程。

## 1. 环境准备

在开始打包之前，请确保您的开发环境满足以下要求：

*   **Node.js**: >= 18.0.0
*   **包管理器**: npm (推荐) 或 yarn / pnpm
*   **操作系统**:
    *   构建 **Windows** 包：推荐使用 Windows 系统（或在 macOS/Linux 上使用 Wine，但不推荐）
    *   构建 **macOS** 包：必须使用 macOS 系统
    *   构建 **Linux** 包：推荐使用 Linux 系统（macOS 也可构建部分 Linux 格式）

## 2. 安装依赖

在项目根目录下执行：

```bash
npm install
```

## 3. 常用构建命令

项目 `package.json` 中预置了以下构建命令：

| 命令 | 说明 |
| :--- | :--- |
| `npm run dev` | 启动前端开发服务器 (Vite) |
| `npm run electron:dev` | 启动 Electron 开发环境 (同时启动前端和 Electron 主进程) |
| `npm run build` | 仅构建前端资源 |
| `npm run build:electron` | 构建前端及 Electron 主进程 TypeScript 代码 |
| `npm run electron:build` | **执行完整的生产环境打包** (包含编译和生成安装包) |

## 4. 各平台打包说明

### 4.1 Windows 客户端

**构建产物**: NSIS 安装程序 (`.exe`)
**支持架构**: x64

#### 在 Windows 环境下构建（推荐）
直接执行：
```bash
npm run electron:build
```

#### 在 macOS 环境下构建 Windows 包
在 macOS 上构建 Windows 安装包（NSIS）需要依赖 **Wine**。

1. **安装 Wine**:
   推荐使用 Homebrew 安装：
   ```bash
   brew install --cask wine-stable
   ```
   > **⚠️ Apple Silicon (M1/M2/M3) 用户特别注意**：
   > `wine-stable` 是基于 x86 架构构建的，在 Apple Silicon 芯片上运行需要 **Rosetta 2** 转译器。
   >
   > 如果您看到关于 Rosetta 2 的提示，或者尚未安装 Rosetta 2，请先执行以下命令：
   > ```bash
   > softwareupdate --install-rosetta --agree-to-license
   > ```
   > *注意：关于 "Gatekeeper check" 的警告是已知现象，通常不影响构建过程，可以忽略。*

2. **执行构建**:
   安装完 Wine 后，执行以下命令指定构建 Windows 目标：
   ```bash
   # 仅构建 Windows 包
   npx electron-builder --win --x64
   ```
   或者使用通用构建命令（会同时尝试构建当前系统匹配的包和配置的包，可能需要调整 package.json 脚本）：
   ```bash
   npm run electron:build -- --win
   ```

构建完成后，安装包将生成在 `release/` 目录下。

**配置说明**:
Windows 相关的配置位于 `package.json` 的 `build.win` 字段：
```json
"win": {
  "target": [
    {
      "target": "nsis",
      "arch": ["x64"]
    }
  ]
}
```

### 4.2 macOS 客户端

**构建产物**: DMG 镜像 (`.dmg`)
**支持架构**: x64 (Intel), arm64 (Apple Silicon)

在 macOS 环境下执行：

```bash
npm run electron:build
```

**配置说明**:
macOS 相关的配置位于 `package.json` 的 `build.mac` 字段：
```json
"mac": {
  "category": "public.app-category.developer-tools",
  "target": [
    {
      "target": "dmg",
      "arch": ["x64", "arm64"]
    }
  ]
}
```

**注意**: 若要发布给其他用户使用，通常需要配置 Apple 开发者证书进行**代码签名 (Code Signing)** 和**公证 (Notarization)**，否则系统会提示应用未受信任。

### 4.3 Linux 客户端

虽然当前 `package.json` 主要配置了 Win 和 Mac，但 Electron Builder 原生支持 Linux。

若需构建 Linux 包（如 AppImage, deb, rpm），请修改 `package.json` 添加 `linux` 配置：

```json
"build": {
  "linux": {
    "target": ["AppImage", "deb"],
    "category": "Development"
  }
}
```

然后在 Linux (或 macOS) 下执行打包命令。

## 5. 自定义应用图标

默认情况下，Electron Builder 会使用默认图标。若需自定义，请按照以下规范准备图标文件并放入 `build/` 目录（需手动创建该目录）：

*   **macOS**: `build/icon.icns`
*   **Windows**: `build/icon.ico`
*   **Linux**: `build/icons/` 下存放 png 图片

## 6. 常见问题 (FAQ)

**Q: 打包下载 Electron 二进制文件很慢怎么办？**
A: 可以设置镜像源加速：
```bash
export ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
export ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/"
npm run electron:build
```
(Windows 下使用 `set` 或 PowerShell `$env:` 设置环境变量)

**Q: 构建报错 `ERR_ELECTRON_BUILDER_CANNOT_EXECUTE`?**
A: 通常是因为权限问题或缺少系统依赖。请确保 `node_modules` 完整，并尝试删除 `dist` 和 `release` 目录后重试。

**Q: 如何构建便携版 (Portable)？**
A: 在 `package.json` 的 `win.target` 中添加 `portable` 目标即可。

---

**生成的安装包默认位于项目的 `release/` 目录中。**
