/*jshint node: true */
'use strict';

const Hapi = require('hapi');
const Inert = require('inert');
const Login = require('./login');
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
consoleApp.register(Login, { routes: { prefix: '/login' } }, cb);
consoleApp.register(Proxy, { routes: { prefix: '/p' } }, cb);

consoleApp.route({
  method: 'GET',
  path: '/favicon.ico',
  handler: function(request, reply){
    reply();
  }
});

consoleApp.route({
  method: 'GET',
  path: '/{param*}',
  handler: {
    directory: {
      path: './console/client',
      redirectToSlash: true,
      index: true
    }
  }
});

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
