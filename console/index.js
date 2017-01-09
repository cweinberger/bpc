/*jshint node: true */
'use strict';

const Hapi = require('hapi');
const Inert = require('inert');
const Ticket = require('./ticket');
const Proxy = require('./proxy');

const consoleApp = new Hapi.Server();
consoleApp.connection({ port: process.env.PORT ? parseInt(process.env.PORT) + 2 : 8000 + 2 });

consoleApp.state('ticket', {
  ttl: 1000 * 60 * 60 * 24 * 30, // (one month)
  isHttpOnly: false,
  isSecure: false,
  // isSameSite: false,
  path: '/',
  encoding: 'base64json'
});

consoleApp.register(Inert, () => {});
consoleApp.register(Ticket, { routes: { prefix: '/ticket' } }, cb);
consoleApp.register(Proxy, { routes: { prefix: '/admin' } }, cb);

consoleApp.route({
  method: 'GET',
  path: '/favicon.ico',
  handler: function(request, reply){
    reply();
  }
});

consoleApp.route({
  method: 'get',
  path: '/build/{param*}',
  handler: {
    directory: {
      path: './console/client/build'
    }
  }
});

consoleApp.route({
  method: 'get',
  path: '/assets/{param*}',
  handler: {
    directory: {
      path: './console/client/assets'
    }
  }
});

consoleApp.route({
  method: 'get',
  path: '/{param*}',
  handler: {
    file: './console/client/index.html'
  }
});

// consoleApp.route({
//   method: 'GET',
//   path: '/{param*}',
//   handler: {
//     directory: {
//       path: './console/client',
//       redirectToSlash: true,
//       index: true
//     }
//   }
// });

consoleApp.start((err) => {
  if (err) {
    throw err;
  }
  console.log(`ConsoleApp running at: ${consoleApp.info.uri}`);
});

function cb (err) {
  if (err) {
    console.log('Error when loading plugin', err);
    consoleApp.stop();
  }
}
