/*jshint node: true */
'use strict';

const Hapi = require('hapi');
const Inert = require('inert');
const Joi = require('joi');
const Cognito = require('./cognito');
const Gigya = require('./gigya');
const Drupal = require('./drupal');

const server = new Hapi.Server();
server.connection({ port: process.env.PORT ? process.env.PORT : 8000 });

server.register(Inert, () => {});
server.register(Cognito, { routes: { prefix: '/cognito' } }, cb);
server.register(Gigya, { routes: { prefix: '/gigya' } }, cb);
server.register(Drupal, { routes: { prefix: '/drupal' } }, cb);

server.route({
  method: 'GET',
  path: '/favicon.ico',
  handler: function(request, reply){
    reply();
  }
});

server.route({
  method: 'GET',
  path: '/{param*}',
  handler: {
    directory: {
      path: './server/client',
      redirectToSlash: true,
      index: true
    }
  }
});

server.start((err) => {
  if (err) {
    throw err;
  }
  console.log(`Server running at: ${server.info.uri}`);
});

function cb (err) {
  if (err) {
    console.log('Error when loading plugin', err);
    server.stop();
  }
}
