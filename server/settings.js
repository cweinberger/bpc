/*jshint node: true */
'use strict';

const Boom = require('boom');
const Joi = require('joi');
const Oz = require('oz');
const MongoDB = require('./mongodb_client');


module.exports.register = function (server, options, next) {

  server.route({
    method: 'GET',
    path: '/{name}',
    config: {
      auth: {
        access: {
          scope: ['{params.name}', 'admin'],
          entity: 'any'
        }
      },
      cors: {
        credentials: true,
        origin: ['*'],
        // access-control-allow-methods:POST
        headers: ['Accept', 'Authorization', 'Content-Type', 'If-None-Match'],
        exposedHeaders: ['WWW-Authenticate', 'Server-Authorization'],
        maxAge: 86400
      },
      state: {
        parse: true,
        failAction: 'log'
      }
    },
    handler: function(request, reply) {
      console.log('settings', request.params.name);
      MongoDB.collection('settings').find({name: request.params.name}).toArray(reply);
    }
  });

  server.route({
    method: 'GET',
    path: '/{name}/{key}',
    config: {
      auth: {
        access: {
          scope: ['{params.name}', 'admin'],
          entity: 'any'
        }
      },
      cors: {
        credentials: true,
        origin: ['*'],
        // access-control-allow-methods:POST
        headers: ['Accept', 'Authorization', 'Content-Type', 'If-None-Match'],
        exposedHeaders: ['WWW-Authenticate', 'Server-Authorization'],
        maxAge: 86400
      },
      state: {
        parse: true,
        failAction: 'log'
      }
    },
    handler: function(request, reply) {
      console.log('GET settings key', request.params.name, request.params.key);
      MongoDB.collection('settings').findOne({name: request.params.name, key: request.params.key}, function(err, result){
        if (err){
          reply(err)
        } else if (result === null) {
          reply(Boom.notFound());
        } else {
          reply(result);
        }
      });
    }
  });

  server.route({
    method: 'PUT',
    path: '/{name}/{key}',
    config: {
      auth: {
        access: {
          scope: ['{params.name}', 'admin'],
          entity: 'any'
        }
      },
      cors: {
        credentials: true,
        origin: ['*'],
        // access-control-allow-methods:POST
        headers: ['Accept', 'Authorization', 'Content-Type', 'If-None-Match'],
        exposedHeaders: ['WWW-Authenticate', 'Server-Authorization'],
        maxAge: 86400
      },
      state: {
        parse: true,
        failAction: 'log'
      }
    },
    handler: function(request, reply) {
      console.log('PUT settings key', request.params.name, request.params.key);

      if (typeof request.payload === 'object'){
        delete request.payload.name; // Making sure name is not $set
        delete request.payload.key; // Making sure key is not $set
      }

      MongoDB.collection('settings').updateOne(
        {
          name: request.params.name,
          key: request.params.key
        },
        {
          $currentDate: { 'Updated': { $type: "timestamp" } },
          $set: request.payload
        },
        {
          upsert: true
          //  writeConcern: <document>, // Perhaps using writeConcerns would be good here. See https://docs.mongodb.com/manual/reference/write-concern/
          //  collation: <document>
        },
        function(err, result){
          if (err){
            reply(err)
          } else if (result === null) {
            reply(Boom.notFound());
          } else {
            reply(result);
          }
        }
      );
    }
  });

  next();
};

module.exports.register.attributes = {
  name: 'settings',
  version: '1.0.0'
};
