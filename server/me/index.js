/* jshint node: true */
'use strict';

const Boom = require('boom');
const Joi = require('joi');
const Oz = require('oz');
const OzLoadFuncs = require('./../oz_loadfuncs');
const MongoDB = require('./../mongo/mongodb_client');
const Gigya = require('./../gigya/gigya_client');
const EventLog = require('./../audit/eventlog');
const Permissions = require('./../permissions/permissions');


module.exports.register = function (server, options, next) {

  if(process.env.NODE_ENV !== 'test'){
    // We're getting the policies to make sure the security check is not set
    Gigya.callApi('/accounts.getPolicies').then(function(response) {

      if (response.body.passwordReset.requireSecurityCheck) {
        console.warn('Gigya site requires security check');
      }
    });
  }

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

      const ticket = request.auth.credentials;

      Permissions.get(ticket)
      .then(reply)
      .catch(reply);

    }
  });

  //
  // server.route({
  //   method: 'POST',
  //   path: '/changepassword',
  //   config: {
  //     cors: {
  //       credentials: true,
  //       origin: ['*'],
  //       // access-control-allow-methods:POST
  //       headers: ['Accept', 'Authorization', 'Content-Type', 'If-None-Match'],
  //       exposedHeaders: ['WWW-Authenticate', 'Server-Authorization'],
  //       maxAge: 86400
  //     },
  //     state: {
  //       parse: true,
  //       failAction: 'log'
  //     },
  //     validate: {
  //       payload: {
  //         email: Joi.string().email(),
  //         newPassword: Joi.string()
  //       }
  //     }
  //   },
  //   handler: function(request, reply) {
  //
  //     const newPassword = request.payload.newPassword;
  //     const ticket = request.auth.credentials;
  //
  //     if (ticket.private.email !== request.payload.email){
  //       return reply(Boom.forbidden('Email is not matching'));
  //     }
  //
  //     var parameters = {
  //       loginID: user.email,
  //       sendEmail: false
  //     };
  //
  //     Gigya.callApi('/accounts.resetPassword', parameters).then(function (response){
  //
  //       var parameters_two = {
  //         passwordResetToken: response.body.passwordResetToken,
  //         newPassword: newPassword,
  //         sendEmail: false
  //       };
  //
  //       Gigya.callApi('/accounts.resetPassword', parameters_two).then(function (response) {
  //         EventLog.logUserEvent(null, 'Password Change', {email: user.email});
  //         reply({'status': 'ok'});
  //       }).catch(function (err){
  //         EventLog.logUserEvent(null, 'Password Change Failure', {email: user.email});
  //         return reply(err);
  //       });
  //     }).catch(function (err){
  //       EventLog.logUserEvent(null, 'Password Change Failure', {email: user.email});
  //       return reply(err);
  //     });
  //   }
  // });


  next();

};


module.exports.register.attributes = {
  name: 'me',
  version: '1.0.0'
};
