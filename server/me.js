/* jshint node: true */
'use strict';

const Boom = require('boom');
const Joi = require('joi');
const Oz = require('oz');
const OzLoadFuncs = require('./oz_loadfuncs');
const MongoDB = require('./mongo/mongodb_client');
const Gigya = require('./gigya_client');

// We're getting the policies to make sure the security check is not set
Gigya.request('GET', '/accounts.getPolicies', null, function (err, policies){
    // console.log('getPolicies', err, policies);

    if(policies.passwordReset.requireSecurityCheck){
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


  server.route({
    method: 'POST',
    path: '/changepassword',
    config: {
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
      },
      validate: {
        payload: {
          email: Joi.string().email(),
          newPassword: Joi.string()
        }
      }
    },
    handler: function(request, reply) {

      var newPassword = request.payload.newPassword;

      OzLoadFuncs.parseAuthorizationHeader(request.headers.authorization, function(err, ticket){

        // MongoDB.collection('users').findOne({ id: ticket.user }, { _id: 0, email: 1 }, function(err, user){

          // if (user.email !== request.payload.email){
          if (ticket.private.email !== request.payload.email){
            return reply(Boom.forbidden('Email is not matching'));
          }

          var parameters = {
            loginID: user.email,
            sendEmail: false
          };

          Gigya.request('GET', '/accounts.resetPassword', parameters, function (err, result){
            if (err){
              return reply(err);
            }

            var parameters_two = {
              passwordResetToken: result.passwordResetToken,
              newPassword: newPassword,
              sendEmail: false
            };

            Gigya.request('GET', '/accounts.resetPassword', parameters_two, function (err, result){
              if (err){
                return reply(err);
              }

              reply();
            });
          });
        // });
      });

    }
  });

  next();
};


module.exports.register.attributes = {
  name: 'me',
  version: '1.0.0'
};
