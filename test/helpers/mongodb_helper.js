/* jshint node: true */
'use strict';

if (process.env.NODE_ENV !== 'test') {
  console.error('NODE_ENV is not set to test')
  process.exit(1);
}

const test_data = require('../data/test_data');
const MongoDB = require('./../../server/mongo/mongodb_client');

module.exports = MongoDB;

module.exports.initate = function (done) {
  return MongoDB.ready
  .then(() => module.exports.clear())
  .then(() => module.exports.fill())
  .then(() => {
    if (typeof done === 'function') {
      done();
    }
  });
};

module.exports.reset = module.exports.initate;


module.exports.clear = function (done){
  var k = Object.keys(test_data).map(function(collectionKey){
    return MongoDB.collection(collectionKey).remove({});
  });

  return Promise.all(k)
  .then(() => Promise.resolve());
}


module.exports.fill = function (done){
  var k = Object.keys(test_data).map(function(collectionKey){
    if (Object.keys(test_data[collectionKey]).length === 0) {return Promise.resolve();}
    return MongoDB.collection(collectionKey).insert(objectToArray(test_data[collectionKey]))
  });

  return Promise.all(k);

  function objectToArray(input){
    return Object.keys(input).map(function(key){
      return input[key];
    });
  }
}
