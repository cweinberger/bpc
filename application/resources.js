/*jshint node: true */
'use strict';

module.exports.register = function (server, options, next) {

  server.route({
    method: 'GET',
    path: '/',
    config: {
      cors: false,
      state: {
        parse: true, // parse and store in request.state
        failAction: 'log' // may also be 'ignore' or 'log'
      }
    },
    handler: getResources
  });

  next();
};

module.exports.register.attributes = {
  name: 'resources',
  version: '1.0.0'
};


function getResources (request, reply) {
  reply();
}
