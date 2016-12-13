/*jshint node: true */
'use strict';

const Hapi = require('hapi');
const Inert = require('inert');
const Joi = require('joi');
const crypto = require('crypto');
const Cognito = require('./cognito');
const Gigya = require('./gigya');
const Drupal = require('./drupal');
const Scarecrow = require('scarecrow');

const server = new Hapi.Server();
server.connection({ port: process.env.PORT ? process.env.PORT : 8000 });

server.register(Inert, () => {});
server.register(Scarecrow, function(err) {
  const oz_strategy_options = {
    oz: {
      encryptionPassword: process.env.ENCRYPTIONPASSWORD,
      loadAppFunc: Cognito.loadAppFunc,
      loadGrantFunc: Cognito.loadGrantFunc,
    }
  };

  server.auth.strategy('oz', 'oz', true, oz_strategy_options);
  
  server.register(Cognito, { routes: { prefix: '/cognito' } }, cb);
  server.register(Gigya, { routes: { prefix: '/gigya' } }, cb);
  server.register(Drupal, { routes: { prefix: '/drupal' } }, cb);
});


server.route({
  method: 'GET',
  path: '/favicon.ico',
  config: {
    auth: false
  },
  handler: function(request, reply){
    reply();
  }
});

server.route({
  method: 'GET',
  path: '/{param*}',
  config: {
    auth: false
  },
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
