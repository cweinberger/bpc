/*jshint node: true */
'use strict';

const Boom = require('boom');
const Joi = require('joi');
const Oz = require('oz');
const OzLoadFuncs = require('./../oz_loadfuncs');
const crypto = require('crypto');
const MongoDB = require('./../mongo/mongodb_client');

const invalid_scopes = [];

const scopeValidation = Joi.array().items(
  Joi.string()
    .regex(/^(?!admin).*$/, { name: 'admin', invert: true }) // Scopes starting with 'admin' e.g. admin:app are not allowed because they are reserved
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
    handler: function(request, reply) {
      MongoDB.collection('applications').find().toArray(reply);
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

      // Making sure app id (request.payload.id) is unique!
      MongoDB.collection('applications').find({id: {$regex: '^'.concat(request.payload.id)}}, {_id: 0, id: 1}).toArray(function(err, applications) {
        var ids = applications.map(function (app) { return app.id; });
        var uniqueId = request.payload.id,
            isUniqueId = ids.indexOf(uniqueId) === -1,
            postfix_number = 0;

        while(!isUniqueId) {
          uniqueId = request.payload.id.concat('-', ++postfix_number);
          isUniqueId = ids.indexOf(uniqueId) === -1;
        }

        request.payload.id = uniqueId
        request.payload.scope = request.payload.scope ? request.payload.scope : [];


        var application = Object.assign(request.payload, {
          scope: request.payload.scope ? filterArrayForDuplicates(request.payload.scope) : [],
          delegate: request.payload.delegate ? request.payload.delegate : false,
          key: crypto.randomBytes(40).toString('hex'),
          algorithm: 'sha256',
          settings: request.payload.settings ? request.payload.settings : {}
        });

          MongoDB.collection('applications').insertOne(application, function(err, result) {
            if (err) {
              console.error('Create application error', err);
              return reply(err);
            }


            OzLoadFuncs.parseAuthorizationHeader(request.headers.authorization, function(err, ticket){


              // Adding the 'admin:' scope to console app, so that users can be admins.
              var consoleScope = 'admin:'.concat(uniqueId);
              MongoDB.collection('applications').updateOne({ id: ticket.app }, { $addToSet: { scope: consoleScope } });
              // Adding scope 'admin:' to the grant of user that created the application
              MongoDB.collection('grants').update({ id: ticket.grant }, { $addToSet: { scope: consoleScope } } );
            });

            reply(application);
          });
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
      MongoDB.collection('applications').findOne({id: request.params.id}, function(err, result) {
        if (err) {
          return reply(err);
        } else if (result === null) {
          return reply(Boom.notFound());
        } else {
          reply(result);
        }
      });
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
          // scope: Joi.array().items(Joi.string().valid('admin').forbidden(), Joi.string()),
          scope: scopeValidation,
          algorithm: Joi.string(),
          delegate: Joi.boolean(),
          callbackurl: Joi.string().uri(),
          settings: Joi.object()
        }
      }
    },
    handler: function (request, reply) {

      MongoDB.collection('applications').findOne({id: request.params.id}, function(err, result) {
        if (err) {
          return reply(err);
        } else if (result === null) {
          return reply().code(404);
        }

        MongoDB.collection('applications').update({id: request.params.id}, {$set: request.payload}, function(err, result) {
          if (err) {
            reply(err);
          }

          // TODO: Pull all scopes on grants that are no longer allowed in the app

          reply(request.payload);
        });

      });
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

      MongoDB.collection('applications').remove({ id: request.params.id });
      MongoDB.collection('grants').remove({ app: request.params.id } );

      OzLoadFuncs.parseAuthorizationHeader(request.headers.authorization, function(err, ticket){
        var consoleScope = 'admin:'.concat(request.params.id);
        MongoDB.collection('applications').updateOne({ id: ticket.app }, { $pull: { scope: consoleScope } });
        MongoDB.collection('grants').update({ app: ticket.app }, { $pull: { scope: consoleScope } }, { multi: true });
      });

      reply();
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
    handler: function(request, reply) {
      MongoDB.collection('grants').find({ app: request.params.id }, {fields: {_id: 0}}).toArray(reply);
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
    handler: function(request, reply) {

      var grant = Object.assign(
          request.payload,
          {
            id: crypto.randomBytes(20).toString('hex'),
            app: request.params.id
          });

      MongoDB.collection('applications').findOne({id: request.params.id}, function(err, app){
        if (err){
          return reply(err);
        } else if (app === null){
          return reply(Boom.badRequest());
        }

        MongoDB.collection('users').findOne({$or : [{id: grant.user}, {email: grant.user}]}, function(err, user){
          if (err){
            return reply(err);
          } else if (user === null){
            return reply(Boom.badRequest());
          }

          if (grant.scope instanceof Array){
            grant.scope = filterArrayForDuplicates(grant.scope);
            grant.scope = grant.scope.filter((i) => {return app.scope.indexOf(i) > -1;})
          }

          // TODO: Make sure the user does not already have a grant to that app

          MongoDB.collection('grants').insert(grant, function(err, result) {
            reply(grant);
          });
        });
      });
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
          exp: Joi.date().timestamp('unix').raw().valid(null),
          scope: scopeValidation
        }
      }
    },
    handler: function(request, reply) {
      var grant = request.payload;

      MongoDB.collection('applications').findOne({id: request.params.id}, function(err, app){
        if (err){
          return reply(err);
        } else if (app === null){
          return reply(Boom.notFound());
        }

        if (grant.scope instanceof Array){
          grant.scope = filterArrayForDuplicates(grant.scope);
          grant.scope = grant.scope.filter((i) => {return app.scope.indexOf(i) > -1;})
        }

        MongoDB.collection('grants').update({id: request.params.grantId}, {$set: grant}, reply);
      });
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
    handler: function(request, reply) {
      MongoDB.collection('grants').remove({id: request.params.grantId, app: request.params.id}, reply);
    }
  });


  next();

};


module.exports.register.attributes = {
  name: 'applications',
  version: '1.0.0'
};


function filterArrayForDuplicates(input){
  if (input instanceof Array){
    var hash = {};
    for (var i = 0; i < input.length; i++) {
      hash[input[i]] = true;
    }
    return Object.keys(hash);
  } else {
    return [];
  }
}
