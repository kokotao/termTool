/**
 * @description Watches an SSH connection and normalizes its terminal events.
 * @author Albert_Luo
 * @email 480199976@qq.com
 * @date 2026-11-22 08:53
 */
export function watchSshConnection(_connection, _onDisconnect) {
  let disconnected = false;

  const handleDisconnect = (error) => {
    if (disconnected) return;
    disconnected = true;
    _onDisconnect(error);
  };

  _connection.on('error', handleDisconnect);
  _connection.once('end', () => handleDisconnect());
  _connection.once('close', () => handleDisconnect());

  return { isDisconnected: () => disconnected };
}
