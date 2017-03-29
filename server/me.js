/* jshint node: true */
'use strict';

const Boom = require('boom');
const Joi = require('joi');
const Oz = require('oz');
const OzLoadFuncs = require('./oz_loadfuncs');
const MongoDB = require('./mongo/mongodb_client');
const Gigya = require('./gigya/gigya_client');

// We're getting the policies to make sure the security check is not set
Gigya.callApi('/accounts.getPolicies').then(function(response){

  if(response.body.passwordReset.requireSecurityCheck){
    console.warn('Gigya site requires security check');
  }
});

module.exports.register = function (server, options, next) {

  server.route({
    method: 'GET',
    path: '/',
    config: {
      auth: {
        access: {
          entity: 'user'
        }
      },
      cors: {
        credentials: true,
        origin: ['*'],
        // access-control-allow-methods:POST
        headers: ['Accept', 'Authorization', 'Content-Type', 'If-None-Match'],
        exposedHeaders: ['WWW-Authenticate', 'Server-Authorization'],
        maxAge: 86400
      },
      state: {
        parse: true,
        failAction: 'log'
      }
    },
    handler: function(request, reply) {

      OzLoadFuncs.parseAuthorizationHeader(request.headers.authorization, function(err, ticket){
        if (err) {
          return reply(err)
        }

        MongoDB.collection('users').findOne({ id: ticket.user }, { _id: 0, dataScopes: 0 }, reply);
      });
    }
  });

  next();

};


module.exports.register.attributes = {
  name: 'me',
  version: '1.0.0'
};
