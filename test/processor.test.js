'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { StateStore } = require('../src/state-store');
const { createProcessor } = require('../src/processor');
const { loadConfig } = require('../src/config');

const now = 2000000000000;
const groupId = '12345@g.us';
const sender = '111@c.us';
const call = { id: { _serialized: 'msg-1' }, from: groupId, author: sender,
  type: 'chat', body: '18:00 için kimler gelebilir?', timestamp: Math.floor(now / 1000), fromMe: false };

async function setup(t, env = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'shift-processor-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const store = await StateStore.open(path.join(dir, 'state.json'));
  const sent = [];
  const events = [];
  const config = loadConfig({ SHIFT_GROUP_ID: groupId, ALLOWED_SENDERS: sender, ...env });
  const processMessage = createProcessor({ config, store, now: () => now,
    readyAtMs: now - 3000, send: async (to, text) => sent.push([to, text]), log: (code) => events.push(code) });
  return { processMessage, sent, events, store, config };
}

test('dry-run detects a fresh invitation without sending or claiming it', async (t) => {
  const { processMessage, sent, events, store } = await setup(t);
  assert.equal(await processMessage(call), 'dry-run');
  assert.deepEqual(sent, []);
  assert.deepEqual(events, [`dry-run sender=${sender}`]);
  assert.equal(await store.claim('msg-1', now, 0), 'claimed');
});

test('auto mode sends once to the selected group and never again for the same message', async (t) => {
  const { processMessage, sent } = await setup(t, { MODE: 'auto' });
  assert.equal(await processMessage(call), 'sent');
  assert.equal(await processMessage(call), 'duplicate');
  assert.deepEqual(sent, [[groupId, 'ok']]);
});

test('ignores other groups, unknown senders, self messages, media, and non-calls', async (t) => {
  const { processMessage, sent } = await setup(t, { MODE: 'auto' });
  for (const change of [
    { from: 'other@g.us' }, { author: '222@c.us' }, { fromMe: true },
    { type: 'image' }, { body: '18:00 toplantı hatırlatması' }, { id: null },
  ]) assert.equal(await processMessage({ ...call, ...change }), 'ignored');
  assert.deepEqual(sent, []);
});

test('ignores stale or pre-start messages and limits repeats across different invitations', async (t) => {
  const { processMessage, sent } = await setup(t, { MODE: 'auto' });
  assert.equal(await processMessage({ ...call, timestamp: Math.floor((now - 61000) / 1000) }), 'ignored');
  assert.equal(await processMessage({ ...call, timestamp: Math.floor((now - 4000) / 1000) }), 'ignored');
  assert.equal(await processMessage(call), 'sent');
  assert.equal(await processMessage({ ...call, id: { _serialized: 'msg-2' } }), 'cooldown');
  assert.equal(sent.length, 1);
});

test('disconnect during a pending claim never starts a new send', async (t) => {
  const { config } = await setup(t, { MODE: 'auto' });
  let active = true;
  let finishClaim;
  const sent = [];
  const processMessage = createProcessor({ config, readyAtMs: now - 3000, now: () => now,
    store: { claim: () => new Promise((resolve) => { finishClaim = resolve; }) },
    isActive: () => active, send: async (...args) => sent.push(args) });
  const pending = processMessage(call);
  active = false;
  finishClaim('claimed');
  assert.equal(await pending, 'stopped');
  assert.deepEqual(sent, []);
});

test('send failure is not retried blindly after an uncertain outcome', async (t) => {
  const { config, store } = await setup(t, { MODE: 'auto' });
  let attempts = 0;
  const processMessage = createProcessor({ config, store, now: () => now,
    readyAtMs: now - 3000, send: async () => { attempts++; throw new Error('uncertain'); }, log: () => {} });
  assert.equal(await processMessage(call), 'send-error');
  assert.equal(await processMessage(call), 'duplicate');
  assert.equal(attempts, 1);
});
