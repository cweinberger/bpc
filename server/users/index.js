/*jshint node: true */
'use strict';


const Boom = require('boom');
const Joi = require('joi');
const Oz = require('oz');
const OzLoadFuncs = require('./../oz_loadfuncs');
const crypto = require('crypto');
const MongoDB = require('./../mongo/mongodb_client');
const Users = require('./users');
const Gigya = require('./../gigya/gigya_client');
const GigyaUtils = require('./../gigya/gigya_utils');
const EventLog = require('./../audit/eventlog');
const exposeError = GigyaUtils.exposeError;



module.exports.register = function (server, options, next) {

  const stdCors = {
    credentials: true,
    origin: ['*'],
    headers: ['Accept', 'Authorization', 'Content-Type', 'If-None-Match'],
    exposedHeaders: ['WWW-Authenticate', 'Server-Authorization'],
    maxAge: 86400
  };


  server.route({
    method: 'GET',
    path: '/',
    config: {
      auth: {
        access: {
          scope: ['admin', 'users'],
          entity: 'any'
        }
      },
      cors: stdCors,
      validate: {
        query: Joi.object().keys({
          email: Joi.string().email(),
          provider: Joi.string().valid('gigya', 'google').default('gigya')
        }).unknown(false)
      }
    },
    handler: function(request, reply) {
      var query = {
        deletedAt: {$exists: false},
        email: request.query.email.toLowerCase(),
        provider: request.query.provider
      };

      MongoDB.collection('users').find(query)
        .toArray(reply);
    }
  });


  // TODO: Remove GET /schema
  server.route({
    method: 'GET',
    path: '/schema',
    config: {
      auth: {
        access: {
          scope: ['admin', 'users'],
          entity: 'any'
        }
      },
      cors: stdCors
    },
    handler: function(request, reply) {
      Gigya.callApi('/accounts.getSchema', {format: 'json'}).then(
        res => reply(res.body),
        err => exposeError(reply, err)
      );
    }
  });


  // TODO: Remove PATCH /schema
  server.route({
    method: 'PATCH',
    path: '/schema',
    config: {
      auth: {
        access: {
          scope: ['admin', 'users'],
          entity: 'any'
        }
      },
      cors: stdCors
    },
    handler: function(request, reply) {
      const _body = Object.assign({}, request.payload, {
        format: 'json'
      });

      Gigya.callApi('/accounts.setSchema', _body).then(
        res => reply(res.body),
        err => exposeError(reply, err)
      );
    }
  });


  /**
   * GET /users/search
   *
   * Query parameters:
   * - query=<Gigya SQL-style query> eg.;
   *   SELECT * FROM accounts WHERE profile.email = "mkoc@berlingskemedia.dk"
   */
  server.route({
    method: 'GET',
    path: '/search',
    config: {
      auth: {
        access: {
          scope: ['admin', 'users'],
          entity: 'any'
        }
      },
      cors: stdCors
    },
    handler: (request, reply) => {

      const payload = {
        query: request.query.query
      };

      return Gigya.callApi('/accounts.search', payload)
        .then(res => reply(res.body), err => exposeError(reply, err));
    }
  });


  /**
   * GET /users/exists
   *
   * Query parameters:
   * - email=email to check
   */
  server.route({
    method: 'GET',
    path: '/exists',
    config: {
      auth: {
        access: {
          scope: ['admin', 'users'],
          entity: 'any'
        }
      },
      cors: stdCors,
      validate: {
        query: Joi.object().keys({
          email: Joi.string().email()
        }).unknown(false)
      }
    },
    handler: (request, reply) => {
      return Gigya.callApi('/accounts.isAvailableLoginID', {loginID: request.query.email})
        .then(res => reply(res.body), err => exposeError(reply, err));
    }
  });


  // TODO: this endpoint must be moved to /gigya and re-written to only create user in Gigya.
  // Then the webhook event accountCreated will be fired and the user created in Mongo
  server.route({
    method: 'POST',
    path: '/register',
    config: {
      auth:  {
        access: {
          scope: ['admin', 'users'],
          entity: 'any'
        }
      },
      cors: stdCors,
      validate: {
        payload: {
          data: Joi.object().optional(),
          email: Joi.string().email().required(),
          password: Joi.string().required(),
          profile: Joi.object().optional(),
          regSource: Joi.string().optional()
        }
      }
    },
    handler: (request, reply) => {

      const user = request.payload;
      // Lowercase the email.
      user.email = user.email.toLowerCase();

      // TODO: It's not obvious what Users.register does.
      // Does is store in Gigya, MongoDB or both??
      // Seperate it into more functions so it's obvious its both Gigya and MongoDB
      Users.register(user).then(
        data => reply(data.body ? data.body : data),
        err => {
          if (err.code === 400009 && Array.isArray(err.details) &&
              err.details.length && err.details[0].errorCode === 400003) {
            // Reply with a conflict if the email address exists.
            return reply(Boom.conflict(
              `[${err.details[0].errorCode}] ${err.details[0].message}`
            ));
          } else {
            // Reply with the usual Internal Server Error otherwise.
            return exposeError(reply, err);
          }
        }
      );

    }
  });


  // TODO: this endpoint must be moved to /gigya and re-written to only update user in Gigya.
  // Then the webhook event accountUpdatedEventHandler will be fired and the user created in Mongo
  server.route({
    method: 'POST',
    path: '/update',
    config: {
      auth:  {
        access: {
          scope: ['admin', 'users'],
          entity: 'any'
        }
      },
      cors: stdCors,
      validate: {
        payload: {
          data: Joi.object().optional(),
          email: Joi.string().email().required(),
          profile: Joi.object().optional()
        }
      }
    },
    handler: (request, reply) => {

      const user = request.payload;
      const userQuery = {email: user.email};
      MongoDB.collection('users').findOne(userQuery, function(err, result) {
        if (err) {
          reply(Boom.internal(err.message, userQuery, err.code));
        } else {
          if (!result) {
            reply(Boom.notFound('User not found', userQuery))
          } else {

            Users.updateUserId(result)
            .catch((err) => {
              return reply(Boom.notFound("User " + user.email + " not found", err));
            })
            .then((id) => {
              delete user.email;
              user.uid = id;

              Gigya.callApi('/accounts.setAccountInfo', user).then(
                data => reply(data.body ? data.body : {status: 'ok'}),
                err => {
                  EventLog.logUserEvent(null, 'User update failed', {email: user.email});
                  // Reply with the usual Internal Server Error otherwise.
                  return reply(GigyaUtils.errorToResponse(err, err.validationErrors));
                }
              );
            });
          }
        }
      });
    }
  });


  server.route({
    method: 'POST',
    path: '/resetpassword',
    config: {
      auth: {
        access: {
          scope: ['admin', 'users'],
          entity: 'any'
        }
      },
      cors: stdCors,
      validate: {
        payload: {
          email: Joi.string().email().required(),
          newPassword: Joi.string().required()
        }
      }
    },
    handler: function(request, reply) {

      var newPassword = request.payload.newPassword;

      Gigya.callApi('/accounts.resetPassword', {
        loginID: request.payload.email,
        sendEmail: false
      }).then(function (response) {

        Gigya.callApi('/accounts.resetPassword', {
          passwordResetToken: response.body.passwordResetToken,
          newPassword: newPassword,
          sendEmail: false
        }).then(function(response) {
          reply({'status': 'ok'});
        }).catch(function(err){
          console.error(err);
          return exposeError(reply, err);
        });

      }).catch(function(err) {

        console.error(err);
        return exposeError(reply, err);

      });
    }
  });



  server.route({
    method: 'GET',
    path: '/{id}',
    config: {
      auth:  {
        access: {
          scope: ['admin', 'users'],
          entity: 'any'
        }
      },
      cors: stdCors
    },
    handler: function(request, reply) {
      // TODO: Move code to user.js
      MongoDB.collection('users').aggregate(
        [{
          $match: {
            id: request.params.id
          }
        }, {
          $lookup: {
            from: 'grants',
            localField: 'id',
            foreignField: 'user',
            as: 'grants'
          }
        }], (err, result) => {
          if (err) {
            return reply(err);
          } else if (result === null || result.length !== 1) {
            return reply(Boom.notFound());
          }
          reply(result[0]);
      });
    }
  });


  server.route({
    method: 'DELETE',
    path: '/{id}',
    config: {
      auth: {
        access: {
          scope: ['admin', 'users'],
          entity: 'any'
        }
      },
      cors: stdCors
    },
    handler: (request, reply) => {

      OzLoadFuncs.parseAuthorizationHeader(request.headers.authorization, function (err, ticket) {

        if (err) {
          console.error(err);
          return reply(GigyaUtils.errorToResponse(err));
        }

        if (ticket.user === request.params.id){
          return reply(Boom.badRequest('You cannot delete yourself'));
        }

        Users.deleteUserId(request.params.id)
        .then(() => {
          EventLog.logUserEvent(request.params.id, 'Deleting user');
          reply({'status': 'ok'});
        })
        .catch((err) => {
          EventLog.logUserEvent(request.params.id, 'Deleting user Failed');
          return reply(err);
        });
      });
    }
  });


  server.route({
    method: 'POST',
    path: '/{id}/superadmin',
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
      OzLoadFuncs.parseAuthorizationHeader(request.headers.authorization, function(err, ticket) {
        // TODO: Move code to user.js
        MongoDB.collection('grants').update(
          {
            app: ticket.app,
            user: request.params.id
          }, {
            $addToSet: { scope: 'admin:*' }
          }, function (err, result) {

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
              'Add Scope to User',
              {scope: 'admin:*', byUser: ticket.user}
            );
            reply({'status': 'ok'});

          }
        );
      });
    }
  });


  server.route({
    method: 'DELETE',
    path: '/{id}/superadmin',
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
      OzLoadFuncs.parseAuthorizationHeader(request.headers.authorization, function (err, ticket) {

        if (err) {
          console.error(err);
          return reply(GigyaUtils.errorToResponse(err));
        }

        if (ticket.user === request.params.id){
          return reply(Boom.badRequest('You cannot demote yourself'));
        }

        // TODO: Move code to user.js
        MongoDB.collection('grants').update(
          {
            app: ticket.app,
            user: request.params.id
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
            reply();

          }
        );
      });
    }
  });



  next();

};


module.exports.register.attributes = {
  name: 'users',
  version: '1.0.0'
};
