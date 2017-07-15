'use strict';

const defineCommand = require('../../lib/define-command');

/**
 * @return {Undefined} void
 */
function displayHelp() {
  console.log('help');
}

module.exports = (replServer) => {
  defineCommand(replServer, {
    command: 'help',
    help: 'display help',
    fn: displayHelp
  });
};
