'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const Aws = require('aws-sdk');
const deasync = require('deasync-promise');

const cache = require('../../lib/cache');
const Table = require('../../lib/table');

const dynamodb = new Aws.DynamoDB();

const listTables = Promise.coroutine(function * (nextToken) {
  let res = [];
  const opts = {};
  if (nextToken) {
    opts.ExclusiveStartTableName = nextToken;
  }
  const tableRes = yield dynamodb.listTables(opts).promise();
  res = res.concat(tableRes.TableNames);
  if (tableRes.LastEvaluatedTableName) {
    return yield listTables(tableRes.LastEvaluatedTableName);
  }
  return res;
});

/**
 * Fetch all dynamodb tables.
 * Will cache the results in memcache
 *
 * @return {Array.<Object>} list of tables
 */
function fetchTables() {
  const cached = cache.get('tables');
  if (cached) { return cached; }
  const tables = _.reduce(deasync(listTables()), (carry, tableName) => {
    const normalizedName = tableName.replace(/-/g, '_');
    const table = new Table(tableName);
    carry[normalizedName] = table;
    // Add normal tablename, but do not make it enumerable
    Object.defineProperty(carry, tableName, {
      configurable: false,
      enumerable: false,
      value: table
    });
    return carry;
  }, {});
  cache.set('tables', tables);
  return tables;
}

const displayTables = function() {
  const tables = fetchTables();
  return tables;
};

const aliases = ['t', 'table', 'tables'];

/**
 * Will populate t, table and tables properties with actual table names.
 *
 * We also populate t.<original-table-name> and t.<normalized_table_name>
 * because original table name might not be directly invokable from js
 *
 * @param {Repl} replServer repl server
 * @return {Undefined} idon
 */
module.exports = (replServer) => {
  return _.map(aliases, alias => {
    Object.defineProperty(replServer.context, alias, {
      configurable: false,
      enumerable: true,
      get: displayTables
    });
  });
};
