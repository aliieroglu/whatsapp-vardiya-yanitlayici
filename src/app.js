'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { StateStore } = require('./state-store');
const { acquireLock } = require('./instance-lock');
const { createProcessor } = require('./processor');

async function startWhatsApp({ config, command, Client, LocalAuth,
  stateRoot = path.join(__dirname, '..', '.local-state'),
  log = console.log, onFatal = (message) => { console.error(message); process.exitCode = 1; },
  isTTY = Boolean(process.stdout.isTTY),
  now = () => Date.now(),
  renderQr = (code) => require('qrcode-terminal').generate(code, { small: true }),
}) {
  await fs.mkdir(stateRoot, { recursive: true, mode: 0o700 });
  await fs.chmod(stateRoot, 0o700);
  const release = await acquireLock(path.join(stateRoot, 'instance.lock'));
  let client, messageListener, stopped = false;
  const stop = async () => {
    if (stopped) return;
    stopped = true;
    if (messageListener) client?.off('message', messageListener);
    process.off('SIGINT', onSignal);
    process.off('SIGTERM', onSignal);
    try { await client?.destroy(); } finally { await release(); }
  };
  const onSignal = () => { void stop(); };
  const fatal = async (message) => {
    if (stopped) return;
    onFatal(message);
    await stop();
  };

  try {
    const store = command === 'run'
      ? await StateStore.open(path.join(stateRoot, 'seen.json')) : null;
    client = new Client({
      authStrategy: new LocalAuth({ dataPath: path.join(stateRoot, 'auth'), clientId: 'vardiya' }),
      puppeteer: { headless: true, ...(config.chromePath ? { executablePath: config.chromePath } : {}) },
    });
    client.on('qr', (code) => {
      if (isTTY) renderQr(code);
      else log('QR required: run interactively on your own terminal to link the account');
    });
    client.on('auth_failure', () => { void fatal('WhatsApp authentication failed'); });
    client.on('disconnected', () => { void fatal('WhatsApp disconnected'); });
    client.on('ready', async () => {
      try {
        const chats = await client.getChats();
        if (command === 'groups') {
          for (const chat of chats.filter((item) => item.isGroup)) {
            log(`${JSON.stringify(chat.name)} ${chat.id._serialized}`);
          }
          await stop();
          return;
        }
        if (!chats.some((chat) => chat.isGroup && chat.id._serialized === config.groupId)) {
          await fatal('Target group not found; no messages will be sent');
          return;
        }
        const processor = createProcessor({ config, store,
          now, readyAtMs: now(), isActive: () => !stopped,
          send: (to, text) => client.sendMessage(to, text), log });
        messageListener = async (message) => {
          if (stopped) return 'stopped';
          try { return await processor(message); }
          catch { await fatal('Private state failed; stopping without sending'); }
        };
        client.on('message', messageListener);
        log(`ready: ${config.mode}`);
      } catch { await fatal('WhatsApp initialization failed'); }
    });
    process.once('SIGINT', onSignal);
    process.once('SIGTERM', onSignal);
    await client.initialize();
    return { client, stop };
  } catch (error) {
    await stop();
    throw error;
  }
}
module.exports = { startWhatsApp };
