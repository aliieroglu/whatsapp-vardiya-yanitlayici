'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { StateStore } = require('../src/state-store');

async function fixture(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'shift-state-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  return path.join(dir, 'private', 'state.json');
}

test('claims once and remembers it after restarting', async (t) => {
  const file = await fixture(t);
  const store = await StateStore.open(file);
  assert.equal(await store.claim('m1', 10000, 0), 'claimed');
  assert.equal(await store.claim('m1', 10001, 0), 'duplicate');
  const reopened = await StateStore.open(file);
  assert.equal(await reopened.claim('m1', 10002, 0), 'duplicate');
});

test('concurrent events cannot claim the same message twice', async (t) => {
  const store = await StateStore.open(await fixture(t));
  assert.deepEqual(await Promise.all([
    store.claim('m1', 10000, 0), store.claim('m1', 10000, 0),
  ]), ['claimed', 'duplicate']);
});

test('cooldown prevents a second shift reply', async (t) => {
  const store = await StateStore.open(await fixture(t));
  assert.equal(await store.claim('m1', 10000, 180), 'claimed');
  assert.equal(await store.claim('m2', 10001, 180), 'cooldown');
  assert.equal(await store.claim('m2', 191000, 180), 'claimed');
});

test('private state is not created with world-readable permissions', async (t) => {
  const file = await fixture(t);
  const store = await StateStore.open(file);
  await store.claim('m1', 10000, 0);
  assert.equal((await fs.stat(file)).mode & 0o077, 0);
  assert.equal((await fs.stat(path.dirname(file))).mode & 0o077, 0);
});

test('corrupt state fails closed rather than losing duplicate protection', async (t) => {
  const file = await fixture(t);
  await fs.mkdir(path.dirname(file));
  await fs.writeFile(file, '{broken');
  await assert.rejects(() => StateStore.open(file), /state/i);
});
