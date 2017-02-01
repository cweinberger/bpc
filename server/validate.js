/*jshint node: true */
'use strict';

const Boom = require('boom');
const Joi = require('joi');
const Oz = require('oz');
const MongoDB = require('./mongodb_client');

//Declaration of all properties linked to the environment (beanstalk configuration)
const ENCRYPTIONPASSWORD = process.env.ENCRYPTIONPASSWORD;

module.exports.register = function (server, options, next) {

  server.route({
    method: 'POST',
    path: '/ticket',
    config: {
      auth: {
        strategy: 'oz',
        access: {
          scope: false,
          entity: 'any'
        }
      },
      cors: {
        credentials: true,
        origin: ['*'],
        // access-control-allow-methods:POST
        headers: ['Accept', 'Authorization', 'Content-Type', 'If-None-Match'],
        exposedHeaders: ['WWW-Authenticate', 'Server-Authorization'],
        maxAge: 86400
      },
      state: {
        parse: true,
        failAction: 'log'
      }
    },
    handler: function(request, reply) {
      console.log('validateticket');
      reply({});
    }
  });


  server.route({
    method: 'POST',
    path: '/appticket',
    config: {
      auth: {
        strategy: 'oz',
        access: {
          scope: false,
          entity: 'app'
        }
      },
      cors: {
        credentials: true,
        origin: ['*'],
        // access-control-allow-methods:POST
        headers: ['Accept', 'Authorization', 'Content-Type', 'If-None-Match'],
        exposedHeaders: ['WWW-Authenticate', 'Server-Authorization'],
        maxAge: 86400
      },
      state: {
        parse: true,
        failAction: 'log'
      }
    },
    handler: function(request, reply) {
      console.log('validateappticket');
      reply({});
    }
  });


    server.route({
      method: 'GET',
      path: '/userticket',
      config: {
        auth: {
          strategy: 'oz',
          access: {
            // scope: '{query.scope}',
            entity: 'user'
          }
        },
        cors: {
          credentials: true,
          origin: ['*'],
          // access-control-allow-methods:POST
          headers: ['Accept', 'Authorization', 'Content-Type', 'If-None-Match'],
          exposedHeaders: ['WWW-Authenticate', 'Server-Authorization'],
          maxAge: 86400
        },
        state: {
          parse: true,
          failAction: 'log'
        }
      },
      handler: function(request, reply) {
        reply();
      }
    });


  server.route({
    method: 'POST',
    path: '/userticket',
    config: {
      auth: {
        strategy: 'oz',
        access: {
          scope: false,
          entity: 'user'
        }
      },
      cors: {
        credentials: true,
        origin: ['*'],
        // access-control-allow-methods:POST
        headers: ['Accept', 'Authorization', 'Content-Type', 'If-None-Match'],
        exposedHeaders: ['WWW-Authenticate', 'Server-Authorization'],
        maxAge: 86400
      },
      state: {
        parse: true,
        failAction: 'log'
      }
    },
    handler: function(request, reply) {

     var subset = request.payload.scope;

     if (subset === undefined || subset === null){
       // The user ticket is not being validated against a subset of scopes.
       return reply({});
     }

     if (subset instanceof Array === false) {
       subset = [subset];
     }

     var err = Oz.scope.validate(subset);
     if (err){
       return reply(Boom.badRequest('Invalid request scope'));
     }

     // We check if the requested scope (subset) is contained in the users grant scope (superset)
     getTicketFromHawkHeader(request.headers.authorization, function(err, ticket){

       var superset = ticket.scope;
       var err = Oz.scope.validate(superset);
       if (err){
         return reply(Boom.badRequest('Invalid ticket scope'));
       }

       if (!Oz.scope.isSubset(superset, subset)){
         return reply(Boom.forbidden('Ticket scope not a subset of request scope'));
       } else {
         reply({});
       }
     });
    }
  });


  server.route({
    method: 'POST',
    path: '/userpermissions',
    config: {
      auth: {
        strategy: 'oz',
        access: {
          scope: false,
          entity: 'user'
        }
      },
      cors: {
        credentials: true,
        origin: ['*'],
        // access-control-allow-methods:POST
        headers: ['Accept', 'Authorization', 'Content-Type', 'If-None-Match'],
        exposedHeaders: ['WWW-Authenticate', 'Server-Authorization'],
        maxAge: 86400
      },
      state: {
        parse: true,
        failAction: 'log'
      }
    },
    handler: function(request, reply) {
      var permissions = request.payload.permissions;

      if (permissions === undefined || permissions === null){
        // The user ticket is not being validated against a subset of scopes.
        reply(badRequest('Missing permissions in payload'));
      }

      if (permissions instanceof Array === false) {
        permissions = [permissions];
      }

      getTicketFromHawkHeader(request.headers.authorization, function(err, ticket){

        const validatePermissionsInTicketInsteadOfMongo = true;

        if (validatePermissionsInTicketInsteadOfMongo){

          var passes = false;

          if(request.payload.all) {
            passes = permissions.every(isIn(ticket.ext.private.Permissions));
          } else {
            passes = ticket.ext.private.Permissions.some(isIn(permissions));
          }

          if (passes){
            reply();
          } else {
            reply(Boom.forbidden());
          }

          function isIn(array){
            return function (entry){
              return array.indexOf(entry) > -1;
            }
          }

        } else {

          var query = {
            IdentityId: ticket.user
          };

          if(request.payload.all) {
            query.Permissions = { $all: permissions };
          } else {
            query.$or = permissions.map(function(permission){
              return {Permissions: permission};
            });
          }

          // Querying the user with the specified permissions
          MongoDB.collection('users').findOne(query, {_id:1}, function(err, user){
            if (err){
              reply(err)
            } else if (user === null) {
              reply(Boom.forbidden());
            } else {
              reply();
            }
          });
        }

      });
    }
  });

  next();
};

module.exports.register.attributes = {
  name: 'validate',
  version: '1.0.0'
};


function getTicketFromHawkHeader(requestHeaderAuthorization, callback){
  var id = requestHeaderAuthorization.match(/id=([^,]*)/)[1].replace(/"/g, '');
  if (id === undefined || id === null || id === ''){
    return callback(Boom.unauthorized('Authorization Hawk ticket not found'));
  }

  Oz.ticket.parse(id, ENCRYPTIONPASSWORD, {}, callback);
}
