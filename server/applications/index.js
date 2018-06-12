/*jshint node: true */
'use strict';

const Boom = require('boom');
const Joi = require('joi');
const Applications = require('./applications');


module.exports.register = function (server, options, next) {

  const stdCors = {
    credentials: true,
    origin: ['*'],
    headers: ['Accept', 'Authorization', 'Content-Type', 'If-None-Match'],
    exposedHeaders: ['WWW-Authenticate', 'Server-Authorization'],
    maxAge: 86400
  };


  // Note to self: Refactored!
  server.route({
    method: 'GET',
    path: '/',
    config: {
      auth:  {
        access: {
          scope: ['admin'],
          entity: 'user'
        }
      },
      cors: stdCors
    },
    handler: Applications.getApplications
  });


  server.route({
    method: 'POST',
    path: '/',
    config: {
      auth: {
        access: {
          scope: ['admin'],
          entity: 'user'
        }
      },
      cors: stdCors,
      validate: {
        payload: {
          _id: Joi.strip(),
          key: Joi.strip(),
          id: Joi.string().required(),
          scope: scopeValidation,
          algorithm: Joi.string().default('sha256'),
          delegate: Joi.boolean(),
          callbackurl: Joi.string().uri(),
          settings: Joi.object()
        }
      }
    },
    handler: Applications.postApplication
  });


  server.route({
    method: 'GET',
    path: '/{id}',
    config: {
      auth: {
        scope: ['admin:{params.id}', 'admin:*'],
        entity: 'user'
      },
      cors: stdCors
    },
    handler: Applications.getApplication
  });


  server.route({
    method: 'PUT',
    path: '/{id}',
    config: {
      auth: {
        scope: ['admin:{params.id}', 'admin:*'],
        entity: 'user'
      },
      cors: stdCors,
      validate: {
        payload: {
          _id: Joi.strip(),
          key: Joi.strip(),
          id: Joi.strip(),
          scope: scopeValidation,
          algorithm: Joi.string().default('sha256'),
          delegate: Joi.boolean(),
          callbackurl: Joi.string().uri(),
          settings: Joi.object()
        }
      }
    },
    handler: Applications.putApplication
  });


  server.route({
    method: 'DELETE',
    path: '/{id}',
    config: {
      auth: {
        scope: ['admin:{params.id}', 'admin:*'],
        entity: 'user'
      },
      cors: stdCors
    },
    handler: Applications.deleteApplication
  });


  server.route({
    method: 'GET',
    path: '/{id}/grants',
    config: {
      auth: {
        access: {
          scope: ['admin:{params.id}', 'admin:*'],
          entity: 'user'
        }
      },
      cors: stdCors,
      validate: {
        query: {
          id: Joi.string(),
          user: Joi.string(),
          limit: Joi.number().min(0).max(100).default(50),
          skip: Joi.number().min(0).default(0)
        }
      }
    },
    handler: Applications.getApplicationGrants
  });

  server.route({
    method: 'GET',
    path: '/{id}/grantscount',
    config: {
      auth: {
        access: {
          scope: ['admin:{params.id}', 'admin:*'],
          entity: 'user'
        }
      },
      cors: stdCors
    },
    handler: Applications.getApplicationGrantsCount
  });


  server.route({
    method: 'POST',
    path: '/{id}/grants',
    config: {
      auth: {
        access: {
          scope: ['admin:{params.id}', 'admin:*'],
          entity: 'user'
        }
      },
      cors: stdCors,
      validate: {
        payload: {
          _id: Joi.strip(),
          id: Joi.strip(),
          app: Joi.strip(),
          user: Joi.string().required(),
          exp: Joi.date().timestamp('unix').raw().allow(null),
          scope: scopeValidation
        }
      }
    },
    handler: Applications.postApplicationNewGrant
  });


  server.route({
    method: 'POST',
    path: '/{id}/grants/{grantId}',
    config: {
      auth: {
        access: {
          scope: ['admin:{params.id}', 'admin:*'],
          entity: 'user'
        }
      },
      cors: stdCors,
      validate: {
        payload: {
          _id: Joi.strip(),
          id: Joi.strip(),
          app: Joi.strip(),
          user: Joi.strip(),
          exp: Joi.date().timestamp('unix').raw().allow(null),
          scope: scopeValidation
        }
      }
    },
    handler: Applications.postApplicationGrant
  });


  server.route({
    method: 'DELETE',
    path: '/{id}/grants/{grantId}',
    config: {
      auth: {
        access: {
          scope: ['admin:{params.id}', 'admin:*'],
          entity: 'user'
        }
      },
      cors: stdCors
    },
    handler: Applications.deleteApplicationGrant
  });


  server.route({
    method: 'GET',
    path: '/{id}/admins',
    config: {
      auth: {
        access: {
          scope: ['admin:{params.id}', 'admin:*'],
          entity: 'user'
        }
      },
      cors: stdCors
    },
    handler: Applications.getApplicationAdmins
  });


  server.route({
    method: 'POST',
    path: '/{id}/makeadmin',
    config: {
      auth: {
        access: {
          scope: ['admin:{params.id}', 'admin:*'],
          entity: 'user'
        }
      },
      cors: stdCors,
      validate: {
        payload: appAdminPayloadValidation
      }
    },
    handler: Applications.postApplicationMakeAdmin
  });


  server.route({
    method: 'POST',
    path: '/{id}/removeadmin',
    config: {
      auth: {
        access: {
          scope: ['admin:{params.id}', 'admin:*'],
          entity: 'user'
        }
      },
      cors: stdCors,
      validate: {
        payload: appAdminPayloadValidation
      }
    },
    handler: Applications.postApplicationRemoveAdmin
  });

  next();

};


module.exports.register.attributes = {
  name: 'applications',
  version: '1.0.0'
};


const appAdminPayloadValidation = Joi.object().keys({
  _id: Joi.strip(),
  id: Joi.strip(),
  app: Joi.strip(),
  user: Joi.string().required(),
  exp: Joi.strip(),
  scope: Joi.strip()
}).unknown(true); // Allow and strip unknows parameters


const scopeValidation = Joi.array().items(
  // Scopes starting with 'admin' e.g. admin:app are not allowed because
  // they are reserved.
  Joi.string()
    .regex(/^(?!admin).*$/, { name: 'admin', invert: false })
    .invalid([])
);
