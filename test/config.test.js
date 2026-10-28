'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadConfig } = require('../src/config');

test('defaults to dry-run and requires an exact group ID for watching', () => {
  const config = loadConfig({ SHIFT_GROUP_ID: '120363012345678901@g.us' });
  assert.equal(config.mode, 'dry-run');
  assert.equal(config.reply, 'ok');
  assert.equal(config.groupId, '120363012345678901@g.us');
  assert.throws(() => loadConfig({}), /SHIFT_GROUP_ID/);
  assert.throws(() => loadConfig({ SHIFT_GROUP_ID: 'Group Name' }), /SHIFT_GROUP_ID/);
});

test('auto mode requires an explicit sender allowlist', () => {
  assert.throws(() => loadConfig({ MODE: 'auto', SHIFT_GROUP_ID: '12345@g.us' }), /ALLOWED_SENDERS/);
  const config = loadConfig({ MODE: 'auto', SHIFT_GROUP_ID: '12345@g.us', ALLOWED_SENDERS: '111@c.us, 222@lid' });
  assert.deepEqual(config.allowedSenders, new Set(['111@c.us', '222@lid']));
});

test('group listing works without a target group or allowlist', () => {
  assert.equal(loadConfig({}, 'groups').mode, 'dry-run');
});

test('rejects invalid operating parameters instead of silently sending', () => {
  const base = { SHIFT_GROUP_ID: '12345@g.us' };
  assert.throws(() => loadConfig({ ...base, MODE: 'automatic' }), /MODE/);
  assert.throws(() => loadConfig({ ...base, MAX_AGE_SECONDS: '0' }), /MAX_AGE_SECONDS/);
  assert.throws(() => loadConfig({ ...base, COOLDOWN_SECONDS: '-1' }), /COOLDOWN_SECONDS/);
  assert.throws(() => loadConfig({ ...base, REPLY_TEXT: ' ' }), /REPLY_TEXT/);
});
