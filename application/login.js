/*jshint node: true */
'use strict';

const Boom = require('boom');
const Hawk = require('hawk');
const http = require('http');
const https = require('https');

module.exports.register = function (server, options, next) {

  server.route({
    method: 'POST',
    path: '/',
    config: {
      cors: false,
      state: {
        parse: true, // parse and store in request.state
        failAction: 'log' // may also be 'ignore' or 'log'
      }
    },
    handler: function(request, reply) {

      var app = {
        id: process.env.POC_APPLICATION_APP_ID,
        key: process.env.POC_APPLICATION_APP_SECRET,
        algorithm: 'sha256'
      };

      // Getting application ticket
      callSsoServer('POST', '/oz/app', {}, app, function (err, appTicket){
        console.log('getAppTicket', err, appTicket);
        if (err){
          return reply(err);
        }

        console.log('getting User Ticket using rsvp', request.payload.rsvp);

        // Getting user ticket
        callSsoServer('POST', '/oz/rsvp',  {rsvp: request.payload.rsvp}, appTicket, function (err, userTicket){
          console.log('getUserTicket', err, userTicket);
          if (err){
            return reply(err);
          }

          reply(userTicket);
        });
      });
    }
  });

  next();
};

module.exports.register.attributes = {
  name: 'login',
  version: '1.0.0'
};



function callSsoServer(method, path, body, credentials, callback) {
  if (callback === undefined && typeof body === 'function') {
    callback = body;
    body = null;
  }

  var parameters = [];

  if (method === 'GET' && body !== null && typeof body === 'object'){
    var temp = [];
    Object.keys(body).forEach(function (k){
      parameters.push(k.concat('=', body[k]));
    });
  }

  var options = {
    // hostname: 'berlingske-poc.local',
    hostname: '127.0.0.1',
    port: 8084,
    // path: path.concat('?apiKey=', GIGYA_APP_KEY, '&userKey=', GIGYA_USER_KEY, '&secret=', GIGYA_SECRET_KEY, parameters),
    path: path.concat(parameters.length > 0 ? '?' : '', parameters.join('&')),
    method: method,
    headers: {
      // 'Authorization': 'Basic ' + authorization
    }
  };

  if (credentials !== null && Object.keys(credentials).length > 1){
    options.headers = {
      'Authorization': Hawk.client.header('http://'.concat(options.hostname, ':', options.port, options.path), method, {credentials: credentials, app: process.env.POC_APPLICATION_APP_ID}).field
    };
  }

  var req = http.request(options, parseReponse(callback));

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
        console.error('JSON parse error on: ', data);
        throw ex;
      }

      if (data.statusCode > 300 || res.statusCode > 300) {
        var err = Boom.wrap(new Error(data.error), data.statusCode, data.message);
        callback(err, null);
      } else {
        callback(null, data);
      }
    });
  };
}
