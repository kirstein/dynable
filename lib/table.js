'use strict';

const Aws = require('aws-sdk');
const Promise = require('bluebird');
const deasync = require('deasync-promise');
const util = require('util');
const _ = require('lodash');

const cw = new Aws.CloudWatch();

/**
 * Creates a custom iteratable object.
 * This allows us to track what was the results state, were there any more results etc
 *
 * @param {Function} fn target function
 * @param {Object} params original call params
 * @param {Object} res original call results
 * @return {Array} array with custom __hasNext property
 */
function iteratable(fn, params, res) {
  if (res.LastEvaluatedKey) {
    Object.defineProperty(res.Items, '__hasNext', {
      configurable: false,
      enumerable: false,
      value: () => {
        return fn.call(this, _.extend(params, { ExclusiveStartKey: res.LastEvaluatedKey }));
      }
    });
  }
  return res.Items;
}

/**
 * @param {Object} resource resource to map
 * @return {Object} mapped results
 */
function mapThroughput(resource) {
  return [
    { metric: 'ProvisionedReadCapacityUnits', value: _.get(resource, 'ProvisionedThroughput.ReadCapacityUnits') },
    { metric: 'ProvisionedWriteCapacityUnits', value: _.get(resource, 'ProvisionedThroughput.WriteCapacityUnits') }
  ]
}

const fetchMetrics = Promise.coroutine(function * (tableName, indexName, period, duration) {
  const dimensions = [{
    Name: 'TableName',
    Value: tableName
  }];
  if (indexName) {
    dimensions.push({
      Name: 'GlobalSecondaryIndexName',
      Value: indexName
    });
  }
  const results = yield Promise.map(['ConsumedReadCapacityUnits', 'ConsumedWriteCapacityUnits'], metric => {
    return cw.getMetricStatistics({
      EndTime: Date.now() / 1000,
      MetricName: metric,
      Namespace: 'AWS/DynamoDB',
      Period: period,
      StartTime: (Date.now() / 1000) - duration * 60,
      Dimensions: dimensions,
      Statistics: ['Sum']
    }).promise().then(({ Datapoints }) => {
      const sum = _.sumBy(Datapoints, 'Sum');
      return {
        metric: metric,
        value: Math.round(sum ? sum / (duration * 60) : 0)
      };
    });
  });
  return _.flatten(results);
});

const fetchStats = Promise.coroutine(function * (resources) {
  const period = 5;
  const duration = 60;
  const base = yield fetchMetrics(resources.TableName, null, period, duration);
  const indexes = yield Promise.map(resources.GlobalSecondaryIndexes || [], (index) => {
    return fetchMetrics(resources.TableName, index.IndexName, period, duration).then(res => ({
      [index.IndexName]: _.concat(res, mapThroughput(index))
    }));
  });
  return {
    period: period * 60 * 1000,
    duration: duration * 60 * 1000,
    table: _.concat(base, mapThroughput(resources)),
    globalSecondaryIndexes: _.first(_.flatten(indexes))
  };
});

class Table {
  /**
   * @param {string} tableName actual name of the table
   */
  constructor(tableName) {
    this.tableName = tableName;
    this.dynamodb = new Aws.DynamoDB({
      params: { TableName: this.tableName }
    });
    this.docClient = new Aws.DynamoDB.DocumentClient({
      params: { TableName: this.tableName }
    });
  }

  /**
   * @return {Object} described table
   */
  describe() {
    const promise = this.dynamodb.describeTable().promise();
    return deasync(promise).Table;
  }

  /**
   * Scan results are iteratable and can be scrolled forward with `it` command
   *
   * @param {Object} params scan params
   * @return {Array} iteratable array
   */
  scan(params) {
    const promise = this.docClient.scan(params).promise();
    return iteratable.call(this, this.scan, params, deasync(promise));
  }

  /**
   * Query results are iteratable and can be scrolled forward with `it` command
   *
   * @param {Object} params query params
   * @return {Array} iteratable array
   */
  query(params) {
    const promise = this.docClient.query(params).promise();
    return iteratable.call(this, this.query, params, deasync(promise));
  }

  /**
   * @param {Object} key dynamodb key object
   * @return {Object} fetched object
   */
  get(key) {
    const promise = this.docClient.get({ Key: key }).promise();
    return deasync(promise).Item;
  }

  /**
   * @return {Object} ttl properties
   */
  describeTimeToLive() {
    const promise = this.dynamodb.describeTimeToLive().promise();
    return deasync(promise);
  }

  /**
   * @param {Object} params params to update
   * @return {Object} update results
   */
  updateTable(params) {
    const promise = this.dynamodb.updateTable(params).promise();
    return deasync(promise);
  }

  /**
   * @param {Object} params data to put
   * @return {Object} put results
   */
  put(params) {
    const promise = this.dynamodb.put(params).promise();
    return deasync(promise);
  }

  /**
   * @param {Object} params data to update
   * @return {Object} update results
   */
  update(params) {
    const promise = this.dynamodb.update(params).promise();
    return deasync(promise);
  }

  /**
   * @param {Object} params data to delete
   * @return {Object} delete results
   */
  delete(params) {
    const promise = this.dynamodb.delete(params).promise();
    return deasync(promise);
  }

  stats() {
    const resources = this.describe();
    return deasync(fetchStats(resources));
  }

  /**
   * @return {string} overridden toString string
   */
  toString() {
    const props = ['tableName'].concat(Object.getOwnPropertyNames(Table.prototype));
    const fns = _(props).without('inspect', 'toString', 'constructor').reduce((carry, key) => {
      carry[key] = this[key];
      return carry;
    }, {});
    return util.inspect(fns, { colors: true });
  }

  /**
   * @return {string} overriden inspect value
   */
  inspect() {
    return this.toString();
  }
}

module.exports = Table;
