/* jshint node: true */
'use strict';

let MongoDB;


if (process.env.MONGODB_MOCK) {
  MongoDB = require('./mongodb_mocked');
} else {
  MongoDB = require('./mongodb_db');
}

// Expose functions from the module.
module.exports = {
  collection: MongoDB.collection,
  close: MongoDB.close
};
