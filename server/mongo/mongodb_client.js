/* jshint node: true */
'use strict';

// Import dependencies.
const MongoClient = require('mongodb').MongoClient;

// Configure database connection.
const mongoHost = process.env.MONGODB_HOST || 'localhost';
const mongoPort = process.env.MONGODB_PORT || '27017';
const mongoDB = process.env.MONGODB_DATABASE || 'sso';
const connectionString = mongoHost + ':' + mongoPort + '/' + mongoDB;
let db, user = '', opts = {};

// Handle user+password combination if provided.
if (process.env.MONGODB_USER && process.env.MONGODB_PASS) {
  user = `${process.env.MONGODB_USER}:${process.env.MONGODB_PASS}@`;
}

// Set up as replica set if provided.
if (process.env.MONGODB_REPLSET) {
  opts.replSet = process.env.MONGODB_REPLSET;
  opts.readPreference = process.env.MONGODB_READPREFERENCE || 'primaryPreferred';
}

// Establish connection and perform error handling.
MongoClient.connect('mongodb://' + connectionString, (err, database) => {
  if (err) {
    throw err;
  }
  db = database;
  console.log('Connecting to MongoDB on "${connectionString}"');
});

module.exports.close = function(callback) {
  return db.close(callback);
};

module.exports.collection = function(collectionName) {
  return db.collection(collectionName);
};
