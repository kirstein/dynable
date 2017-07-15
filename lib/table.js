'use strict';

const Promise = require('bluebird');
const Aws = require('aws-sdk');
const deasync = require('deasync-promise');
const util = require('util')
const _ = require('lodash');

function iteratable(fn, params, res) {
  Object.defineProperty(res.Items, '__hasNext', {
    configurable: false,
    enumerable: false,
    value: () => {
      return fn.call(this, _.extend(params, { ExclusiveStartKey: res.LastEvaluatedKey }));
    }
  });
  return res.Items;
}

class Table {
  constructor(tableName) {
    this.tableName = tableName;
    this.dynamodb = new Aws.DynamoDB({
      params: { TableName: this.tableName }
    });
    this.docClient = new Aws.DynamoDB.DocumentClient({
      params: { TableName: this.tableName }
    });
  }

  describe() {
    const promise = this.dynamodb.describeTable().promise();
    return deasync(promise).Table;
  }

  scan(params) {
    const promise = this.docClient.scan(params).promise();
    return iteratable.call(this, this.scan, params, deasync(promise));
  }

  query(params) {
    const promise = this.docClient.query(params).promise();
    return iteratable.call(this, this.query, params, deasync(promise));
  }

  get(key) {
    const promise = this.docClient.get({ Key: key }).promise();
    return deasync(promise).Item;
  }

  describeTimeToLive() {
    const promise = this.dynamodb.describeTimeToLive().promise();
    return deasync(promise);
  }

  updateTable(params) {
    const promise = this.dynamodb.updateTable(params).promise();
    return deasync(promise);
  }

  put(params) {
    const promise = this.dynamodb.put(params).promise();
    return deasync(promise);
  }

  update(params) {
    const promise = this.dynamodb.update(params).promise();
    return deasync(promise);
  }

  delete(params) {
    const promise = this.dynamodb.delete(params).promise();
    return deasync(promise);
  }

  toString() {
    const props = ['tableName'].concat(Object.getOwnPropertyNames(Table.prototype));
    const fns = _(props).without('inspect', 'toString', 'constructor').reduce((carry, key) => {
      carry[key] = this[key];
      return carry;
    }, {});
    return util.inspect(fns, { colors: true });
  }

  inspect() {
    return this.toString();
  }
}

module.exports = Table;
