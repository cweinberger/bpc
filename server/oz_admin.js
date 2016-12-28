/*jshint node: true */
'use strict';

const Boom = require('boom');
const Oz = require('oz');
const crypto = require('crypto');
const MongoDB = require('./mongodb_client');

module.exports.register = function (server, options, next) {

  server.route({
    method: 'GET',
    path: '/applications',
    config: {
      auth: {
        strategy: 'oz',
        access: {
          scope: ['admin'],
          entity: 'user'
        }
      },
      cors: {
        credentials: true,
        origin: ['*'],
        // access-control-allow-methods:POST
        headers: ['Accept', 'Authorization', 'Content-Type', 'If-None-Match'],
        exposedHeaders: ['WWW-Authenticate', 'Server-Authorization'],
        maxAge: 86400
      }
    },
    handler: function(request, reply) {
      console.log('=== looking up applications');
      MongoDB.collection('applications').find().toArray(reply);
    }
  });

  server.route({
    method: 'GET',
    path: '/grants',
    config: {
      auth: {
        strategy: 'oz',
        access: {
          scope: ['admin'],
          entity: 'user'
        }
      },
      cors: {
        credentials: true,
        origin: ['*'],
        // access-control-allow-methods:POST
        headers: ['Accept', 'Authorization', 'Content-Type', 'If-None-Match'],
        exposedHeaders: ['WWW-Authenticate', 'Server-Authorization'],
        maxAge: 86400
      }
    },
    handler: function(request, reply) {
      console.log('=== looking up grants');
      MongoDB.collection('grants').find().toArray(reply);
    }
  });

  next();
};


module.exports.register.attributes = {
  name: 'oz_admin',
  version: '1.0.0'
};
