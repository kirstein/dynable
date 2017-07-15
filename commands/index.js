'use strict';

const _ = require('lodash');

const commands = [
  require('./general/help'),
  require('./general/version'),
  require('./general/it'),
  require('./dynamodb/t'),
  require('./dynamodb/db')
]

exports.init = (replServer) => {
  return _.map(commands, cmd => cmd(replServer));
};
