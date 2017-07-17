/* jshint node: true */
'use strict';

if (module.parent.exports.lab !== undefined || process.env.NODE_ENV === 'test') {
  module.exports = require('../../test/mongodb_mocked');
  return;
}


// Import dependencies.
const MongoClient = require('mongodb').MongoClient;


// Configure database connection.
const mongoDbConnection = process.env.MONGODB_CONNECTION || 'mongodb://localhost:27017/bpc';
let db;


// Establish connection and perform error handling.
console.log('Connecting to MongoDB on ' + `${mongoDbConnection}`);
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
