import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import { watchSshConnection } from './sshLifecycle.js';

test('handles a late SSH error and reports disconnection only once', () => {
  const connection = new EventEmitter();
  const errors = [];
  const onDisconnect = (error) => errors.push(error);
  const lifecycle = watchSshConnection(connection, onDisconnect);
  const timeout = new Error('Keepalive timeout');

  assert.doesNotThrow(() => connection.emit('error', timeout));
  connection.emit('close');

  assert.equal(lifecycle.isDisconnected(), true);
  assert.deepEqual(errors, [timeout]);
});

test('reports a cleanly ended SSH connection once', () => {
  const connection = new EventEmitter();
  let disconnectCount = 0;
  const lifecycle = watchSshConnection(connection, () => disconnectCount++);

  connection.emit('end');
  connection.emit('close');

  assert.equal(lifecycle.isDisconnected(), true);
  assert.equal(disconnectCount, 1);
});
