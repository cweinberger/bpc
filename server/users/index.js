/*jshint node: true */
'use strict';


const Boom = require('boom');
const Joi = require('joi');
const Oz = require('oz');
const crypto = require('crypto');
const ObjectID = require('mongodb').ObjectID;
const MongoDB = require('./../mongo/mongodb_client');
const EventLog = require('./../audit/eventlog');



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
      auth: {
        access: {
          scope: ['admin'],
          entity: 'any'
        }
      },
      cors: stdCors,
      validate: {
        query: Joi.object().keys({
          id: Joi.string(),
          email: Joi.string(),
          provider: Joi.string()
        }).unknown(false).or('id', 'email')
      }
    },
    handler: function(request, reply) {
      var query = {
        $or: [
          { id: request.query.id },
          { email: request.query.email.toLowerCase() }
        ]
      };

      if(ObjectID.isValid(request.query.id)){
        query.$or = [{ _id: new ObjectID(request.query.id) }].concat(query.$or)
      }

      MongoDB.collection('users')
      .find(query)
      .project({
        _id: 1,
        id: 1,
        email: 1,
        provider: 1,
        createdAt: 1,
        lastUpdated: 1,
        lastFetched: 1
      })
      .toArray(reply);
    }
  });


  server.route({
    method: 'GET',
    path: '/{id}',
    config: {
      auth:  {
        access: {
          scope: ['admin'],
          entity: 'any'
        }
      },
      cors: stdCors
    },
    handler: function(request, reply) {

      MongoDB.collection('users').aggregate(
        [{
          $match: {
            id: request.params.id
          }
        }, {
          $lookup: {
            from: 'grants',
            localField: 'id',
            foreignField: 'user',
            as: 'grants'
          }
        }], (err, result) => {
          if (err) {
            return reply(err);
          } else if (result === null || result.length !== 1) {
            return reply(Boom.notFound());
          }
          reply(result[0]);
      });
    }
  });


  server.route({
    method: 'DELETE',
    path: '/{id}',
    config: {
      auth: {
        access: {
          scope: ['admin'],
          entity: 'any'
        }
      },
      cors: stdCors
    },
    handler: (request, reply) => {

      const ticket = request.auth.credentials;

      if (ticket.user === request.params.id){
        return reply(Boom.badRequest('You cannot delete yourself'));
      }

      // TODO: We must move the user to the deleted-collections, just like with Gigya-notification

      MongoDB.collection('users')
      .deleteOne({ id: request.params.id })
      .then(() => {
        EventLog.logUserEvent(request.params.id, 'Deleting user');
        reply({'status': 'ok'});
      })
      .catch((err) => {
        EventLog.logUserEvent(request.params.id, 'Deleting user Failed');
        return reply(err);
      });
    }
  });


  next();

};


module.exports.register.attributes = {
  name: 'users',
  version: '1.0.0'
};
