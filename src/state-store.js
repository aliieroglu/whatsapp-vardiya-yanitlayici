'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

class StateStore {
  constructor(file, state) {
    this.file = file;
    this.state = state;
    this.queue = Promise.resolve();
  }

  static async open(file) {
    const dir = path.dirname(file);
    await fs.mkdir(dir, { recursive: true, mode: 0o700 });
    await fs.chmod(dir, 0o700);
    let state = { messages: {}, lastReplyAt: null };
    try {
      state = JSON.parse(await fs.readFile(file, 'utf8'));
    } catch (error) {
      if (error.code !== 'ENOENT') throw new Error('Private state is corrupt or unreadable; refusing to send', { cause: error });
    }
    if (!state || !state.messages || typeof state.messages !== 'object' ||
        Array.isArray(state.messages) ||
        (state.lastReplyAt !== null && !Number.isFinite(state.lastReplyAt)) ||
        Object.values(state.messages).some((value) => !Number.isFinite(value))) {
      throw new Error('Private state is invalid; refusing to send');
    }
    return new StateStore(file, state);
  }

  async claim(id, nowMs, cooldownSeconds) {
    const result = this.queue.then(() => this.#claim(id, nowMs, cooldownSeconds));
    this.queue = result.then(() => undefined, () => undefined);
    return result;
  }

  async #claim(id, nowMs, cooldownSeconds) {
    if (Object.hasOwn(this.state.messages, id)) return 'duplicate';
    if (this.state.lastReplyAt !== null && nowMs - this.state.lastReplyAt < cooldownSeconds * 1000) {
      return 'cooldown';
    }
    const messages = Object.fromEntries(Object.entries(this.state.messages)
      .filter(([, timestamp]) => nowMs - timestamp < 24 * 60 * 60 * 1000));
    messages[id] = nowMs;
    const next = { messages, lastReplyAt: nowMs };
    const temp = `${this.file}.${randomUUID()}.tmp`;
    try {
      await fs.writeFile(temp, JSON.stringify(next), { mode: 0o600, flag: 'wx' });
      await fs.rename(temp, this.file);
    } finally {
      await fs.rm(temp, { force: true });
    }
    this.state = next;
    return 'claimed';
  }
}
module.exports = { StateStore };
