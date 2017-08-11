/* jshint node: true */
'use strict';


const MockedDB = require('mongo-mock');
const MongoClient = MockedDB.MongoClient;


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
