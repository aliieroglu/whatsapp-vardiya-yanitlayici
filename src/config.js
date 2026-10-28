'use strict';
function integer(name, value, fallback, min, max) {
  const text = value === undefined ? String(fallback) : String(value);
  const number = Number(text);
  if (!Number.isSafeInteger(number) || number < min || number > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return number;
}

function loadConfig(env = process.env, command = 'run') {
  const mode = env.MODE || 'dry-run';
  if (!['dry-run', 'auto'].includes(mode)) throw new Error('MODE must be dry-run or auto');
  const groupId = (env.SHIFT_GROUP_ID || '').trim();
  if (command === 'run' && !/^[^\s,@]+@g\.us$/.test(groupId)) {
    throw new Error('SHIFT_GROUP_ID must be an exact WhatsApp group ID ending @g.us');
  }
  const allowedSenders = new Set((env.ALLOWED_SENDERS || '').split(',').map((s) => s.trim()).filter(Boolean));
  if (command === 'run' && mode === 'auto' && allowedSenders.size === 0) {
    throw new Error('ALLOWED_SENDERS is required in auto mode');
  }
  if ([...allowedSenders].some((id) => !/^[^\s,@]+@(c\.us|lid)$/.test(id))) {
    throw new Error('ALLOWED_SENDERS must contain exact sender IDs ending @c.us or @lid');
  }
  const reply = env.REPLY_TEXT === undefined ? 'ok' : env.REPLY_TEXT.trim();
  if (!reply || reply.length > 32) throw new Error('REPLY_TEXT must contain 1-32 characters');
  const phrases = env.CALL_PHRASES
    ? env.CALL_PHRASES.split('|').map((s) => s.trim().toLocaleLowerCase('tr-TR')).filter(Boolean)
    : undefined;
  if (env.CALL_PHRASES !== undefined && !phrases.length) throw new Error('CALL_PHRASES is empty');
  return {
    mode, groupId, allowedSenders, reply, phrases,
    maxAgeSeconds: integer('MAX_AGE_SECONDS', env.MAX_AGE_SECONDS, 60, 1, 300),
    cooldownSeconds: integer('COOLDOWN_SECONDS', env.COOLDOWN_SECONDS, 180, 0, 3600),
    chromePath: (env.CHROME_PATH || '').trim() || undefined,
  };
}
module.exports = { loadConfig };
