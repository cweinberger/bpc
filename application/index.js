/*jshint node: true */
'use strict';

const Hapi = require('hapi');
const Inert = require('inert');
const Resources = require('./resources');
const Ticket = require('./ticket');

const application = new Hapi.Server();
application.connection({ port: process.env.PORT ? process.env.PORT : 8000 });

application.state('ticket', {
  ttl: 1000 * 60 * 60 * 24 * 30, // (one month)
  isHttpOnly: false,
  isSecure: false,
  // isSameSite: false,
  path: '/',
  encoding: 'base64json'
});

application.register(Inert, () => {});
application.register(Resources, { routes: { prefix: '/resources' } }, cb);
application.register(Ticket, { routes: { prefix: '/ticket' } }, cb);



application.route({
  method: 'GET',
  path: '/favicon.ico',
  handler: function(request, reply){
    reply();
  }
});

application.route({
  method: 'GET',
  path: '/{param*}',
  handler: {
    directory: {
      path: './application/client',
      redirectToSlash: true,
      index: true
    }
  }
});

application.start((err) => {
  if (err) {
    throw err;
  }
  console.log(`Application running at: ${application.info.uri}`);
});

function cb (err) {
  if (err) {
    console.log('Error when loading plugin', err);
    application.stop();
  }
}
