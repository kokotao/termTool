/**
 * 作者：albert_luo
 * 文件作用：补齐 Electron 主进程依赖的第三方库类型声明
 */
declare module 'electron-squirrel-startup' {
  const isSquirrelStartup: boolean
  export default isSquirrelStartup
}

declare module 'ssh2-sftp-client' {
  const SftpClient: any
  export default SftpClient
}
