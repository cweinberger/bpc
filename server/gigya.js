/*jshint node: true */
'use strict';

module.exports.register = function (server, options, next) {

  server.route({
    method: 'GET',
    path: '/',
    handler: function (request, reply) {
      reply('Hello gigya!');
    }
  });

  next();
};

module.exports.register.attributes = {
  name: 'gigya',
  version: '1.0.0'
};
