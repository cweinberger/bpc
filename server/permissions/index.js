/*jshint node: true */
'use strict';

const Boom = require('boom');
const Joi = require('joi');
const Oz = require('oz');
const OzLoadFuncs = require('./../oz_loadfuncs');
const Users = require('../users/users');

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

          Users.queryPermissionsScope(
            { id: ticket.user },
            request.params.scope,
            reply
          );

        } else {

          if (ticket.ext.private.Permissions === undefined || ticket.ext.private.Permissions[request.params.scope] === undefined){
            reply(Boom.forbidden());
          }

          // We only want to reply the permissions within the requested scope
          var Permissions = Object.assign({}, ticket.ext.private.Permissions[request.params.scope]);

          reply(Permissions);
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
      Users.queryPermissionsScope(
        { id: request.params.user },
        request.params.scope,
        reply
      );
    }
  });

  // server.route({
  //   method: 'GET',
  //   path: '/{user}/{scope}/{key}',
  //   config: {
  //     auth: {
  //       access: {
  //         scope: ['{params.scope}', 'admin'],
  //         entity: 'app' // <-- Important. Users must not be allowed to query permissions
  //       }
  //     },
  //     cors: stdCors,
  //     state: {
  //       parse: true,
  //       failAction: 'log'
  //     }
  //   },
  //   handler: function(request, reply) {
  //     console.log('GET permissions key', request.params.scope, request.params.key);
  //
  //     var queryProject = {
  //       _id: 0
  //     };
  //     queryProject['Permissions.'.concat(request.params.scope, '.', request.params.key)] = 1;
  //
  //     MongoDB.collection('users').findOne(
  //       {
  //         UID: request.query.UID,
  //         email: request.query.email
  //       },
  //       queryProject
  //       , function (err, result){
  //         if (err) {
  //           console.error(err);
  //         }
  //
  //         reply(err, result);
  //       }
  //     );
  //   }
  // });

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
      Users.setPermissionsScope(
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
        deletedAt: { $exist: false }
      };

      Users.queryPermissionsScope(
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
        deletedAt: { $exist: false }
      };

      Users.setPermissionsScope(
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
