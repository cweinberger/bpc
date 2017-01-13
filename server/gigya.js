/*jshint node: true */
'use strict';

const http = require('http');
const https = require('https');
const Boom = require('boom');

const GIGYA_APP_KEY = process.env.GIGYA_APP_KEY;
const GIGYA_USER_KEY = process.env.GIGYA_USER_KEY;
const GIGYA_SECRET_KEY = process.env.GIGYA_SECRET_KEY;

module.exports.register = function (server, options, next) {

  server.route({
    method: 'GET',
    path: '/',
    config: {
      auth: false
    },
    handler: function (request, reply) {
      reply('Hello gigya!');

      // callGigyaRestApi('GET', '/ids.getSchema', function(err, data){
      //   console.log('getSchema', err, data);
      // });

      // callGigyaRestApi('GET', '/ids.getRegisteredCounters', function(err, data){
      //   console.log('getRegisteredCounters', err, data);
      // });

      // var testCounter = [
      //   {
      //     class: 'test',
      //     path: '/tests'
      //   }
      // ];
      //
      // callGigyaRestApi('GET', '/ids.registerCounters', function(err, data){
      //   console.log('registerCounters', err, data);
      // });

      var payload = {
        // UID: 'b92032903d394589b8cadc4227776b0b',
        UID: '_guid_DmXlOj3E7ZPsN3HVURc4wyeL1zELWzXV_R-fTFLbo98=',
        data: {
          // subscribe: true,
          dakotest: 'jepjep'
        }
      };

      callGigyaRestApi('POST', '/ids.setAccountInfo', payload, function(err, data){
        console.log('setAccountInfo', err, data);
      });

    }
  });

  server.route({
    method: 'POST',
    path: '/',
    config: {
      cors: true,
      auth: false,
      state: {
        parse: true, // parse and store in request.state
        failAction: 'log' // may also be 'ignore' or 'log'
      }
    },
    handler: function (request, reply) {
      console.log('POST / state', request.state);
      console.log('POST / payload', request.payload);

      if(request.payload === null){
        return reply(Boom.unauthorized('Missing payload'));
      }

      var parameters = request.payload.regToken ?
      {
        regToken: request.payload.regToken
      } : {
        UID: request.payload.UID
        // UIDSignature: request.payload.UIDSignature,
        // signatureTimestamp: request.payload.signatureTimestamp
      };

      // callGigyaRestApi('GET', '/accounts.getAccountInfo', parameters, function(err, data){
      callGigyaRestApi('GET', '/ids.getAccountInfo', parameters, function(err, data){
        console.error('getAccountInfo', err, data);
        if (err) {
          return reply(err);
        } else if (data === null) {
          return reply(Boom.unauthorized());
        } else if (data.UID !== parameters.UID) {
          return reply(Boom.unauthorized());
        } else {
          // if (request.payload.permissions.indexOf('read:*') > -1) {
          // }
          reply();
        }
      });
    }
  });

  next();
};

module.exports.register.attributes = {
  name: 'gigya',
  version: '1.0.0'
};



function callGigyaRestApi (method, path, body, callback) {
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
