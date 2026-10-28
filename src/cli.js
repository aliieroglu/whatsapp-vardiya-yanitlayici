'use strict';
const { isShiftCall } = require('./matcher');
const { loadConfig } = require('./config');

async function main(argv = process.argv.slice(2)) {
  const [command, ...rest] = argv;
  if (command === 'check') {
    if (!rest.length || !rest.join(' ').trim()) throw new Error('A sample message is required');
    console.log(isShiftCall(rest.join(' ')) ? 'MATCH' : 'NO_MATCH');
    return;
  }
  if (command !== 'groups' && command !== 'run') throw new Error('Choose check, groups, or run');
  const config = loadConfig(process.env, command);
  const { Client, LocalAuth } = require('whatsapp-web.js');
  const { startWhatsApp } = require('./app');
  await startWhatsApp({ config, command, Client, LocalAuth });
}

if (require.main === module) main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
module.exports = { main };
