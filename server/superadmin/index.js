/*jshint node: true */
'use strict';


const Boom = require('boom');
const Joi = require('joi');
const ObjectID = require('mongodb').ObjectID;
const MongoDB = require('./../mongo/mongodb_client');
const EventLog = require('./../audit/eventlog');


module.exports.register = function (server, options, next) {

  const stdCors = {
    credentials: true,
    origin: ['*'],
    headers: ['Accept', 'Authorization', 'Content-Type', 'If-None-Match'],
    exposedHeaders: ['WWW-Authenticate', 'Server-Authorization'],
    maxAge: 86400
  };

  server.route({
    method: 'POST',
    path: '/{id}',
    config: {
      auth:  {
        access: {
          scope: ['+admin:*'],
          entity: 'user' // Only superadmin users are allows to promote other superadmins
        }
      },
      cors: stdCors
    },
    handler: function(request, reply) {

      const ticket = request.auth.credentials;

      let query = {
        app: ticket.app
      };

      if(ObjectID.isValid(request.params.id)) {
        query._id = new ObjectID(request.params.id);
      } else {
        query.id = request.params.id;
      }

      const update = {
        $addToSet: { scope: 'admin:*' }
      };

      MongoDB.collection('grants')
      .updateOne(query, update)
      .then(result => {
        EventLog.logUserEvent(
          request.params.id,
          'Add Scope to User',
          {scope: 'admin:*', byUser: ticket.user}
        );

        reply({'status': 'ok'});

      })
      .catch(err => {

        console.error(err);
        EventLog.logUserEvent(
          request.params.id,
          'Scope Change Failed',
          {scope: 'admin:*', byUser: ticket.user}
        );

        return reply(err);
      });
    }
  });


  server.route({
    method: 'DELETE',
    path: '/{id}',
    config: {
      auth:  {
        access: {
          scope: ['+admin:*'],
          entity: 'user' // Only superadmin users are allows to demote other superadmins
        }
      },
      cors: stdCors
    },
    handler: function(request, reply) {

      const ticket = request.auth.credentials;

      if (ticket.grant === request.params.id){
        return reply(Boom.forbidden('You cannot demote yourself'));
      }

      MongoDB.collection('grants').update(
        {
          id: request.params.id,
          app: ticket.app
        }, {
          $pull: { scope: 'admin:*' }
        },
        function(err, result) {

          if (err) {
            EventLog.logUserEvent(
              request.params.id,
              'Scope Change Failed',
              {scope: 'admin:*', byUser: ticket.user}
            );
            return reply(err);
          }

          EventLog.logUserEvent(
            request.params.id,
            'Remove Scope from User',
            {scope: 'admin:*', byUser: ticket.user}
          );

          reply({'status': 'ok'});
        }
      );
    }
  });



  next();

};


module.exports.register.attributes = {
  name: 'superadmin',
  version: '1.0.0'
};
