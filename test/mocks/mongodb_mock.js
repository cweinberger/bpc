/* jshint node: true */
'use strict';


const MockedDB = require('mongo-mock');
const MongoClient = MockedDB.MongoClient;
const test_data = require('../data/test_data');


const mongoDbConnection = 'mongodb://mockingbird:27017/hasflown';
let db;


// Establish connection and perform error handling.
console.log('Connecting to MongoDB MOCK on ' + `${mongoDbConnection}`);
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
  return db.collection(collectionName);
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
