/*jshint node: true */
'use strict';

const sso_client = require('./sso_client');
var prefix;

function proxy (request, reply) {
  sso_client.request(request.method, request.path.replace(prefix,'/admin'), request.payload, request.state.ticket, reply);
}

module.exports.register = function (server, options, next) {
  prefix = server.realm.modifiers.route.prefix;

  server.route({
    method: 'GET',
    path: '/applications',
    handler: proxy
  });

  server.route({
    method: 'GET',
    path: '/grants',
    handler: proxy
  });

  next();
};

module.exports.register.attributes = {
  name: 'proxy',
  version: '1.0.0'
};
