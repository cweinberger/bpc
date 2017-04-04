/* jshint node: true */
'use strict';

const Hapi = require('hapi');
const Joi = require('joi');
const crypto = require('crypto');
const Plugins = require('./plugins');
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

  server.register(Plugins, cb);
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
