/*jshint node: true */
'use strict';

const http = require('http');
const https = require('https');
const Boom = require('boom');

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;

var access_token = '';

var get_token_params = {
  client_id: FACEBOOK_APP_ID,
  client_secret: FACEBOOK_APP_SECRET,
  grant_type: 'client_credentials'
}

// callFacebookGrapApi('GET', '/oauth/access_token', get_token_params, function(err, response){
//   access_token = response;
// });

module.exports.getProfile = function(parameters, callback){
  callFacebookGrapApi('GET', '/v2.8/me', parameters, callback);
};


function callFacebookGrapApi(method, path, body, callback){
  if (callback === undefined && typeof body === 'function') {
    callback = body;
    body = null;
  }

  var parameters = '';

  if (method === 'GET' && body !== null && typeof body === 'object'){
    Object.keys(body).forEach(function (k){
      if (parameters.length === 0){
        parameters = parameters.concat('?', k, '=', body[k]);
      } else {
        parameters = parameters.concat('&', k, '=', body[k]);
      }
    });
  }

  var options = {
    hostname: 'graph.facebook.com',
    port: 443,
    path: path.concat(parameters),
    method: method,
    headers: {
      'Content-Type': 'application/json'
      // 'Authorization': 'Basic ' + authorization
    }
  };

  var req = https.request(options, parseReponse(callback));

  if (method !== 'GET' && body !== null && typeof body === 'object'){
    req.write(JSON.stringify(body));
  }

  req.end();

  req.on('error', function (e) {
    console.log(Date().toString(), 'Error on request to ' + path, e);
    callback(e);
  });
}


function parseReponse (callback) {
  return function (res) {
    var data = '';

    res.on('data', function(d) {
      data = data + d;
    });

    res.on('end', function () {
      try {
        data = JSON.parse(data);
        if (data.error) {
          var err = Boom.wrap(new Error(data.error.message));
          callback(err, null);
        } else {
          callback(null, data);
        }
      } catch (ex) {
        callback(null, data);
      }
    });
  };
}
