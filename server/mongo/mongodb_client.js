/* jshint node: true */
'use strict';

// Import dependencies.
const MongoClient = require('mongodb').MongoClient;

// Configure database connection.
const mongoDbConnection = process.env.MONGODB_CONNECTION || 'mongodb://localhost:27017/bpc';
let db, user = '';

// Handle user+password combination if provided.
if (process.env.MONGODB_USER && process.env.MONGODB_PASS) {
  user = `${process.env.MONGODB_USER}:${process.env.MONGODB_PASS}@`;
}

// Establish connection and perform error handling.
MongoClient.connect(mongoDbConnection, (err, database) => {
  if (err) {
    throw err;
  }
  db = database;
  console.log('Connecting to MongoDB on ' + `${mongoDbConnection}`);
});

module.exports.close = function(callback) {
  return db.close(callback);
};

module.exports.collection = function(collectionName) {
  return db.collection(collectionName);
};
