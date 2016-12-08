/*jshint node: true */
'use strict';

var MongoClient = require('mongodb').MongoClient,
    db;

var mongodb_host = process.env.MONGODB_HOST ? process.env.MONGODB_HOST : 'localhost';
var mongodb_port = process.env.MONGODB_PORT ? process.env.MONGODB_PORT : '27017';
var mongodb_database = process.env.MONGODB_DATABASE ? process.env.MONGODB_DATABASE : 'sso';
var connect_string = mongodb_host + ':' + mongodb_port + '/' + mongodb_database

MongoClient.connect('mongodb://' + connect_string, function(err, database) {
  db = database;
  if (err) throw err;
  console.log('Connecting to Mongo on', connect_string);
});

module.exports.close = function(callback) {
  db.close(callback);
};

module.exports.collection = function(collectionName) {
  return db.collection(collectionName);
};
