'use strict';

const Aws = require('aws-sdk');
const deasync = require('deasync-promise');
const util = require('util');
const _ = require('lodash');

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
