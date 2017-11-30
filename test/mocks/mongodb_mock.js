/* jshint node: true */
'use strict';

const test_data = require('../data/test_data');

var MongoClient;
var mongoDbConnection;

const mongoDbConnectionTesting = process.env.MONGODB_CONNECTION_TESTING;
module.exports.isMock = mongoDbConnectionTesting === undefined;

if(module.exports.isMock) {
  MongoClient = require('mongo-mock').MongoClient;
  mongoDbConnection = 'mongodb://mockingbird:27017/hasflown';
} else {
  MongoClient = require('mongodb').MongoClient;
  mongoDbConnection = mongoDbConnectionTesting;
}


let db;

module.exports.ready = new Promise((resolve, reject) => {
  // Establish connection and perform error handling.
  console.log('Using MongoDB on ' + `${mongoDbConnection}`);
  MongoClient.connect(mongoDbConnection, (err, database) => {
    if (err) {
      reject();
      throw err;
    } else if (!database) {
      reject();
      throw new Error('Unable to connect to database!');
    }
    db = database;
    resolve();
  });
});


module.exports.close = function(callback) {
  return db.close(callback);
};


module.exports.collection = function(collectionName) {

  let coll = db.collection(collectionName);

  if(!module.exports.isMock) {
    return coll;
  }

  // findOneAndUpdate Not implemented in mongo-mock
  // my own simple fake findOneAndUpdate
  coll.findOneAndUpdate = function (filter, update, options) {

    options = options ? options : {};

    const updateOneOptions = {
      upsert: options.upsert,
    };

    const findOneOptions = {
      fields: options.projection,
      sort: options.sort,
      maxTimeMS: options.maxTimeMS
    };

    if (options.returnOriginal) {

      return coll.updateOne(filter, update, updateOneOptions)
      .then(() => {
        return coll.findOne(filter, findOneOptions)
        .then(user => {
          if (!user) {
            return Promise.resolve({n: 0});
          }

          return Promise.resolve({n: 1, value: user});
        });
      });

    } else {

      return coll.findOne(filter, findOneOptions)
      .then(user => {
        if (!user) {
          return Promise.resolve({n: 0});
        }

        coll.updateOne(filter, update, updateOneOptions);
        return Promise.resolve({n: 1, value: user});
      });

    }
  };

  // findOneAndDelete Not implemented in mongo-mock
  // my own simple fake findOneAndDelete
  coll.findOneAndDelete = function (filter, options) {

    options = options ? options : {};

    const findOneOptions = {
      fields: options.projection,
      sort: options.sort,
      maxTimeMS: options.maxTimeMS
    };

    return coll.findOne(filter, findOneOptions)
    .then(user => {
      if (!user) {
        return Promise.resolve({n: 0});
      }

      coll.remove(filter);
      return Promise.resolve({n: 1, value: user});
    });
  };

  return coll;

};


module.exports.initate = function (done) {
  return module.exports.ready
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
    return db.collection(collectionKey).remove({});
  });

  return Promise.all(k)
  .then(() => Promise.resolve());
}


module.exports.fill = function (done){
  var k = Object.keys(test_data).map(function(collectionKey){
    if (Object.keys(test_data[collectionKey]).length === 0) {return Promise.resolve();}
    return db.collection(collectionKey).insert(objectToArray(test_data[collectionKey]))
  });

  return Promise.all(k);

  function objectToArray(input){
    return Object.keys(input).map(function(key){
      return input[key];
    });
  }
}
