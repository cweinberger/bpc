/*jshint node: true */
'use strict';

const Boom = require('boom');
const Joi = require('joi');
const Oz = require('oz');
const crypto = require('crypto');
const MongoDB = require('./mongodb_client');

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
    path: '/applications',
    config: {
      auth:  {
        access: {
          scope: ['+admin'],
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
    path: '/applications',
    config: {
      auth: {
        access: {
          scope: ['+admin'],
          entity: 'user'
        }
      },
      cors: stdCors,
      validate: {
        payload: {
          _id: Joi.strip(),
          key: Joi.strip(),
          id: Joi.string().required(),
          scope: Joi.array().items(Joi.string().valid('admin').forbidden(), Joi.string()),
          algorithm: Joi.string(),
          delegate: Joi.boolean(),
          callbackurl: Joi.string().uri(),
          settings: Joi.object()
        }
      }
    },
    handler: function (request, reply) {

      // TODO: scope 'admin' is not allowed

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

        var application = Object.assign(request.payload, {
          scope: request.payload.scope ? filterArrayForDuplicates(request.payload.scope) : [],
          delegate: request.payload.delegate ? request.payload.delegate : false,
          key: crypto.randomBytes(20).toString('hex'),
          algorithm: 'sha256'});

          MongoDB.collection('applications').insertOne(application, function(err, result) {
            if (err) {
              console.error('Create application error', err);
              return reply(err);
            }

            // TODO: Add grant/scope 'admin:XXX' to the user that created the application

            reply(application);
          });
      });
    }
  });

  server.route({
    method: 'PUT',
    path: '/applications/{id}',
    config: {
      auth: {
        // scope: ['+admin:{params.id}'],
        scope: ['+admin'],
        entity: 'user'
      },
      validate: {
        payload: {
          _id: Joi.strip(),
          key: Joi.strip(),
          id: Joi.strip(),
          scope: Joi.array().items(Joi.string().valid('admin').forbidden(), Joi.string()),
          algorithm: Joi.string(),
          delegate: Joi.boolean(),
          callbackurl: Joi.string().uri(),
          settings: Joi.object()
        }
      }
    },
    handler: function (request, reply) {

      // TODO: scope 'admin' is not allowed

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
    path: '/applications/{id}',
    config: {
      auth: {
        // scope: ['delete:{params.id}']
        // scope: ['+admin:{params.id}'],
        scope: ['+admin'],
        entity: 'user'
      // },
      // validate: {
      //   params: {
      //     id: Joi.string().required()
      //   }
      }
    },
    handler: function (request, reply) {
      MongoDB.collection('applications').remove({id: request.params.id}, reply);
    }
  });

  // server.route({
  //   method: 'GET',
  //   path: '/grants',
  //   config: {
  //     auth: {
  //       access: {
  //         scope: ['+admin'],
  //         entity: 'user'
  //       }
  //     },
  //     cors: stdCors
  //   },
  //   handler: function(request, reply) {
  //     MongoDB.collection('grants').find().toArray(reply);
  //   }
  // });

  server.route({
    method: 'GET',
    path: '/applications/{id}/scope',
    config: {
      auth: {
        access: {
          // scope: ['+admin:{params.id}'],
          scope: ['+admin'],
          entity: 'user'
        }
      },
      cors: stdCors
    },
    handler: function(request, reply) {
      MongoDB.collection('applications').findOne({ id: request.params.id }, {fields: {_id: 0, scope: 1}}, function(err, result){
        if(err){
          reply(err);
        } else {
          reply(result.scope)
        }
      });
    }
  });


  server.route({
    method: 'GET',
    path: '/applications/{id}/grants',
    config: {
      auth: {
        access: {
          // scope: ['+admin:{params.id}'],
          scope: ['+admin'],
          entity: 'user'
        }
      },
      cors: stdCors
    },
    handler: function(request, reply) {
      MongoDB.collection('grants').find({ app: request.params.id }).toArray(reply);
    }
  });


  server.route({
    method: 'POST',
    path: '/applications/{id}/grants',
    config: {
      auth: {
        access: {
          // scope: ['+admin', '+admin:create'],
          scope: ['+admin'],
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
          scope: Joi.array().items(Joi.string())
          // scope: Joi.array().items(Joi.string().valid('admin').forbidden(), Joi.string())
        }
      }
    },
    handler: function(request, reply) {

      // TODO: validate against the app id, so that only users that are admins of the app can create grants

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
          return reply(Boom.notFound());
        }

        if (grant.scope instanceof Array){
          grant.scope = filterArrayForDuplicates(grant.scope);
          grant.scope = grant.scope.filter((i) => {return app.scope.indexOf(i) > -1;})
        }

        MongoDB.collection('grants').insertOne(grant, function(err, result) {
          reply(grant);
        });
      });
    }
  });

  server.route({
    method: 'PUT',
    path: '/applications/{id}/grants/{grantId}',
    config: {
      auth: {
        access: {
           // TODO: validate against the app id, so that only users that are admins of the app can create grants
          // scope: ['+admin', '+admin:create'],
          scope: ['+admin'],
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
          scope: Joi.array().items(Joi.string())
          // scope: Joi.array().items(Joi.string().valid('admin').forbidden(), Joi.string())
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
      // TODO: Make sure you can grant any scopes that are not present in the app's default scope.

      // var ops = {
      //   $set: {
      //     scope: grant.scope
      //   },
      //   $unset: {}
      // };
      //
      // if (grant.exp === undefined || grant.exp === null){
      //   ops.$unset.exp = '';
      // } else {
      //   ops.$set.exp = grant.exp;
      // }
    }
  });


  server.route({
    method: 'DELETE',
    path: '/applications/{id}/grants/{grantId}',
    config: {
      auth: {
        access: {
           // TODO: validate against the app id, so that only users that are admins of the app can create grants
          // scope: ['+admin', '+admin:create'],
          scope: ['+admin'],
          entity: 'user'
        }
      },
    },
    handler: function(request, reply) {
      MongoDB.collection('grants').remove({id: request.params.grantId, app: request.params.id}, reply);
    }
  });


  next();
};


module.exports.register.attributes = {
  name: 'oz_admin',
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
