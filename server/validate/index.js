/* jshint node: true */
'use strict';

const Boom = require('boom');
const Joi = require('joi');
const Oz = require('oz');
const Url = require('url');
const OzLoadFuncs = require('./../oz_loadfuncs');
const ozOptions = Object.assign({}, OzLoadFuncs.strategyOptions.oz, { hawk: { host: null, port: null } });

const ENCRYPTIONPASSWORD = OzLoadFuncs.strategyOptions.oz.encryptionPassword;

module.exports.register = function (server, options, next) {

  server.route({
    method: 'POST',
    path: '/',
    config: {
      auth: {
        access: {
          entity: 'app'
        }
      },
      validate: {
        payload: {
           method: Joi.string().uppercase().valid(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']).required(),
           url: Joi.string().uri().required(),
           authorization: Joi.string().required(),
           app: Joi.string(),
           user: Joi.string(),
           scope: Joi.array().items(Joi.string()),
           permissions: Joi.any()
         }
      }
    },
    handler: function(request, reply) {


      var url = Url.parse(request.payload.url);

      var payload = {
        method: request.payload.method,
        url: url.path,
        headers: {
          host: url.host,
          authorization: request.payload.authorization
        },
        connection: {
          encrypted: url.protocol === 'https:'
        }
      };

      Oz.server.authenticate(payload, ENCRYPTIONPASSWORD, ozOptions, function(err, result) {
        if (err) {
          console.error(err);
          return reply(Boom.forbidden());
        }

        // If the validator wants the request to be only valid for a specific app
        if (request.payload.app) {
          if (request.payload.app != result.app) {
            return reply(Boom.forbidden());
          }
        }

        // If the validator wants the request to be only valid for a specific user
        if (request.payload.user){
          if (request.payload.user != result.user) {
            return reply(Boom.forbidden());
          }
        }

        // If the validator wants the request to be only valid for app/user with a specific scope
        if (request.payload.scope) {
          var hasScope = request.payload.scope.some((s) => {
            return result.scope.indexOf(s) > -1;
          });
          if (!hasScope) {
            return reply(Boom.forbidden());
          }
        }

        // If the validator wants the request to be only valid for a user with a specific permission
        if (request.payload.permissions) {
          if (!result.user){
            return reply(Boom.forbidden());
          }

          // TODO: These validations can also be made against the private part of the ticket, if the permissions has been injected there.
          // Maybe this must be done against the /permissions endpoints????
          // MongoDB.

        }

        reply({'status': 'ok'});
      });
    }
  });


  // Just a helper method to generate authorization header for tests

  server.route({
    method: 'POST',
    path: '/genpayload',
    config: {
      auth: {
        access: {
          entity: 'app'
        }
      },
      validate: {
        payload: {
           method: Joi.string().uppercase().valid(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']).required(),
           url: Joi.string().uri().required(),
           authorization: Joi.string().forbidden(), // <-- forbidden in this
           app: Joi.string(),
           user: Joi.string(),
           scope: Joi.array().items(Joi.string()),
           permissions: Joi.any()
         }
     }
    },
    handler: function(request, reply) {

      const ticket = request.auth.credentials;

      let tmp = Object.assign({}, request.payload);

      const _authorizationHeader = Oz.hawk.client.header(request.payload.url, request.payload.method, {credentials: ticket, app: ticket.app });
      if (_authorizationHeader.err) {
        return reply(Boom.badRequest(_authorizationHeader.err));
      }
      tmp.authorization = _authorizationHeader.field;

      reply(tmp);
    }
  });

  next();
};


module.exports.register.attributes = {
  name: 'validate',
  version: '1.0.0'
};
