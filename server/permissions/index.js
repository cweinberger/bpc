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

  // TODO: Add audit trail for all requests in this plugin
  // TODO: Implement audit trail of what update was performed by what app.

  server.route({
    method: 'GET',
    path: '/',
    config: {
      auth: {
        access: {
          entity: 'user' // <-- Important. Apps cannot request permissions with specifying what {user} to get
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
        // See GET /{scope} handler below
        if (true) {

          Permissions.get(ticket)
          .then(dataScopes => reply(dataScopes));

        } else {

          // We can get the data from the ticket.ext.private part.
          reply();

        }
      });
    }
  });

  server.route({
    method: 'GET',
    path: '/{scope}',
    config: {
      auth: {
        access: {
          scope: ['{params.scope}'],
          entity: 'user' // <-- Important. Apps cannot request permissions with specifying what {user} to get
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
          .then(dataScopes => {
            if (dataScopes.isBoom) {
              return reply(dataScopes);
            }

            let requestedScope = dataScopes[request.params.scope] ? dataScopes[request.params.scope] : {};

            if (Object.keys(request.query).length > 1) {

              validateScopeWithQuery(requestedScope, request.query)
              .then(result => reply(result));

            } else {

              reply(requestedScope);

            }
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
          entity: 'app' // <-- Important. Users must not be allowed to get permissions from other users
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
      .then(dataScopes => {
        if (dataScopes.isBoom){
          return reply(dataScopes);
        }

        let requestedScope = dataScopes[request.params.scope] ? dataScopes[request.params.scope] : {};

        if (Object.keys(request.query).length > 1) {

          validateScopeWithQuery(requestedScope, request.query)
          .then(result => reply(result));

        } else {

          reply(requestedScope);

        }
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
    path: '/{provider}/{user}/{scope}',
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
          user: Joi.string(),
          scope: Joi.string()
        }
      }
    },
    handler: function(request, reply) {

      Permissions.get({
        user: request.params.user,
        scope: request.params.scope
      })
      .then(dataScopes => {
        if (dataScopes.isBoom){
          return reply(dataScopes);
        }

        let requestedScope = dataScopes[request.params.scope] ? dataScopes[request.params.scope] : {};

        if (Object.keys(request.query).length > 1) {

          validateScopeWithQuery(requestedScope, request.query)
          .then(result => reply(result));

        } else {

          reply(requestedScope);

        }
      });
    }
  });


  server.route({
    method: 'POST',
    path: '/{provider}/{user}/{scope}',
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
          user: Joi.string(),
          scope: Joi.string()
        },
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

  next();
};


module.exports.register.attributes = {
  name: 'permissions',
  version: '1.0.0'
};


const validateScopeWithQuery = function(scope, query) {

  let allCorrect = Object.keys(query).every(key => {

    if (typeof scope[key] === 'boolean') {
      return scope[key].toString() === query[key];
    } else if (typeof scope[key] === 'string') {
      return scope[key] === query[key];
    } else if (typeof scope[key] === 'object') {
      return JSON.stringify(scope[key]) === JSON.stringify(query[key]);
    } else {
      return false;
    }

  });

  if (allCorrect){
    return Promise.resolve();
  } else {
    return Promise.resolve(Boom.forbidden());
  }
};
