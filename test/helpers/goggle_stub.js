'use strict';

const sinon = require('sinon');
const test_data = require('../data/test_data');

console.log('Using Google MOCK');

let tokeninfoStub = sinon.stub();

module.exports.tokeninfo = tokeninfoStub;
