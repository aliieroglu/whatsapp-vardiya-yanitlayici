'use strict';
const fs = require('node:fs');
const fsp = require('node:fs/promises');

async function acquireLock(file) {
  let handle;
  try {
    handle = await fsp.open(file, 'wx', 0o600);
  } catch (error) {
    if (error.code === 'EEXIST') throw new Error('WhatsApp profile is already running; inspect the lock before removing it');
    throw error;
  }
  await handle.writeFile(String(process.pid));
  const onExit = () => { try { fs.unlinkSync(file); } catch {} };
  process.once('exit', onExit);
  let released = false;
  return async () => {
    if (released) return;
    released = true;
    process.off('exit', onExit);
    await handle.close();
    await fsp.unlink(file);
  };
}
module.exports = { acquireLock };
