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
      // sso_client.request('GET', '/cognito/validateuserticket?scope=admin', null, request.state.ticket, reply);
      sso_client.request('POST', '/cognito/validateuserpermissions', {permissions: 'admin'}, request.state.ticket, reply);
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
        if (err){
          console.error('getUserTicket error', err);
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
      console.log('GET /userprofile (console)', request.state);
      sso_client.request('GET', '/cognito/userprofile', null, request.state.ticket, function (err, profile){
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
