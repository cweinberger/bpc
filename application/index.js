/*jshint node: true */
'use strict';

const Hapi = require('hapi');
const Inert = require('inert');
const Joi = require('joi');
const Resources = require('./resources');
const Login = require('./login');



const application = new Hapi.Server();
application.connection({ port: process.env.PORT ? parseInt(process.env.PORT) + 1 : 8000 + 1 });

application.register(Inert, () => {});
application.register(Resources, { routes: { prefix: '/resources' } }, cb);
application.register(Login, { routes: { prefix: '/login' } }, cb);



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
