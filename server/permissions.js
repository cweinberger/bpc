/*jshint node: true */
'use strict';

const Boom = require('boom');
const Joi = require('joi');
const Oz = require('oz');
const OzLoadFuncs = require('./oz_loadfuncs');
const MongoDB = require('./mongodb_client');

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

          queryPermissionsScope(ticket.user, request.params.name, reply);

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
      queryPermissionsScope(request.params.user, request.params.name, reply);
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

      var set = {};
      Object.keys(request.payload).forEach(function(key){
        set['Permissions.'.concat(request.params.name,'.', key)] = request.payload[key];
      });

      MongoDB.collection('users').updateOne(
        {
          id: request.params.user
        },
        {
          $currentDate: { 'Updated': { $type: "timestamp" } },
          $set: set
        },
        {
          upsert: true
          //  writeConcern: <document>, // Perhaps using writeConcerns would be good here. See https://docs.mongodb.com/manual/reference/write-concern/
          //  collation: <document>
        },
        function(err, result){
          if (err){
            reply(err)
          } else if (result === null) {
            reply(Boom.notFound());
          } else {
            reply();
          }
        }
      );
    }
  });

  next();
};


module.exports.register.attributes = {
  name: 'permissions',
  version: '1.0.0'
};


function queryPermissionsScope(user, scope, callback) {
  var queryProject = {
    _id: 0
  };
  queryProject['Permissions.'.concat(scope)] = 1;

  MongoDB.collection('users').findOne(
    {
      id: user
    },
    queryProject
    , function (err, result){
      if (err) {
        console.error(err);
        return callback(err);
      }

      callback(null, result.Permissions[scope]);
    }
  );
}
