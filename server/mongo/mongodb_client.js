/* jshint node: true */
'use strict';

const Config = require('./../config');
const mongoDbConnection = Config.MONGODB_CONNECTION;

if(mongoDbConnection === undefined || mongoDbConnection.length === 0) {
  console.error('Environment variable MONGODB_CONNECTION not set')
  process.exit(1);
}

const MongoClient = require('mongodb').MongoClient;

let db;


module.exports.ready = new Promise((resolve, reject) => {
  // Establish connection and perform error handling.
  console.log('Connecting to MongoDB on ' + `${mongoDbConnection}`);
  MongoClient.connect(mongoDbConnection, (err, database) => {
    if (err) {
      reject(err);
      throw err;
    } else if (!database) {
      const t = new Error('Unable to connect to database!');
      reject(t);
      throw t;
    }
    db = database;
    resolve();
  });
});


module.exports.close = function(callback) {
  return db.close(callback);
};


module.exports.collection = function(collectionName) {
  return db.collection(collectionName);
};
