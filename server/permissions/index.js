/*jshint node: true */
'use strict';

const Boom = require('boom');
const Joi = require('joi');
const Oz = require('oz');
const OzLoadFuncs = require('./../oz_loadfuncs');
const Permissions = require('./permissions');

module.exports.register = function (server, options, next) {

  const stdCors = {
    credentials: true,
    origin: ['*'],
    headers: ['Accept', 'Authorization', 'Content-Type', 'If-None-Match'],
    exposedHeaders: ['WWW-Authenticate', 'Server-Authorization'],
    maxAge: 86400
  };


  server.route({
    method: 'GET',
    path: '/{scope}',
    config: {
      auth: {
        access: {
          scope: ['{params.scope}'],
          entity: 'user'
        }
      },
      cors: stdCors,
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

        // Should we query the database or look in the private part of the ticket?
        if (true) {

          Permissions.queryPermissionsScope(
            { id: ticket.user },
            request.params.scope,
            reply
          );

        } else {

          if (ticket.ext.private === undefined || ticket.ext.private[request.params.scope] === undefined){
            reply(Boom.forbidden());
          }

          // We only want to reply the permissions within the requested scope
          var scopePermissions = Object.assign({}, ticket.ext.private[request.params.scope]);

          reply(scopePermissions);
        }
      });
    }
  });


  server.route({
    method: 'GET',
    path: '/{user}/{scope}',
    config: {
      auth: {
        access: {
          scope: ['{params.scope}', 'admin'],
          entity: 'app'
        }
      },
      cors: stdCors,
      state: {
        parse: true,
        failAction: 'log'
      }
    },
    handler: function(request, reply) {
      Permissions.queryPermissionsScope(
        { id: request.params.user },
        request.params.scope,
        reply
      );
    }
  });


  server.route({
    method: 'POST',
    path: '/{user}/{scope}',
    config: {
      auth: {
        access: {
          scope: ['{params.scope}', 'admin'],
          entity: 'app' // <-- Important. Users must not be allowed to set permissions
        }
      },
      cors: stdCors,
      state: {
        parse: true,
        failAction: 'log'
      },
      validate: {
        payload: Joi.object()
      }
    },
    handler: function(request, reply) {
      Permissions.setPermissionsScope(
        { id: request.params.user },
        request.params.scope,
        request.payload,
        reply
      );
    }
  });


  server.route({
    method: 'PATCH',
    path: '/{user}/{scope}',
    config: {
      auth: {
        access: {
          scope: ['{params.scope}', 'admin'],
          entity: 'app' // <-- Important. Users must not be allowed to set permissions
        }
      },
      cors: stdCors,
      state: {
        parse: true,
        failAction: 'log'
      },
      validate: {
        payload: Joi.object()
      }
    },
    handler: function(request, reply) {
      Permissions.updatePermissionsScope(
        { id: request.params.user },
        request.params.scope,
        request.payload,
        reply
      );
    }
  });


  server.route({
    method: 'GET',
    path: '/{provider}/{email}/{scope}',
    config: {
      auth: {
        access: {
          scope: ['{params.scope}', 'admin'],
          entity: 'app'
        }
      },
      cors: stdCors,
      state: {
        parse: true,
        failAction: 'log'
      },
      validate: {
        params: {
          provider: Joi.string().valid('gigya', 'google'),
          email: Joi.string().email(),
          scope: Joi.string()
        }
      }
    },
    handler: function(request, reply) {

      var selector = {
        provider: request.params.provider,
        email: request.params.email.toLowerCase(),
        deletedAt: { $exists: false }
      };

      Permissions.queryPermissionsScope(
        selector,
        request.params.scope,
        reply
      );
    }
  });


  server.route({
    method: 'POST',
    path: '/{provider}/{email}/{scope}',
    config: {
      auth: {
        access: {
          scope: ['{params.scope}', 'admin'],
          entity: 'app' // <-- Important. Users must not be allowed to set permissions
        }
      },
      cors: stdCors,
      state: {
        parse: true,
        failAction: 'log'
      },
      validate: {
        params: {
          provider: Joi.string().valid('gigya', 'google'),
          email: Joi.string().email(),
          scope: Joi.string()
        },
        payload: Joi.object()
      }
    },
    handler: function(request, reply) {

      var selector = {
        provider: request.params.provider,
        email: request.params.email.toLowerCase(),
        deletedAt: { $exists: false }
      };

      Permissions.setPermissionsScope(
        selector,
        request.params.scope,
        request.payload,
        reply
      );
    }
  });

  next();
};


module.exports.register.attributes = {
  name: 'permissions',
  version: '1.0.0'
};
