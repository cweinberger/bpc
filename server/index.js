/*jshint node: true */
'use strict';

const Hapi = require('hapi');
const Joi = require('joi');
const crypto = require('crypto');
const Rsvp = require('./rsvp');
const OzLoadFuncs = require('./oz_loadfuncs');
const OzAdmin = require('./oz_admin');
const Validate = require('./validate');
const Permissions = require('./permissions');
const Settings = require('./settings');
const Scarecrow = require('scarecrow');
const Good = require('good');
const GoodConsole = require('good-console');

const goodOpts = {
  reporters: {
    cliReporter: [{
      module: 'good-squeeze',
      name: 'Squeeze',
      args: [{ log: '*', response: '*' }]
    },{
      module: 'good-console'
    }, 'stdout']
  }
};

const server = new Hapi.Server();
server.connection({ port: process.env.PORT ? parseInt(process.env.PORT) + 1 : 8000 + 1 });


server.register({register: Good, options: goodOpts}, cb);
// server.register(Scarecrow, function(err) {
server.register(Scarecrow, function(err) {
  const oz_strategy_options = {
    oz: {
      encryptionPassword: process.env.ENCRYPTIONPASSWORD,
      loadAppFunc: OzLoadFuncs.loadAppFunc,
      loadGrantFunc: OzLoadFuncs.loadGrantFunc,
    },
    urls: {
      app: '/ticket/app',
      reissue: '/ticket/reissue',
      rsvp: '/ticket/user'
    }
  };

  server.auth.strategy('oz', 'oz', true, oz_strategy_options);

  server.register(Rsvp, { routes: { prefix: '/rsvp' } }, cb);
  server.register(OzAdmin, { routes: { prefix: '/admin' } }, cb);
  server.register(Validate, { routes: { prefix: '/validate' } }, cb);
  server.register(Permissions, { routes: { prefix: '/permissions' } }, cb);
  server.register(Settings, { routes: { prefix: '/settings' } }, cb);
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
