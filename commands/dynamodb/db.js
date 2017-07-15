'use strict';

const _ = require('lodash');
const Aws = require('aws-sdk');
const deasync = require('deasync-promise');

const aliases = ['db', 'dynamodb', 'dyndb'];

const tableCmds = {
  // Describes aws dynamodb limits
  describeLimits() {
    const dynamodb = new Aws.DynamoDB();
    return deasync(dynamodb.describeLimits().promise());
  }
};

module.exports = (replServer) => {
  return _.map(aliases, alias => {
    Object.defineProperty(replServer.context, alias, {
      configurable: false,
      enumerable: true,
      value: tableCmds
    });
  });
};
