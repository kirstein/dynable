'use strict';

const defineCommand = require('../../lib/define-command');
const pkg = require('../../package.json');

function displayVersion() {
  console.log(pkg.version);
}

module.exports = (replServer) => {
  defineCommand(replServer, {
    command: 'version',
    help: 'display version',
    fn: displayVersion
  });
};
