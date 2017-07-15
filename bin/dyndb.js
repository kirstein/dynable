#!/usr/bin/env node

const repl = require('repl');
const Aws = require('aws-sdk');
const fs = require('fs');
const _ = require('lodash');
const util = require('util');

const commands = require('../commands');
const emitter = require('../lib/emitter');
const Table = require('../lib/table');

const REPL_HISTORY = '.dyndb_repl.history';
Aws.config.update({ region: 'us-east-1' });

function log(obj) {
  console.log(util.inspect(obj, {
    showHidden: false,
    depth: null,
    colors: true
  }));
}

function prettyPrint(obj) {
  if (_.isArray(obj)) {
    return _.each(obj, itm => log(itm));
  }
  return log(obj);
}

function replWriter(obj) {
  prettyPrint(obj);
  emitter.emit('write', obj);
  return '';
}

const replServer = repl.start({ prompt: '> ', writer: replWriter });

replServer.on('line', persistHistory)
try {
  fs.readFileSync(REPL_HISTORY)
    .toString()
    .split('\n')
    .reverse()
    .filter(line => line.trim())
    .map(line => replServer.rli.history.push(line));
} catch(err) {}

function persistHistory(cmd) {
  if (cmd.trim().length && cmd !== '.history' && cmd !== 'it') {
    fs.appendFileSync(REPL_HISTORY, `${cmd.trim()}\n`)
  }
}

commands.init(replServer);
