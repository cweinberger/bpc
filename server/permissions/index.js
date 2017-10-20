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
        // When the app setting includeScopeInPrivatExt is set to true, we can validate the users scope by looking in ticket.ext.private.
        // But we need to find out how we should handle any changes to the scope (by POST/PATCH). Should we then reissue the ticket with new ticket.ext.private?
        if (true) {

          Permissions.get(ticket)
          .then(result => {
            if (result.isBoom){
              return reply(result);
            }
            reply(result[request.params.scope] ? result[request.params.scope] : {});
          });

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

      Permissions.get({
        user: request.params.user,
        scope: request.params.scope
      })
      .then(result => {
        if (result.isBoom){
          return reply(result);
        }
        reply(result[request.params.scope] ? result[request.params.scope] : {});
      });

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

      Permissions.set({
        user: request.params.user,
        scope: request.params.scope,
        payload: request.payload
      })
      .then(result => {
        if (result === null) {
          reply(Boom.notFound());
        } else {
          reply({'status': 'ok'});
        }
      })
      .catch(err => reply(Boom.badImplementation(err.message)));
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
      Permissions.update({
        user: request.params.user,
        scope: request.params.scope,
        payload: request.payload
      })
      .then(result => {
        if (result === null) {
          reply(Boom.notFound());
        } else {
          reply(result.value.dataScopes[request.params.scope]);
        }
      })
      // We are replying with badRequest here, because it's propably an error in the operators in the request.
      .catch(err => reply(Boom.badRequest(err.message)));
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

      Permissions.get({
        user: request.params.email.toLowerCase(),
        scope: request.params.scope
      })
      .then(result => {
        if (result.isBoom){
          return reply(result);
        }
        reply(result[request.params.scope] ? result[request.params.scope] : {});
      });

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


      Permissions.set({
        user: request.params.email.toLowerCase(),
        scope: request.params.scope,
        payload: request.payload
      })
      .then(result => {
        if (result === null) {
          reply(Boom.notFound());
        } else {
          reply({'status': 'ok'});
        }
      })
      .catch(err => reply(Boom.badImplementation(err.message)));
    }
  });

  next();
};


module.exports.register.attributes = {
  name: 'permissions',
  version: '1.0.0'
};
