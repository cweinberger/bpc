/*jshint node: true */
'use strict';

const http = require('http');
const https = require('https');
const Boom = require('boom');

const GIGYA_APP_KEY = process.env.GIGYA_APP_KEY;
const GIGYA_USER_KEY = process.env.GIGYA_USER_KEY;
const GIGYA_SECRET_KEY = process.env.GIGYA_SECRET_KEY;





module.exports.getAccountInfo = function(payload, callback){
  var parameters = payload.regToken ?
  {
    regToken: payload.regToken
  } : {
    UID: payload.UID
    // UIDSignature: request.payload.UIDSignature,
    // signatureTimestamp: request.payload.signatureTimestamp
  };

  callGigyaRestApi('GET', '/ids.getAccountInfo', parameters, callback);
};

module.exports.setAccountInfo = function(payload, callback){
  callGigyaRestApi('POST', '/ids.setAccountInfo', payload, callback);
};

module.exports.request = callGigyaRestApi;

function callGigyaRestApi(method, path, body, callback) {
  if (callback === undefined && typeof body === 'function') {
    callback = body;
    body = null;
  }

  var parameters = '';

  if (method === 'GET' && body !== null && typeof body === 'object'){
    Object.keys(body).forEach(function (k){
      parameters = parameters.concat('&', k, '=', body[k]);
    });
  }

  var options = {
    hostname: 'accounts.eu1.gigya.com',
    port: 443,
    path: path.concat('?apiKey=', GIGYA_APP_KEY, '&userKey=', GIGYA_USER_KEY, '&secret=', GIGYA_SECRET_KEY, parameters),
    method: method,
    headers: {
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
      } catch (ex) {
        console.log('JSON parse error on: ', data);
        throw ex;
      }

      // Gigya responds HTTP 200 OK even on errors.
      if (data.errorCode > 0 || data.statusCode > 300 || res.statusCode > 300) {
        var err = Boom.wrap(new Error(data.errorDetails), data.statusCode, data.errorMessage);
        callback(err, null);
      }
      else
        callback(null, data);
    });
  };
}
