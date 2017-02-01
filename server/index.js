/*jshint node: true */
'use strict';

const Hapi = require('hapi');
const Joi = require('joi');
const crypto = require('crypto');
const Tickets = require('./tickets');
const OzAdmin = require('./oz_admin');
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
server.register(Scarecrow, function(err) {
  const oz_strategy_options = {
    oz: {
      encryptionPassword: process.env.ENCRYPTIONPASSWORD,
      loadAppFunc: Tickets.loadAppFunc,
      loadGrantFunc: Tickets.loadGrantFunc,
    }
  };

  server.auth.strategy('oz', 'oz', true, oz_strategy_options);

  server.register(Tickets, { routes: { prefix: '/tickets' } }, cb);
  server.register(OzAdmin, { routes: { prefix: '/admin' } }, cb);
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
