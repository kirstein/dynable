'use strict';

module.exports = (replServer, { command, help, fn }) => {
  Object.defineProperty(replServer.context, help, {
    configurable: false,
    enumerable: true,
    get: fn
  });

  replServer.defineCommand(command, {
    help: help,
    action: fn
  });
};
