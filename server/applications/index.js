/*jshint node: true */
'use strict';

const Boom = require('boom');
const Joi = require('joi');
const Oz = require('oz');
const OzLoadFuncs = require('./../oz_loadfuncs');
const crypto = require('crypto');
const MongoDB = require('./../mongo/mongodb_client');
const Applications = require('./applications');


const invalid_scopes = [];


const scopeValidation = Joi.array().items(
  // Scopes starting with 'admin' e.g. admin:app are not allowed because
  // they are reserved.
  Joi.string()
    .regex(/^(?!admin).*$/, { name: 'admin', invert: true })
    .invalid(invalid_scopes)
);


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
    handler: function (request, reply) {
      Applications.findAll().then(res => reply(res), err => reply(err));
    }
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
          algorithm: Joi.string(),
          delegate: Joi.boolean(),
          callbackurl: Joi.string().uri(),
          settings: Joi.object()
        }
      }
    },
    handler: function (request, reply) {

      OzLoadFuncs.parseAuthorizationHeader(request.headers.authorization,
          (err, ticket) => {
        if (err) {
          return reply(Boom.wrap(err));
        }

        // Assemble app object with sensible defaults and some scope filtering.
        const app = Object.assign(request.payload, {
          scope: makeArrayUnique(request.payload.scope),
          delegate: request.payload.delegate ? request.payload.delegate : false,
          key: crypto.randomBytes(25).toString('hex'),
          algorithm: 'sha256',
          settings: request.payload.settings || {}
        });

        Applications.createApp(app)
          .then(app => {
            Applications.assignAdminScope(app, ticket); // Async.
            return Promise.resolve(app);
          })
          .then(app => reply(app))
          .catch(err => reply(Boom.wrap(err)));

      });

    }
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
    handler: function (request, reply) {
      Applications.findAppById(request.params.id)
        .then(app => reply(app ? app : Boom.notFound()))
        .catch(err => reply(Boom.wrap(err)));
    }
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
          algorithm: Joi.string(),
          delegate: Joi.boolean(),
          callbackurl: Joi.string().uri(),
          settings: Joi.object()
        }
      }
    },
    handler: function (request, reply) {
      Applications.updateApp(request.params.id, request.payload)
        .then(app => reply(app ? app : Boom.notFound()))
        .catch(err => reply(Boom.wrap(err)));
    }
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
    handler: function (request, reply) {

      OzLoadFuncs.parseAuthorizationHeader(request.headers.authorization,
          (err, ticket) => {
        if (err) {
          return reply(Boom.wrap(err));
        }

        Applications.deleteAppById(request.params.id, ticket);
        return reply({'status': 'ok'});

      });
    }
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
      cors: stdCors
    },
    handler: function (request, reply) {
      MongoDB.collection('grants').find(
        { app: request.params.id }, {fields: {_id: 0}}
      ).toArray(reply);
    }
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
          exp: Joi.date().timestamp('unix').raw(),
          scope: scopeValidation
        }
      }
    },
    handler: function (request, reply) {

      const grant = Object.assign(request.payload, {
        id: crypto.randomBytes(20).toString('hex'),
        app: request.params.id
      });
      grant.scope = makeArrayUnique(grant.scope);

      Applications.createAppGrant(request.params.id, grant)
        .then(grant => {
          reply(grant ? grant : Boom.notFound());
        })
        .catch(err => reply(Boom.wrap(err)));

    }
  });


  server.route({
    method: 'POST', // TODO: Should this be a PUT operation?
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
          exp: Joi.date().timestamp('unix').raw().valid(null),
          scope: scopeValidation
        }
      }
    },
    handler: function (request, reply) {

      const grant = request.payload;
      grant.id = grant.id || request.params.grantId;
      grant.scope = makeArrayUnique(grant.scope);

      Applications.updateAppGrant(request.params.id, grant)
        .then(grant => reply(grant ? grant : Boom.notFound()))
        .catch(err => reply(err));

    }
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
    handler: function (request, reply) {

      MongoDB.collection('grants').remove({
        id: request.params.grantId, app: request.params.id
      }, reply);

    }
  });


  next();

};


/**
 * Removes duplicate values from the given array
 *
 * Notice that non-array values simply returns an empty array.
 *
 * @param {Array} input
 * @return {Array} Array with unique values only
 */
function makeArrayUnique(input) {
  return Array.isArray(input) ? [ ...new Set(input) ] : [ ]; // The ES6-way :-)
}


module.exports.register.attributes = {
  name: 'applications',
  version: '1.0.0'
};
