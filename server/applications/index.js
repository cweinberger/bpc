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
          id: Joi.string().token().min(3).max(30).required(),
          scope: scopeValidation,
          algorithm: Joi.string().default('sha256'),
          delegate: Joi.boolean().default(false),
          settings: Joi.object().keys({
            provider: Joi.string().valid(['gigya', 'google']).required()
          }).required().unknown(true)
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
        scope: ['admin:{params.id}', 'admin:{params.id}:app', 'admin:*'],
        entity: 'any'
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
        scope: ['admin:{params.id}', 'admin:{params.id}:app', 'admin:*'],
        entity: 'any'
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
          settings: Joi.object().keys({
            provider: Joi.strip()
          }).required().unknown(true)
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
        scope: ['admin:{params.id}', 'admin:{params.id}:app', 'admin:*'],
        entity: 'any'
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
          scope: ['admin:{params.id}', 'admin:{params.id}:app', 'admin:*'],
          entity: 'any'
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
          scope: ['admin:{params.id}', 'admin:{params.id}:app', 'admin:*'],
          entity: 'any'
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
          scope: ['admin:{params.id}', 'admin:{params.id}:app', 'admin:*'],
          entity: 'any'
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
          scope: Joi.strip()
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
          scope: ['admin:{params.id}', 'admin:{params.id}:app', 'admin:*'],
          entity: 'any'
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
          scope: Joi.strip()
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
          scope: ['admin:{params.id}', 'admin:{params.id}:app', 'admin:*'],
          entity: 'any'
        }
      },
      cors: stdCors
    },
    handler: Applications.deleteApplicationGrant
  });


  next();

};


module.exports.register.attributes = {
  name: 'applications',
  version: '1.0.0'
};


const scopeValidation = Joi.array().items(
  // Scopes starting with 'admin' e.g. admin:app are not allowed because
  // they are reserved.
  Joi.string()
    .regex(/^(?!admin).*$/, { name: 'admin', invert: false })
    .invalid([':read'])
);
