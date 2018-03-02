/*jshint node: true */
'use strict';

if (module.parent.exports.lab !== undefined || process.env.NODE_ENV === 'test') {
  module.exports = require('../../test/helpers/google_stub.js');
  return;
}

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;


const google = require('googleapis');
const plus = google.plus('v1');
const oauth2 = google.oauth2('v2');
const EventLog = require('./../audit/eventlog');


module.exports.tokeninfo = function(data) {

  return new Promise((resolve, reject) => {

    oauth2.tokeninfo(
      {
        id_token: data.id_token,
        access_token: data.access_token
      },
      (err, result) => {
        if (err) {
          EventLog.logSystemEvent(
            'Google Request Failed',
            `Request failed: oauth2.tokeninfo Error: ${err.message}`
          );
          reject(err)
        } else {
          resolve(result);
        }
      }
    );
  });

};
