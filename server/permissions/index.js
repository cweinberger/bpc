/*jshint node: true */
'use strict';

const Joi = require('joi');
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
    handler: Permissions.getPermissions
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
    handler: Permissions.getPermissionsScope
  });

  server.route({
    method: 'GET',
    path: '/{user}/_all',
    config: {
      auth: {
        access: {
          entity: 'app' // <-- Important. Users must not be allowed to get permissions from other users
        }
      },
      cors: stdCors,
      state: {
        parse: true,
        failAction: 'log'
      }
    },
    handler: Permissions.getPermissionsUserAllScopes
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
    handler: Permissions.getPermissionsUserScope
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
    handler: Permissions.postPermissionsUserScope
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
    handler: Permissions.patchPermissionsUserScope
  });


  next();

};


module.exports.register.attributes = {
  name: 'permissions',
  version: '1.0.0'
};
