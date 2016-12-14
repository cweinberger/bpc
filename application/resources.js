/*jshint node: true */
'use strict';

const Boom = require('boom');
const Hawk = require('hawk');
const http = require('http');
const https = require('https');
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
      console.log('getResources state', request.state);
      console.log('getResources payload', request.payload);
      reply();
    }
  });

  server.route({
    method: 'GET',
    path: '/userp',
    config: {
      state: {
        parse: true,
        failAction: 'log'
      }
    },
    handler: function(request, reply) {
      console.log('userp state', request.state);
      console.log('userp payload', request.payload);

      if (request.state.ticket.exp <= Hawk.utils.now()){
        return reply(Boom.forbidden('Ticket has expired'));
      }

      sso_client.validateUserTicket(request.state.ticket, function (err, response){
        if (err){
          return reply(err);
        }

        // reply({message: 'public resource'});
        reply({message: 'protected resource'});
      });
    }
  });

  next();
};


module.exports.register.attributes = {
  name: 'resources',
  version: '1.0.0'
};
