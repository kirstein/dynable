'use strict';

const _ = require('lodash');

const emitter = require('../../lib/emitter');

let lastFn;

module.exports = (replServer) => {
  emitter.on('write', obj => {
    lastFn = _.get(obj, '__hasNext');
    if (lastFn) {
      console.log('>> type `it` for next page');
    }
  });

  Object.defineProperty(replServer.context, 'it', {
    configurable: false,
    enumerable: false,
    get() {
      return lastFn && lastFn();
    }
  });
};
