/* jshint node: true */
'use strict';


const Hapi = require('hapi');
const Joi = require('joi');
const crypto = require('crypto');
const Health = require('./health');
const Rsvp = require('./rsvp');
const Applications = require('./applications');
const Users = require('./users');
const Permissions = require('./permissions');
const Me = require('./me');
const Bewit = require('./bewit');
const Settings = require('./settings');
const OzLoadFuncs = require('./oz_loadfuncs');
const Scarecrow = require('scarecrow');
const Good = require('good');
const GoodConsole = require('good-console');


const goodOpts = {
  reporters: {
    cliReporter: [{
      module: 'good-squeeze',
      name: 'Squeeze',
      args: [{ log: '*', response: '*' }]
    }, {
      module: 'good-console'
    }, 'stdout']
  }
};


const server = new Hapi.Server();

server.connection({ port: process.env.PORT ? process.env.PORT : 8000 });

server.register({register: Good, options: goodOpts}, cb);

server.register(Scarecrow, function(err) {
  server.auth.strategy('oz', 'oz', true, OzLoadFuncs.strategyOptions);
  server.register(Health, cb);
  server.register(Rsvp, { routes: { prefix: '/rsvp' } }, cb);
  server.register(Applications, { routes: { prefix: '/applications' } }, cb);
  server.register(Users, { routes: { prefix: '/users' } }, cb);
  server.register(Permissions, { routes: { prefix: '/permissions' } }, cb);
  server.register(Me, { routes: { prefix: '/me' } }, cb);
  server.register(Bewit, { routes: { prefix: '/bewit' } }, cb);
  server.register(Settings, { routes: { prefix: '/settings' } }, cb);
});


server.start((err) => {
  if (err) {
    throw err;
  }
  console.log(`Server running at: ${server.info.uri}`);
});


function cb(err) {
  if (err) {
    console.log('Error when loading plugin', err);
    server.stop();
  }
}
