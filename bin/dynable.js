#!/usr/bin/env node

'use strict';

const repl = require('repl');
const Aws = require('aws-sdk');
const fs = require('fs');
const _ = require('lodash');
const util = require('util');
const Promise = require('bluebird');
const readlastline = require('read-last-lines');
const yargs = require('yargs');

const REPL_HISTORY = '.dyndb_repl.history';

const argv = yargs
  .usage('Usage: dynamble [options]')
  .option('region', { alias: 'r', describe: 'define aws region', type: 'string' })
  .help('h').alias('h', 'help').argv;

const awsProps = {};
if (argv.region) {
  console.log(`setting region to ${argv.region}`);
  awsProps.region = argv.region;
}
Aws.config.update(awsProps);

const commands = require('../commands');
const emitter = require('../lib/emitter');

/**
 * Pretty log messages.
 *
 * @param {Object} obj object to prettyprint
 * @return {Undefined} void
 */
function log(obj) {
  console.log(util.inspect(obj, {
    showHidden: false,
    depth: null,
    colors: true
  }));
}

/**
 * Custom writer function for our repl
 *
 * If we are dealing with arrays then instead of just printing out arrays in full lets print each element out.
 * This allows us to print out unlimited length arrays
 *
 * @param {Object} obj object to analyze and write
 * @return {string} empty string
 */
function replWriter(obj) {
  if (_.isArray(obj)) {
    _.each(obj, itm => log(itm));
  } else {
    log(obj);
  }
  emitter.emit('write', obj);
  return '';
}

/**
 * Write command to history if it does not exists there already
 *
 * @param {string} cmd command to write
 * @return {Undefined} void
 */
const persistHistory = Promise.coroutine(function * (cmd) {
  if (cmd.trim().length && cmd !== '.history' && cmd !== 'it') {
    try {
      const lastLine = yield readlastline.read(REPL_HISTORY, 1);
      if (lastLine.trim() === cmd.trim()) { return; }
    // eslint-disable-next-line
    } catch (err) {
    }
    yield Promise.promisify(fs.appendFile)(REPL_HISTORY, `${cmd.trim()}\n`);
  }
});

const replServer = repl.start({ prompt: '> ', writer: replWriter });

replServer.on('line', persistHistory);
try {
  fs.readFileSync(REPL_HISTORY)
    .toString()
    .split('\n')
    .reverse()
    .filter(line => line.trim())
    .map(line => replServer.rli.history.push(line));
// eslint-disable-next-line
} catch (err) { }

commands.init(replServer);
