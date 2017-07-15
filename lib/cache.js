'use strict';

const cache = {};

exports.get = (key) => {
  return cache[key];
};

exports.set = (key, val) => {
  return cache[key] = val;
};
