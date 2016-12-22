/*jshint node: true */
'use strict';

const Boom = require('boom');
const Hawk = require('hawk');
const http = require('http');
const https = require('https');
const sso_client = require('./sso_client');

module.exports.register = function (server, options, next) {

  server.state('ticket', {
    ttl: 1000 * 60 * 60 * 24 * 30, // (one month)
    isHttpOnly: false,
    isSecure: false,
    // isSameSite: false,
    path: '/',
    encoding: 'base64json'
  });

  server.route({
    method: 'POST',
    path: '/',
    config: {
      cors: false,
      state: {
        parse: true,
        failAction: 'log'
      }
    },
    handler: function(request, reply) {

      console.log('POST /login (app)');
      sso_client.getUserTicket(request.payload.rsvp, function (err, userTicket){
        console.log('getUserTicket', err, userTicket);
        if (err){
          sso_client.refreshAppTicket(function(err, r){

          });
          return reply(err);
        }

        reply(userTicket)
          .state('ticket', userTicket);
      });
    }
  });

  server.route({
    method: 'GET',
    path: '/userprofile',
    config: {
      cors: false,
      state: {
        parse: true,
        failAction: 'log'
      }
    },
    handler: function(request, reply) {
      console.log('GET /userprofile (app)', request.state);
      sso_client.getUserProfile(request.state.ticket, function (err, profile){
        console.log('getUserProfile', err, profile);
        if (err){
          return reply(err);
        }

        reply(profile);
      });
    }
  });

  next();
};


module.exports.register.attributes = {
  name: 'login',
  version: '1.0.0'
};
