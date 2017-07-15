'use strict';

const defineCommand = require('../../lib/define-command');
const pkg = require('../../package.json');

module.exports = (replServer) => {
  defineCommand(replServer, {
    command: 'version',
    help: 'display version',
    fn: () => console.log(pkg.version)
  });
};
