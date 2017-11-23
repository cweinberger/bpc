/* jshint node: true */
'use strict';


const MockedDB = require('mongo-mock');
const MongoClient = MockedDB.MongoClient;
const test_data = require('../data/test_data');


const mongoDbConnection = 'mongodb://mockingbird:27017/hasflown';
let db;


// Establish connection and perform error handling.
console.log('Using MongoDB MOCK on ' + `${mongoDbConnection}`);
MongoClient.connect(mongoDbConnection, (err, database) => {
  if (err) {
    throw err;
  } else if (!database) {
    throw new Error('Unable to connect to database!');
  }
  db = database;
});


module.exports.close = function(callback) {
  return db.close(callback);
};


module.exports.collection = function(collectionName) {
  let coll = db.collection(collectionName)

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
  return clearMongoMock()
  .then(() => fillMongoMock())
  .then(() => {
    if (typeof done === 'function') {
      done();
    }
  });
};

module.exports.isMock = true;


function clearMongoMock (done){
  var k = Object.keys(test_data).map(function(collectionKey){
    return db.collection(collectionKey).remove({});
  });

  return Promise.all(k);
}


function fillMongoMock (done){
  var k = Object.keys(test_data).map(function(collectionKey){
    return db.collection(collectionKey).insert(objectToArray(test_data[collectionKey]))
  });

  return Promise.all(k);

  function objectToArray(input){
    return Object.keys(input).map(function(key){
      return input[key];
    });
  }
}


function random40Character() {
  return crypto.randomBytes(20).toString('hex'); // (gives 40 characters)
}
