/* jshint node: true */
'use strict';

const app = require('./../../package.json');

const corsRules = {
  credentials: true,
  origin: ['*'],
  headers: ['Accept', 'Authorization', 'Content-Type', 'If-None-Match'],
  exposedHeaders: ['WWW-Authenticate', 'Server-Authorization'],
  maxAge: 86400
};

module.exports.register = function (server, options, next) {

  server.route({
    method: 'GET',
    path: '/healthcheck',
    config: {
      auth: false,
      cors: corsRules,
      state: {
        parse: true,
        failAction: 'log'
      }
    },
    handler: (request, reply) => {
      reply('OK');
    }
  });

  server.route({
    method: 'GET',
    path: '/version',
    config: {
      auth: false,
      cors: corsRules,
      state: {
        parse: true,
        failAction: 'log'
      }
    },
    handler: (request, reply) => {
      reply({
        name: app.name,
        version: app.version,
        description: app.description,
        license: app.license
      });
    }
  });

  return next();

};

module.exports.register.attributes = {
  name: 'health',
  version: '1.0.0'
};
