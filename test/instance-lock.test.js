'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { acquireLock } = require('../src/instance-lock');

test('only one process may use the WhatsApp profile at a time', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'shift-lock-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'instance.lock');
  const release = await acquireLock(file);
  await assert.rejects(() => acquireLock(file), /already running/i);
  await release();
  const releaseAgain = await acquireLock(file);
  await releaseAgain();
});
