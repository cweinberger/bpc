/*jshint node: true */
'use strict';


const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;


const google = require('googleapis');
const plus = google.plus('v1');
const oauth2 = google.oauth2('v2');
const EventLog = require('./../audit/eventlog');


module.exports.getPeople = function(userId, callback){
  if (callback === undefined || typeof callback !== 'function'){
    callback = function(err, result){
      console.log('Result:', (err ? err.message : result));
    };
  }

  plus.people.get({
    auth: GOOGLE_API_KEY,
    // userId: '+google'
    userId: userId
  }, (err, result) => {
    EventLog.logSystemEvent(
      'Google Request Failed', 'Request failed: plus.people.get'
    );
    return callback(err, result);
  });
};


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
