/* jshint node: true */
'use strict';

let MongoDB;

if (module.parent.exports.lab !== undefined) {
  MongoDB = require('./mongodb_mocked');
} else {
  MongoDB = require('./mongodb_db');
}

// Expose functions from the module.
module.exports = {
  collection: MongoDB.collection,
  close: MongoDB.close
};
