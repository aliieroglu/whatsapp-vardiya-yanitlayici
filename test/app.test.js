'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const { loadConfig } = require('../src/config');
const { startWhatsApp } = require('../src/app');

const groupId = '12345@g.us';
const otherId = '99999@g.us';
class FakeClient extends EventEmitter {
  constructor(options) { super(); this.options = options; this.sent = []; this.destroyed = false; }
  async initialize() { this.initialized = true; }
  async getChats() { return [{ isGroup: true, id: { _serialized: groupId }, name: 'Test Shift' },
    { isGroup: true, id: { _serialized: otherId }, name: 'Other' }]; }
  async sendMessage(to, text) { this.sent.push([to, text]); return { id: 'mock' }; }
  async destroy() { this.destroyed = true; }
}
class FakeAuth { constructor(options) { this.options = options; } }
async function setup(t, command = 'run', env = {}, clock = () => Date.now(), ClientCtor = FakeClient) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'shift-app-'));
  const events = [], fatals = [];
  const config = loadConfig({ SHIFT_GROUP_ID: groupId, ALLOWED_SENDERS: '111@c.us', ...env }, command);
  const app = await startWhatsApp({ command, config, Client: ClientCtor, LocalAuth: FakeAuth,
    stateRoot: root, log: (x) => events.push(x), onFatal: (x) => fatals.push(x), isTTY: false,
    now: clock });
  t.after(async () => { await app.stop(); await fs.rm(root, { recursive: true, force: true }); });
  return { ...app, events, fatals, root };
}

test('connects with a distinct local profile, dry-run mode, and an exact group', async (t) => {
  const { client, events } = await setup(t);
  assert.equal(client.initialized, true);
  assert.match(client.options.authStrategy.options.dataPath, /auth$/);
  await client.listeners('ready')[0]();
  assert.match(events.at(-1), /dry-run/);
  const listener = client.listeners('message')[0];
  await listener({ id: { _serialized: 'm1' }, from: groupId, author: '111@c.us',
    body: '18:00 için kimler gelebilir?', type: 'chat', timestamp: Math.floor(Date.now() / 1000) });
  assert.deepEqual(client.sent, []);
});

test('auto mode ignores a pre-ready message even within the same timestamp second', async (t) => {
  let nowMs = 2000000000500;
  const { client } = await setup(t, 'run', { MODE: 'auto' }, () => nowMs);
  await client.listeners('ready')[0]();
  const processMessage = client.listeners('message')[0];
  const base = { from: groupId, author: '111@c.us', body: '18:00 için kimler gelebilir?', type: 'chat' };
  await processMessage({ ...base, id: { _serialized: 'pre-ready' }, timestamp: Math.floor(nowMs / 1000) });
  assert.deepEqual(client.sent, []);
  nowMs += 700;
  await processMessage({ ...base, id: { _serialized: 'post-ready' }, timestamp: Math.floor(nowMs / 1000) });
  assert.deepEqual(client.sent, [[groupId, 'ok']]);
});

test('disconnect disables message processing before browser teardown finishes', async (t) => {
  let finishDestroy;
  class SlowDestroyClient extends FakeClient {
    async destroy() { await new Promise((resolve) => { finishDestroy = resolve; }); this.destroyed = true; }
  }
  let nowMs = 2000000000500;
  const { client } = await setup(t, 'run', { MODE: 'auto' }, () => nowMs, SlowDestroyClient);
  await client.listeners('ready')[0]();
  nowMs += 700;
  const listener = client.listeners('message')[0];
  client.emit('disconnected');
  try {
    await listener({ id: { _serialized: 'm-after-disconnect' }, from: groupId,
      author: '111@c.us', body: '18:00 için kimler gelebilir?', type: 'chat',
      timestamp: Math.floor(nowMs / 1000) });
    assert.deepEqual(client.sent, []);
  } finally {
    finishDestroy();
    await new Promise((resolve) => setImmediate(resolve));
  }
});

test('groups command lists locally and then disconnects', async (t) => {
  const { client, events } = await setup(t, 'groups');
  await client.listeners('ready')[0]();
  assert.equal(events.filter((x) => x.includes('@g.us')).length, 2);
  assert.equal(client.destroyed, true);
});

test('QR token is never logged when no interactive terminal is available', async (t) => {
  const { client, events } = await setup(t);
  client.emit('qr', 'sensitive-qr-token');
  assert.equal(events.some((x) => x.includes('sensitive-qr-token')), false);
  assert.equal(events.some((x) => x.includes('QR')), true);
});

test('absent target group stops rather than listening to any other group', async (t) => {
  const { client, fatals } = await setup(t, 'run', { SHIFT_GROUP_ID: '55555@g.us' });
  await client.listeners('ready')[0]();
  assert.equal(client.listenerCount('message'), 0);
  assert.equal(client.destroyed, true);
  assert.equal(fatals.length, 1);
});
