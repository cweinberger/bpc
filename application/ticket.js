/*jshint node: true */
'use strict';

const Boom = require('boom');
const sso_client = require('./sso_client');

module.exports.register = function (server, options, next) {

  server.route({
    method: 'GET',
    path: '/',
    config: {
      cors: false,
      state: {
        parse: true,
        failAction: 'log'
      }
    },
    handler: function(request, reply) {
      sso_client.request('GET', '/cognito/validateuserticket?scope=test', null, request.state.ticket, reply);
    }
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

      sso_client.getUserTicket(request.payload.rsvp, function (err, userTicket){
        console.log('getUserTicket', err, userTicket);
        if (err){
          sso_client.refreshAppTicket(function(err, r){
            console.log('refreshAppTicket', err, r);
          });
          return reply(err);
        }

        reply(userTicket)
          .state('ticket', userTicket);
      });
    }
  });

  server.route({
    method: 'DELETE',
    path: '/',
    config: {
      cors: false,
      state: {
        parse: true,
        failAction: 'log'
      }
    },
    handler: function(request, reply) {
      // This is not a global signout.
      reply()
        .unstate('ticket');
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

  server.route({
    method: 'GET',
    path: '/validateuserticket',
    config: {
      cors: false,
      state: {
        parse: true,
        failAction: 'log'
      }
    },
    handler: function(request, reply) {
      console.log('GET /validateuserticket (app)', request.state);
      sso_client.request('GET', '/cognito/validateuserticket?scope=test', null, request.state.ticket, function (err, result){
        console.log('validateuserticket (app result)', err, result);
        if (err){
          return reply(err);
        }

        reply();
      });
    }
  });

  next();
};


module.exports.register.attributes = {
  name: 'login',
  version: '1.0.0'
};
