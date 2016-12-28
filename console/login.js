/*jshint node: true */
'use strict';

const Boom = require('boom');
const sso_client = require('./sso_client');

module.exports.register = function (server, options, next) {

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

  next();
};


module.exports.register.attributes = {
  name: 'login',
  version: '1.0.0'
};
