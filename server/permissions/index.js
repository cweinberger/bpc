/*jshint node: true */
'use strict';

const Boom = require('boom');
const Joi = require('joi');
const Oz = require('oz');
const OzLoadFuncs = require('./../oz_loadfuncs');
const MongoDB = require('./../mongo/mongodb_client');

module.exports.register = function (server, options, next) {

  server.route({
    method: 'GET',
    path: '/{name}',
    config: {
      auth: {
        access: {
          scope: ['{params.name}', 'admin'],
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

      OzLoadFuncs.parseAuthorizationHeader(request.headers.authorization, function(err, ticket){
        if (err) {
          return reply(err)
        }

        // Should we query the database or look in the private part of the ticket?
        if (true) {

          queryPermissionsScope({ id: ticket.user }, request.params.name, reply);

        } else {

          if (ticket.ext.private.Permissions === undefined || ticket.ext.private.Permissions[request.params.name] === undefined){
            reply(Boom.forbidden());
          }

          // We only want to reply the permissions within the requested scope
          var Permissions = Object.assign({}, ticket.ext.private.Permissions[request.params.name]);

          reply(Permissions);
        }
      });
    }
  });

  server.route({
    method: 'GET',
    path: '/{user}/{name}',
    config: {
      auth: {
        access: {
          scope: ['{params.name}', 'admin'],
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
      queryPermissionsScope({ id: request.params.user }, request.params.name, reply);
    }
  });

  // server.route({
  //   method: 'GET',
  //   path: '/{user}/{name}/{key}',
  //   config: {
  //     auth: {
  //       access: {
  //         scope: ['{params.name}', 'admin'],
  //         entity: 'app' // <-- Important. Users must not be allowed to query permissions
  //       }
  //     },
  //     cors: {
  //       credentials: true,
  //       origin: ['*'],
  //       // access-control-allow-methods:POST
  //       headers: ['Accept', 'Authorization', 'Content-Type', 'If-None-Match'],
  //       exposedHeaders: ['WWW-Authenticate', 'Server-Authorization'],
  //       maxAge: 86400
  //     },
  //     state: {
  //       parse: true,
  //       failAction: 'log'
  //     }
  //   },
  //   handler: function(request, reply) {
  //     console.log('GET permissions key', request.params.name, request.params.key);
  //
  //     var queryProject = {
  //       _id: 0
  //     };
  //     queryProject['Permissions.'.concat(request.params.name, '.', request.params.key)] = 1;
  //
  //     MongoDB.collection('users').findOne(
  //       {
  //         UID: request.query.UID,
  //         email: request.query.email
  //       },
  //       queryProject
  //       , function (err, result){
  //         if (err) {
  //           console.error(err);
  //         }
  //
  //         reply(err, result);
  //       }
  //     );
  //   }
  // });

  server.route({
    method: 'POST',
    path: '/{user}/{name}',
    config: {
      auth: {
        access: {
          scope: ['{params.name}', 'admin'],
          entity: 'app' // <-- Important. Users must not be allowed to set permissions
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
      },
      validate: {
        payload: Joi.object()
      }
    },
    handler: function(request, reply) {
      setPermissionsScope(
        {
          id: request.params.user
        },
        request.params.name,
        request.payload,
        reply
      );
    }
  });


  server.route({
    method: 'GET',
    path: '/{provider}/{email}/{scope}',
    config: {
      auth: {
        access: {
          scope: ['{params.scope}', 'admin'],
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
      },
      validate: {
        params: {
          provider: Joi.string().valid('gigya', 'google'),
          email: Joi.string().email(),
          scope: Joi.string()
        }
      }
    },
    handler: function(request, reply) {

      var selector = {
        provider: request.params.provider,
        email: request.params.email.toLowerCase()
      };

      queryPermissionsScope(
        selector,
        request.params.scope,
        reply
      );
    }
  });


  server.route({
    method: 'POST',
    path: '/{provider}/{email}/{scope}',
    config: {
      auth: {
        access: {
          scope: ['{params.scope}', 'admin'],
          entity: 'app' // <-- Important. Users must not be allowed to set permissions
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
      },
      validate: {
        params: {
          provider: Joi.string().valid('gigya', 'google'),
          email: Joi.string().email(),
          scope: Joi.string()
        },
        payload: Joi.object()
      }
    },
    handler: function(request, reply) {

      var selector = {
        provider: request.params.provider,
        email: request.params.email.toLowerCase()
      };

      setPermissionsScope(
        selector,
        request.params.scope,
        request.payload,
        reply
      );
    }
  });

  next();
};


module.exports.register.attributes = {
  name: 'permissions',
  version: '1.0.0'
};


function queryPermissionsScope(selector, scope, callback) {
  var queryProject = {
    _id: 0
  };
  queryProject['dataScopes.'.concat(scope)] = 1;

  MongoDB.collection('users').findOne(
    selector,
    queryProject
    , function (err, result){
      if (err) {
        console.error(err);
        return callback(err);
      }

      if (!result) {
        callback(Boom.notFound());
      }
      else {
        callback(null, result.dataScopes[scope]);
      }
    }
  );
}


function setPermissionsScope(selector, scope, payload, callback) {
  var set = {};
  Object.keys(payload).forEach(function(key){
    set['dataScopes.'.concat(scope,'.', key)] = payload[key];
  });

  MongoDB.collection('users').update(
    selector,
    {
      $currentDate: { 'lastUpdated': { $type: "date" } },
      $set: set
    },
    {
      upsert: true,
      // We're update multi because when updating using {provider}/{email} endpoint e.g. gigya/dako@berlingskemedia.dk
      //   there is a possibility that the user was deleted and created in Gigya with a new UID.
      //   In this case we have multiple user-objects in BPC. So to be safe, we update them all so nothing is lost.
      multi: true
      //  writeConcern: <document>, // Perhaps using writeConcerns would be good here. See https://docs.mongodb.com/manual/reference/write-concern/
      //  collation: <document>
    },
    function(err, result){
      if (err){
        callback(Boom.internal('Database error', err));
      } else if (result === null) {
        callback(Boom.notFound());
      } else {
        callback({'status': 'ok'});
      }
    }
  );
}
