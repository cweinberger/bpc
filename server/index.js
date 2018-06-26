/* jshint node: true */
'use strict';


const Hapi = require('hapi');
const Health = require('./health');
const Rsvp = require('./rsvp');
const Anonymous = require('./anonymous');
const Applications = require('./applications');
const Users = require('./users');
const Superadmin = require('./superadmin');
const Gigya = require('./gigya');
const Permissions = require('./permissions');
const Validate = require('./validate');
const Settings = require('./settings');
const OzLoadFuncs = require('./oz_loadfuncs');
const Scarecrow = require('scarecrow');
const Good = require('good');
const Config = require('./config');
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

server.connection({ port: Config.PORT });


server.register(Scarecrow, function(err) {
  server.auth.strategy('oz', 'oz', true, OzLoadFuncs.strategyOptions);
  server.register(Anonymous, { routes: { prefix: '/au' } }, cb);
  server.register(Health, cb);
  server.register(Rsvp, { routes: { prefix: '/rsvp' } }, cb);
  server.register(Applications, { routes: { prefix: '/applications' } }, cb);
  server.register(Users, { routes: { prefix: '/users' } }, cb);
  server.register(Superadmin, { routes: { prefix: '/superadmin' } }, cb);
  server.register(Gigya, { routes: { prefix: '/gigya' } }, cb);
  server.register(Permissions, { routes: { prefix: '/permissions' } }, cb);
  server.register(Validate, { routes: { prefix: '/validate' } }, cb);
  server.register(Settings, { routes: { prefix: '/settings' } }, cb);
});


if (process.env.NODE_ENV === 'test') {
  // We are running tests.
} else {
  // We don't need the logging output while running tests
  server.register({register: Good, options: goodOpts}, cb);
}


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

module.exports = server;
