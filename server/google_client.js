/*jshint node: true */
'use strict';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

const google = require('googleapis');
const plus = google.plus('v1');
const oauth2 = google.oauth2('v2');
// const OAuth2 = google.auth.OAuth2;
// const oauth2Client = new OAuth2(
//   GOOGLE_CLIENT_ID,
//   GOOGLE_CLIENT_SECRET
//   // YOUR_REDIRECT_URL
// );


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
  }, callback);
};


module.exports.tokeninfo = function(data, callback) {
  if (callback === undefined || typeof callback !== 'function'){
    callback = function(err, result){
      console.log('Result:', (err ? err.message : result));
    };
  }

  oauth2.tokeninfo(
    {
      id_token: data.id_token,
      access_token: data.access_token
    },
    callback
  );
};
