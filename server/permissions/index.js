/*jshint node: true */
'use strict';

const Boom = require('boom');
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


  // server.route({
  //   method: 'GET',
  //   path: '/{collection}/{user}/{scope}',
  //   config: {
  //     auth: {
  //       access: {
  //         scope: ['{params.scope}', 'admin'],
  //         entity: 'app'
  //       }
  //     },
  //     cors: stdCors,
  //     state: {
  //       parse: true,
  //       failAction: 'log'
  //     },
  //     validate: {
  //       params: {
  //         collection: Joi.string().valid('gigya', 'fingerprints'),
  //         user: Joi.string(),
  //         scope: Joi.string()
  //       }
  //     }
  //   },
  //   handler: function(request, reply) {
  //
  //     if (Object.keys(request.query).length > 0) {
  //
  //       Permissions.count(request.params, request.query)
  //       .then(result => {
  //         if(result === 1) {
  //           reply({ status: 'OK' });
  //         } else {
  //           reply(Boom.notFound());
  //         }
  //       })
  //       .catch(err => reply(err));
  //
  //     } else {
  //
  //       Permissions.get(request.params)
  //       .then(dataScopes => reply(dataScopes[request.params.scope]
  //         ? dataScopes[request.params.scope]
  //         : {}))
  //       .catch(err => reply(err));
  //     }
  //   }
  // });
  //
  //
  // server.route({
  //   method: 'POST',
  //   path: '/{collection}/{user}/{scope}',
  //   config: {
  //     auth: {
  //       access: {
  //         scope: ['{params.scope}', 'admin'],
  //         entity: 'app' // <-- Important. Users must not be allowed to set permissions
  //       }
  //     },
  //     cors: stdCors,
  //     state: {
  //       parse: true,
  //       failAction: 'log'
  //     },
  //     validate: {
  //       params: {
  //         collection: Joi.string().valid('gigya'),
  //         user: Joi.string(),
  //         scope: Joi.string()
  //       },
  //       payload: Joi.object()
  //     }
  //   },
  //   handler: function(request, reply) {
  //
  //     Permissions.set(request.params, request.payload)
  //     .then(result => reply({'status': 'ok'}))
  //     .catch(err => reply(err));
  //   }
  // });
  //
  //
  // server.route({
  //   method: 'PATCH',
  //   path: '/{collection}/{user}/{scope}',
  //   config: {
  //     auth: {
  //       access: {
  //         scope: ['{params.scope}', 'admin'],
  //         entity: 'app' // <-- Important. Users must not be allowed to set permissions
  //       }
  //     },
  //     cors: stdCors,
  //     state: {
  //       parse: true,
  //       failAction: 'log'
  //     },
  //     validate: {
  //       params: {
  //         collection: Joi.string().valid('gigya'),
  //         user: Joi.string(),
  //         scope: Joi.string()
  //       },
  //       payload: Joi.object()
  //     }
  //   },
  //   handler: function(request, reply) {
  //
  //     Permissions.update({
  //       user: request.params.user,
  //       scope: request.params.scope,
  //       payload: request.payload
  //     })
  //     .then(result => {
  //       if (result.n === 0) {
  //         reply(Boom.notFound());
  //       } else {
  //         reply(result.value.dataScopes[request.params.scope]);
  //       }
  //     })
  //     .catch(err => reply(err));
  //   }
  // });


  next();

};


module.exports.register.attributes = {
  name: 'permissions',
  version: '1.0.0'
};
