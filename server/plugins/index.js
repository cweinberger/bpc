/* jshint node: true */
'use strict';

// Refactored.
const Rsvp = require('./../rsvp');

// No refactoring required.
const Health = require('./health');

// Not yet refactored.
const Applications = require('./applications');
const Users = require('./users');
const Permissions = require('./permissions');
const Me = require('./me');
const Settings = require('./settings');


module.exports.register = function (server, options, next) {
  server.register(Health, cb);
  server.register(Rsvp, { routes: { prefix: '/rsvp' } }, cb);
  server.register(Applications, { routes: { prefix: '/applications' } }, cb);
  server.register(Users, { routes: { prefix: '/users' } }, cb);
  server.register(Permissions, { routes: { prefix: '/permissions' } }, cb);
  server.register(Me, { routes: { prefix: '/me' } }, cb);
  server.register(Settings, { routes: { prefix: '/settings' } }, cb);
  next();
};


module.exports.register.attributes = {
  name: 'plugins',
  version: '1.0.0'
};


function cb(err) {
  if (err) {
    console.log('Error when loading plugin', err);
    server.stop();
  }
}
