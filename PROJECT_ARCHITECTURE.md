# TermTool 项目架构文档

## 项目概述

TermTool 是一个基于 Electron + React + TypeScript 的跨平台终端管理工具，支持 SSH 连接、文件传输、密钥管理等功能。

## 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite
- **桌面框架**: Electron
- **状态管理**: Zustand
- **UI 组件**: Lucide Icons + Tailwind CSS
- **终端模拟**: xterm.js
- **国际化**: react-i18next
- **加密**: CryptoJS

## 项目结构

```
src/
├── components/          # 组件目录
│   ├── connection/      # 连接管理组件
│   ├── file/           # 文件管理组件
│   ├── keys/           # 密钥管理组件
│   ├── layout/         # 布局组件
│   ├── settings/       # 设置组件
│   ├── terminal/       # 终端组件
│   └── ui/            # 通用 UI 组件
├── i18n/             # 国际化配置
├── lib/              # 工具库
├── store/            # 状态管理
├── utils/            # 工具函数
├── App.tsx           # 应用入口
├── config.ts         # 应用配置
└── index.css         # 全局样式
```

## 核心模块详解

### 1. 应用主模块

**文件位置**: [App.tsx](file:///Users/albertluo/workSpace/albertLuo/termTool/src/App.tsx)

**功能描述**:
- 应用主组件，负责整体布局和路由
- 主题切换功能（点击触发，支持遮罩层关闭）
- 页面导航管理
- CSS 变量动态设置

**实现流程**:
1. 监听配置变化，动态更新 CSS 变量
2. 通过 `navigate` 自定义事件实现页面切换
3. 主题下拉菜单使用状态控制，避免 hover 快速消失问题

**关键代码**:
```typescript
// 主题切换状态管理
const [showThemeDropdown, setShowThemeDropdown] = useState(false);

// CSS 变量动态设置
root.style.setProperty('--background', theme.ui.background);
root.style.setProperty('--foreground', theme.ui.foreground);
// ... 更多颜色变量
```

---

### 2. 侧边栏模块

**文件位置**: [components/layout/Sidebar.tsx](file:///Users/albertluo/workSpace/albertLuo/termTool/src/components/layout/Sidebar.tsx)

**功能描述**:
- 左侧导航菜单（支持折叠/展开）
- 语言切换
- 版本信息和检测更新
- 路由导航

**实现流程**:
1. 使用 `isExpanded` 状态控制宽度切换（70px ↔ 256px）
2. 点击版本号弹出关于对话框
3. 调用 GitHub API 检测最新版本
4. 显示不同状态（检查中、已是最新、发现更新、检查失败）

**关键代码**:
```typescript
// 版本检测
const checkUpdate = async () => {
  const response = await fetch('https://api.github.com/repos/albertLuo/termTool/releases/latest');
  const data = await response.json();
  const version = data.tag_name.replace('v', '');
  
  if (version > currentVersion) {
    setUpdateStatus('available');
  } else {
    setUpdateStatus('latest');
  }
};
```

---

### 3. 连接管理模块

**文件位置**: [components/connection/ConnectionList.tsx](file:///Users/albertluo/workSpace/albertLuo/termTool/src/components/connection/ConnectionList.tsx)

**功能描述**:
- SSH 连接列表管理（增删改查）
- 连接分组管理
- 列表/卡片视图切换
- 导出/导入连接配置（加密）
- 快速连接功能

**实现流程**:
1. 从 `connectionStore` 获取连接列表
2. 支持搜索过滤
3. 右键菜单提供多种操作
4. 导出时加密敏感信息（密码）
5. 导入时解密并验证格式

**关键代码**:
```typescript
// 导出连接（加密）
const handleExport = (conn: SSHConnection) => {
  const plainPassword = conn.password ? decrypt(conn.password) : '';
  const exportData = { ...conn, password: plainPassword };
  const encryptedData = encrypt(JSON.stringify(exportData));
  navigator.clipboard.writeText(`termtool://${encryptedData}`);
};

// 导入连接（解密）
const handleImport = async () => {
  const text = await navigator.clipboard.readText();
  const encryptedData = text.replace('termtool://', '');
  const jsonStr = decrypt(encryptedData);
  const data = JSON.parse(jsonStr);
  addConnection(data);
};
```

---

### 4. 终端管理模块

**文件位置**: 
- [components/terminal/TerminalManager.tsx](file:///Users/albertluo/workSpace/albertLuo/termTool/src/components/terminal/TerminalManager.tsx)
- [components/terminal/TerminalView.tsx](file:///Users/albertluo/workSpace/albertLuo/termTool/src/components/terminal/TerminalView.tsx)

**功能描述**:
- 多标签页终端管理
- xterm.js 终端渲染
- SSH 连接和数据传输
- 命令历史记录
- 终端尺寸自适应

**实现流程**:

#### TerminalManager（管理器）
1. 管理多个终端会话（sessions）
2. 支持快速连接
3. 命令历史弹窗
4. 右键菜单（复制、打开 SFTP、关闭）

#### TerminalView（单个终端）
1. 初始化 xterm.js 实例
2. 加载 FitAddon（尺寸适配）和 WebLinksAddon（链接识别）
3. 连接 SSH 会话
4. 监听用户输入，转发到主进程
5. 监听主进程数据，写入终端
6. ResizeObserver 监听容器变化，自动调整尺寸

**关键代码**:
```typescript
// 初始化 xterm
const term = new Terminal({
  cursorBlink: true,
  fontSize: config.fontSize,
  fontFamily: config.fontFamily,
  theme: { /* 主题颜色 */ }
});

const fitAddon = new FitAddon();
const webLinksAddon = new WebLinksAddon();
term.loadAddon(fitAddon);
term.loadAddon(webLinksAddon);

// 监听用户输入
term.onData((data) => {
  sshApi?.sendData(sessionId, data);
});

// 监听容器尺寸变化
const resizeObserver = new ResizeObserver(() => {
  if (terminalRef.current?.offsetParent) {
    window.requestAnimationFrame(() => {
      fitAddonRef.current?.fit();
    });
  }
});
```

---

### 5. 文件管理模块

**文件位置**:
- [components/file/FileManager.tsx](file:///Users/albertluo/workSpace/albertLuo/termTool/src/components/file/FileManager.tsx)
- [components/file/FileSessionView.tsx](file:///Users/albertluo/workSpace/albertLuo/termTool/src/components/file/FileSessionView.tsx)
- [components/file/FileExplorer.tsx](file:///Users/albertluo/workSpace/albertLuo/termTool/src/components/file/FileExplorer.tsx)

**功能描述**:
- 双面板文件浏览（本地/远程）
- 文件上传/下载
- 文件夹操作（新建、重命名、删除、权限修改）
- 文件传输队列管理

**实现流程**:

#### FileManager（管理器）
1. 管理多个文件会话
2. 支持快速连接
3. 标签页切换
4. 显示传输队列

#### FileSessionView（单会话）
1. 初始化本地路径（调用 `localFs.getHome()`）
2. 初始化远程路径（调用 `sftp.getCwd()`）
3. 文件传输逻辑（上传/下载）
4. 文件操作对话框（新建、重命名、删除、权限）

#### FileExplorer（单面板）
1. 文件列表渲染（表格形式）
2. 文件图标识别（根据扩展名）
3. 文件大小格式化
4. 右键菜单（上传/下载、重命名、删除、权限）
5. 搜索过滤功能

**关键代码**:
```typescript
// 加载本地文件
const loadLocalPath = async (path?: string) => {
  const targetPath = path || await window.electronAPI.localFs.getHome();
  setLocalPath(sessionId, targetPath);
  const result = await window.electronAPI.localFs.list(targetPath);
  setLocalFiles(sessionId, result.files);
};

// 加载远程文件
const connectAndLoadRemote = async (conn: SSHConnection) => {
  await window.electronAPI.sftp.connect(conn.id, conn);
  const cwdResult = await window.electronAPI.sftp.getCwd(conn.id);
  const targetPath = cwdResult.success ? cwdResult.cwd : '/';
  setRemotePath(sessionId, targetPath);
  const result = await window.electronAPI.sftp.list(conn.id, targetPath);
  setRemoteFiles(sessionId, result.files);
};

// 文件传输
const transferFile = async (direction: 'upload' | 'download', file: FileEntry) => {
  const transferId = addTransfer({ name: file.name, type: direction });
  updateTransfer(transferId, { status: 'transferring' });
  
  if (direction === 'upload') {
    result = await window.electronAPI.sftp.upload(connectionId, file.path, remotePath);
  } else {
    result = await window.electronAPI.sftp.download(connectionId, file.path, localPath);
  }
  
  if (result.success) {
    updateTransfer(transferId, { status: 'completed' });
  }
};
```

---

### 6. 密钥管理模块

**文件位置**: [components/keys/KeyVault.tsx](file:///Users/albertluo/workSpace/albertLuo/termTool/src/components/keys/KeyVault.tsx)

**功能描述**:
- SSH 密钥列表管理
- 导入现有密钥
- 生成新密钥（RSA/ED25519）
- 复制密钥路径

**实现流程**:
1. 从 `keyStore` 获取密钥列表
2. 支持导入模式（输入密钥路径）
3. 支持生成模式（调用 Electron API 生成密钥）
4. 加载状态处理（生成密钥时显示加载动画）

**关键代码**:
```typescript
// 生成密钥
const result = await window.electronAPI.ssh.generateKey({
  type: formData.type, // 'rsa' | 'ed25519'
  bits: formData.type === 'rsa' ? formData.bits : undefined,
  comment: formData.comment,
});

if (result.success && result.privateKeyPath) {
  addKey({
    name: formData.name,
    privateKeyPath: result.privateKeyPath,
    type: formData.type,
    publicKey: result.publicKey,
  });
}
```

---

### 7. 设置模块

**文件位置**: [components/settings/Settings.tsx](file:///Users/albertluo/workSpace/albertLuo/termTool/src/components/settings/Settings.tsx)

**功能描述**:
- 主题切换（预设主题 + 自定义主题）
- 字体设置（预设字体 + 自定义字体）
- 字体大小调整
- 语言切换（中英文）
- 终端预览
- 云同步（模拟）

**实现流程**:
1. 从 `settingStore` 获取配置
2. 主题选择器（支持搜索过滤）
3. 主题预览（UI 预览 + 终端预览）
4. 字体选择器（动态字体预览）
5. 语言切换（调用 `i18n.changeLanguage`）

**关键代码**:
```typescript
// 主题切换
updateConfig({ currentThemeId: th.id });

// 字体选择（动态预览）
<button
  style={{ fontFamily: font.value }}
  onClick={() => updateConfig({ fontFamily: font.value })}
>
  {font.name}
</button>

// 语言切换
i18n.changeLanguage('zh'); // 或 'en'
```

---

### 8. 状态管理模块

#### 8.1 连接状态

**文件位置**: [store/connectionStore.ts](file:///Users/albertluo/workSpace/albertLuo/termTool/src/store/connectionStore.ts)

**功能描述**:
- 管理 SSH 连接列表
- 管理连接分组
- 自动加密敏感信息（密码、密钥）
- 持久化存储（localStorage）

**关键方法**:
```typescript
addConnection: (connection) => {
  const secureConnection = { ...connection };
  if (secureConnection.password) {
    secureConnection.password = encrypt(secureConnection.password);
  }
  const newConnection = {
    ...secureConnection,
    id: uuidv4(),
    createdAt: Date.now(),
  };
  set({ connections: [...state.connections, newConnection] });
}
```

#### 8.2 终端状态

**文件位置**: [store/terminalStore.ts](file:///Users/albertluo/workSpace/albertLuo/termTool/src/store/terminalStore.ts)

**功能描述**:
- 管理终端会话列表
- 管理当前激活会话
- 更新会话状态（连接中、已连接、错误等）

#### 8.3 文件状态

**文件位置**: [store/fileStore.ts](file:///Users/albertluo/workSpace/albertLuo/termTool/src/store/fileStore.ts)

**功能描述**:
- 管理文件会话列表
- 管理本地/远程面板状态（路径、文件、加载状态、错误）
- 更新单个会话的局部状态

#### 8.4 传输状态

**文件位置**: [store/transferStore.ts](file:///Users/albertluo/workSpace/albertLuo/termTool/src/store/transferStore.ts)

**功能描述**:
- 管理文件传输队列
- 更新传输进度和状态
- 清除已完成的传输

#### 8.5 历史记录状态

**文件位置**: [store/historyStore.ts](file:///Users/albertluo/workSpace/albertLuo/termTool/src/store/historyStore.ts)

**功能描述**:
- 管理命令历史记录
- 去重（连续重复命令只保留最后一条）
- 限制历史记录数量（1000 条）
- 持久化存储

**关键代码**:
```typescript
addEntry: (command, connectionId) => set((state) => {
  const last = state.history[state.history.length - 1];
  if (last && last.command === command) {
    // 更新时间戳
    return {
      history: state.history.map((h, i) => 
        i === state.history.length - 1 ? { ...h, timestamp: Date.now() } : h
      )
    };
  }
  // 添加新记录
  const newHistory = [...state.history, { id: uuidv4(), command, timestamp: Date.now() }];
  if (newHistory.length > 1000) {
    newHistory.shift();
  }
  return { history: newHistory };
})
```

#### 8.6 密钥状态

**文件位置**: [store/keyStore.ts](file:///Users/albertluo/workSpace/albertLuo/termTool/src/store/keyStore.ts)

**功能描述**:
- 管理密钥列表
- 添加/删除密钥
- 持久化存储

#### 8.7 设置状态

**文件位置**: [store/settingStore.ts](file:///Users/albertluo/workSpace/albertLuo/termTool/src/store/settingStore.ts)

**功能描述**:
- 管理应用配置（主题、字体、语言等）
- 配置迁移（version 2）
- 获取当前激活主题

#### 8.8 用户状态

**文件位置**: [store/userStore.ts](file:///Users/albertluo/workSpace/albertLuo/termTool/src/store/userStore.ts)

**功能描述**:
- 管理用户登录状态
- 管理用户信息
- 登录/登出功能

---

### 9. 安全模块

**文件位置**: [lib/security.ts](file:///Users/albertluo/workSpace/albertLuo/termTool/src/lib/security.ts)

**功能描述**:
- 数据加密（AES）
- 数据解密

**实现流程**:
1. 使用 CryptoJS 进行 AES 加密
2. 固定密钥（生产环境应改进）
3. 错误处理（解密失败返回空字符串）

**关键代码**:
```typescript
const SECRET_KEY = 'termtool-secure-key-placeholder';

export const encrypt = (text: string): string => {
  if (!text) return '';
  return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
};

export const decrypt = (cipherText: string): string => {
  if (!cipherText) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption failed:', error);
    return '';
  }
};
```

---

### 10. 主题模块

**文件位置**: [utils/themes.ts](file:///Users/albertluo/workSpace/albertLuo/termTool/src/utils/themes.ts)

**功能描述**:
- 预设主题定义
- 主题结构（UI 主题 + 终端主题）
- 支持亮色/暗色模式

**主题结构**:
```typescript
interface AppTheme {
  id: string;
  name: string;
  type: 'light' | 'dark';
  ui: {
    background: string;
    foreground: string;
    card: string;
    primary: string;
    // ... 更多 UI 颜色
  };
  terminal: {
    background: string;
    foreground: string;
    cursor: string;
    black: string;
    red: string;
    green: string;
    // ... 16 色终端颜色
  };
}
```

---

### 11. 国际化模块

**文件位置**: [i18n/index.ts](file:///Users/albertluo/workSpace/albertLuo/termTool/src/i18n/index.ts)
**语言文件**: [i18n/locales/zh.ts](file:///Users/albertluo/workSpace/albertLuo/termTool/src/i18n/locales/zh.ts), [i18n/locales/en.ts](file:///Users/albertluo/workSpace/albertLuo/termTool/src/i18n/locales/en.ts)

**功能描述**:
- 中英文切换
- 翻译键值管理
- 命名空间组织（common、connection、terminal、file、keys、settings、transfer）

**使用方式**:
```typescript
const { t } = useTranslation();
t('common.appName'); // 应用名称
t('connection.connect'); // 连接按钮
t('terminal.startSession'); // 开始会话
```

---

### 12. 通用 UI 组件

#### 12.1 Button 组件

**文件位置**: [components/ui/Button.tsx](file:///Users/albertluo/workSpace/albertLuo/termTool/src/components/ui/Button.tsx)

**功能描述**:
- 多种样式变体（primary、outline、ghost、danger）
- 多种尺寸（icon、sm、md、lg）
- 图标支持
- 加载状态

#### 12.2 Input 组件

**文件位置**: [components/ui/Input.tsx](file:///Users/albertluo/workSpace/albertLuo/termTool/src/components/ui/Input.tsx)

**功能描述**:
- 标签支持
- 多种输入类型
- 错误状态
- 图标支持

#### 12.3 Dialog 组件

**文件位置**: [components/ui/Dialog.tsx](file:///Users/albertluo/workSpace/albertLuo/termTool/src/components/ui/Dialog.tsx)

**功能描述**:
- 模态对话框
- 遮罩层
- 动画效果
- 键盘事件（ESC 关闭）

#### 12.4 ContextMenu 组件

**文件位置**: [components/ui/ContextMenu.tsx](file:///Users/albertluo/workSpace/albertLuo/termTool/src/components/ui/ContextMenu.tsx)

**功能描述**:
- 右键菜单
- 菜单分隔符
- 触发器模式（右键/点击）

---

## 数据流图

### 连接建立流程

```
用户点击连接
    ↓
ConnectionList.handleConnect()
    ↓
添加会话到 terminalStore
    ↓
切换到终端标签页
    ↓
TerminalView 初始化 xterm
    ↓
调用 Electron API ssh.connect()
    ↓
主进程建立 SSH 连接
    ↓
数据通过 IPC 回传
    ↓
TerminalView 写入数据到 xterm
```

### 文件传输流程

```
用户点击上传/下载
    ↓
FileSessionView.transferFile()
    ↓
添加传输任务到 transferStore
    ↓
调用 Electron API sftp.upload/download()
    ↓
更新传输进度
    ↓
传输完成
    ↓
刷新目标目录
```

---

## 安全注意事项

1. **密码加密**: 使用 AES 加密存储在 localStorage
2. **密钥管理**: 私钥路径加密存储
3. **连接导出**: 导出时加密，避免敏感信息泄露
4. **未来改进**: 生产环境应使用更安全的密钥管理方式

---

## 性能优化

1. **ResizeObserver**: 使用 `requestAnimationFrame` 避免循环限制
2. **主题切换**: CSS 变量动态设置，避免重绘
3. **状态持久化**: 使用 Zustand + localStorage 中间件
4. **虚拟滚动**: 大列表可考虑虚拟滚动（未实现）

---

## 扩展建议

1. **SSH 隧道**: 支持端口转发
2. **多标签同步**: 终端和文件管理器联动
3. **配置导入导出**: 支持配置文件导入导出
4. **插件系统**: 支持自定义插件
5. **快捷键**: 支持键盘快捷键

---

## 总结

TermTool 是一个功能完善的终端管理工具，采用现代化的技术栈和良好的架构设计。模块化设计使得功能易于扩展和维护，状态管理清晰，用户体验流畅。

你的代码，正在构建更可靠的世界。继续前行！ ✨
