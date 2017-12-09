/*jshint node: true */
'use strict';

const Boom = require('boom');
const Joi = require('joi');
const Oz = require('oz');
const OzLoadFuncs = require('./../oz_loadfuncs');
const crypto = require('crypto');
const MongoDB = require('./../mongo/mongodb_client');
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
          scope: Applications.scopeValidation,
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

        Applications.createApp(request.payload)
        .then(app => {
          Applications.assignAdminScope(app, ticket)
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
          scope: Applications.scopeValidation,
          algorithm: Joi.string(),
          delegate: Joi.boolean(),
          callbackurl: Joi.string().uri(),
          settings: Joi.object()
        }
      }
    },
    handler: function (request, reply) {
      Applications.updateApp(request.params.id, request.payload)
      .then(res => reply({'status':'ok'}))
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
      cors: stdCors,
      validate: {
        query: {
          user: Joi.string(),
          scope: Joi.string()
        }
      }
    },
    handler: function (request, reply) {

      const query = Object.assign(request.query, {
         app: request.params.id
      });

      MongoDB.collection('grants').find(
        query, {fields: {_id: 0}}
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
          exp: Joi.date().timestamp('unix').raw().allow(null),
          scope: Applications.grantScopeValidation
        }
      }
    },
    handler: function (request, reply) {

      const grant = Object.assign(request.payload, {
        app: request.params.id
      });

      Applications.createAppGrant(grant)
      .then(grant => reply(grant))
      .catch(err => reply(err));

    }
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
          scope: Applications.grantScopeValidation
        }
      }
    },
    handler: function (request, reply) {

      const grant = Object.assign(request.payload, {
        id: request.params.grantId,
        app: request.params.id
      });

      Applications.updateAppGrant(grant)
      .then(grant => reply({'status':'ok'}))
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
      })
      .then(result => reply({'status':'ok'}))
      .catch(err => reply(err));

    }
  });


  next();

};




module.exports.register.attributes = {
  name: 'applications',
  version: '1.0.0'
};
