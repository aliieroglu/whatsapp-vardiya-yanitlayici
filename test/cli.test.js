'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const cli = path.join(__dirname, '..', 'src', 'cli.js');
function run(...args) { return spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' }); }

test('offline check classifies an invitation without connecting or sending', () => {
  const result = run('check', '18:00 için kimler gelebilir?');
  assert.equal(result.status, 0);
  assert.match(result.stdout, /MATCH/);
});

test('offline check rejects non-invitations', () => {
  const result = run('check', '18:00 toplantı başladı');
  assert.equal(result.status, 0);
  assert.match(result.stdout, /NO_MATCH/);
});

test('offline check needs a message and unknown command fails', () => {
  assert.notEqual(run('check').status, 0);
  assert.notEqual(run('oops').status, 0);
});
