'use strict';
const { isShiftCall } = require('./matcher');

function createProcessor({ config, store, send, now = () => Date.now(), readyAtMs,
  isActive = () => true, log = () => {} }) {
  return async function processMessage(message) {
    if (!isActive()) return 'stopped';
    if (!message || message.fromMe || message.from !== config.groupId ||
        message.type !== 'chat' || !message.id?._serialized ||
        !message.author || (config.allowedSenders.size && !config.allowedSenders.has(message.author))) {
      return 'ignored';
    }
    const receivedAtMs = message.timestamp * 1000;
    const currentMs = now();
    if (!Number.isFinite(receivedAtMs) || receivedAtMs < readyAtMs ||
        receivedAtMs > currentMs || currentMs - receivedAtMs > config.maxAgeSeconds * 1000 ||
        !isShiftCall(message.body, config.phrases)) return 'ignored';

    if (config.mode === 'dry-run') {
      log(`dry-run sender=${message.author}`);
      return 'dry-run';
    }
    // Persist before sending: a crash or ambiguous send failure must not duplicate a reply.
    const claim = await store.claim(message.id._serialized, currentMs, config.cooldownSeconds);
    if (claim !== 'claimed') return claim;
    if (!isActive()) return 'stopped';
    try {
      await send(config.groupId, config.reply);
      log('sent');
      return 'sent';
    } catch {
      log('send-error');
      return 'send-error';
    }
  };
}
module.exports = { createProcessor };
