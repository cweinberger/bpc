/* jshint node: true */
'use strict';

const Boom = require('boom');
const Joi = require('joi');
const Oz = require('oz');
const OzLoadFuncs = require('./../oz_loadfuncs');
// const Hawk = require('hawk');
// const Url = require('url');
// const MongoDB = require('./../mongo/mongodb_client');

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
        payload : {
         method: Joi.string().required(),
         url: Joi.string().required(),
         headers: {
           host: Joi.string().required(),
           authorization: Joi.string().required(),
         },
         app: Joi.string(),
         user: Joi.string(),
         scope: Joi.array().items(Joi.string()),
         permissions: Joi.any()
        }
      }
    },
    handler: function(request, reply) {

      var options = OzLoadFuncs.strategyOptions.oz;

      Oz.server.authenticate(request.payload, OzLoadFuncs.strategyOptions.oz.encryptionPassword, options, function(err, result) {
        if (err) {
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
        payload : {
         method: Joi.string().uppercase().valid(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']).required(),
         uri: Joi.string().uri().required(),
         app: Joi.string(),
         user: Joi.string(),
         scope: Joi.array().items(Joi.string())
       }
     }
    },
    handler: function(request, reply) {

      OzLoadFuncs.parseAuthorizationHeader(request.headers.authorization, function (err, ticket) {

        const _method = request.payload.method.toUpperCase();
        const Url = require('url');
        const _url = Url.parse(request.payload.uri);
        const _authorizationHeader = Oz.hawk.client.header(_url.href, _method, {credentials: ticket, app: ticket.app });
        if (_authorizationHeader.err) {
          return reply(Boom.badRequest(_authorizationHeader.err));
        }

        var tmp = Object.assign({}, request.payload);

        delete tmp.uri;
        tmp.url = _url.path;
        tmp.headers = {
          host: _url.host,
          authorization: _authorizationHeader.field
        };

        reply(tmp);
      });
    }
  });

  next();
};


module.exports.register.attributes = {
  name: 'validate',
  version: '1.0.0'
};
