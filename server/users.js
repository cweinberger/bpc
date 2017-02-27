/*jshint node: true */
'use strict';

const Boom = require('boom');
const Joi = require('joi');
const Oz = require('oz');
const OzLoadFuncs = require('./oz_loadfuncs');
const crypto = require('crypto');
const MongoDB = require('./mongodb_client');

// Note: this is almost the same as in rsvp.js/rsvpValiudation
// This could be programmed better.
const userValidation = Joi.object().keys({
  provider: Joi.string().valid('gigya', 'google').required(),
  UID: Joi.string().when('provider', { is: 'gigya', then: Joi.required(), otherwise: Joi.forbidden() }),
  ID: Joi.string().when('provider', { is: 'google', then: Joi.required(), otherwise: Joi.forbidden() }),
  email: Joi.string().email().required()
});

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
      MongoDB.collection('users').find().toArray(reply);
    }
  });


  server.route({
    method: 'POST',
    path: '/',
    config: {
      auth:  {
        access: {
          scope: ['admin'],
          entity: 'user'
        }
      },
      cors: stdCors,
      validate: {
        payload: userValidation
      }
    },
    handler: function(request, reply) {

      var user = {
        email: request.payload.email,
        provider: request.payload.provider,
        id: request.payload.provider === 'gigya' ? request.payload.UID : request.payload.ID
      };

      MongoDB.collection('users').updateOne(
        user,
        {
          $setOnInsert: {
            'Permissions': {},
            'LastLogin': null
          }
        },
        {
          upsert: true
          //  writeConcern: <document>, // Perhaps using writeConcerns would be good here. See https://docs.mongodb.com/manual/reference/write-concern/
          //  collation: <document>
        },
        reply
      );
    }
  });


  server.route({
    method: 'GET',
    path: '/{id}',
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
      MongoDB.collection('users').aggregate(
        [
          {
            $match:
            {
              id: request.params.id
            }
          },
          {
            $lookup:
            {
              from: 'grants',
              localField: 'id',
              foreignField: 'user',
              as: 'grants'
            }
          }
        ],
        function(err, result){
          if(err){
            return reply(err);
          } else if (result === null || result.length !== 1){
            return reply(Boom.notFound());
          }

          reply(result[0]);
      });
    }
  });


  server.route({
    method: 'POST',
    path: '/{id}/superadmin',
    config: {
      auth:  {
        access: {
          scope: ['+admin:*'],
          entity: 'user'
        }
      },
      cors: stdCors
    },
    handler: function(request, reply) {
      OzLoadFuncs.parseAuthorizationHeader(request.headers.authorization, function(err, ticket){
        MongoDB.collection('grants').update(
          {
            app: ticket.app,
            user: request.params.id
          },
          {
            $addToSet: { scope: 'admin:*' }
          },
          function(err, result){
            if(err){
              return reply(err);
            }

            reply();
          }
        );
      });
    }
  });


  server.route({
    method: 'DELETE',
    path: '/{id}/superadmin',
    config: {
      auth:  {
        access: {
          scope: ['+admin:*'],
          entity: 'user'
        }
      },
      cors: stdCors
    },
    handler: function(request, reply) {
      OzLoadFuncs.parseAuthorizationHeader(request.headers.authorization, function(err, ticket){

        if (ticket.user === request.params.id){
          return reply(Boom.badRequest('You cannot demote yourself'));
        }

        MongoDB.collection('grants').update(
          {
            app: ticket.app,
            user: request.params.id
          },
          {
            $pull: { scope: 'admin:*' }
          },
          function(err, result){
            if(err){
              return reply(err);
            }

            reply();
          }
        );
      });
    }
  });


  next();

};


module.exports.register.attributes = {
  name: 'users',
  version: '1.0.0'
};
