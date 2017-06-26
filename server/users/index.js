/*jshint node: true */
'use strict';


const Boom = require('boom');
const Joi = require('joi');
const Oz = require('oz');
const OzLoadFuncs = require('./../oz_loadfuncs');
const crypto = require('crypto');
const MongoDB = require('./../mongo/mongodb_client');
const Accounts = require('./../accounts/accounts');
const GigyaAccounts = require('./../gigya/gigya_accounts');
const GigyaUtils = require('./../gigya/gigya_utils');
const EventLog = require('./../audit/eventlog');
const exposeError = GigyaUtils.exposeError;

const registrationValidation = Joi.object().keys({
  data: Joi.object().optional(),
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  profile: Joi.object().optional(),
  regSource: Joi.string().optional()
});

const updateValidation = Joi.object().keys({
  data: Joi.object().optional(),
  email: Joi.string().email().required(),
  profile: Joi.object().optional()
});


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
          email: Joi.string(),
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
      GigyaAccounts.getAccountSchema().then(
        res => reply(res.body),
        err => exposeError(reply, err)
      );
    }
  });


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
      GigyaAccounts.setAccountSchema(request.payload).then(
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
      return GigyaAccounts.searchAccount(request.query.query)
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
      cors: stdCors
    },
    handler: (request, reply) => {
      return GigyaAccounts.isEmailAvailable(request.query.email)
        .then(res => reply(res.body), err => exposeError(reply, err));
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
      return Accounts.deleteOne(request.params.id).then(
        res => reply(GigyaUtils.isError(res) ? GigyaUtils.errorToResponse(res) : res),
        err => {
          if (err.code === 403005) {
            // Unknown id, so reply 404 Not Found.
            return reply(Boom.notFound(`[${err.code}] ${err.message}`));
          } else {
            // Everything else is Internal Server Error.
            return exposeError(reply, err);
          }
        }
      );
    }
  });


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
        payload: registrationValidation
      }
    },
    handler: (request, reply) => {

      const user = request.payload;
      // Lowercase the email.
      user.email = user.email.toLowerCase();

      Accounts.register(user).then(
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

      GigyaAccounts.resetPassword({
        loginID: request.payload.email,
        sendEmail: false
      }).then(function (response) {

        GigyaAccounts.resetPassword({
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
      OzLoadFuncs.parseAuthorizationHeader(request.headers.authorization,
          function(err, ticket) {
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

          });
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
        payload: updateValidation
      }
    },
    handler: (request, reply) => {

      const user = request.payload;
      const userQuery = {email: user.email};
      MongoDB.collection('users').findOne(userQuery, function(err, result) {
        if (err) {
          reply(Boom.internal(err.message, userQuery, err.code));
        }
        else {
          if (!result) {
            reply(Boom.notFound('User not found', userQuery))
          }
          else {
            // Replace email with the uid.
            user.uid = result.id;
            delete user.email;

            Accounts.update(user).then(
              data => reply(data.body ? data.body : data),
              err => {
                // Reply with the usual Internal Server Error otherwise.
                return reply(GigyaUtils.errorToResponse(err, err.validationErrors));
              }
            );
          }
        }
      });
    }
  });

  next();

};


module.exports.register.attributes = {
  name: 'users',
  version: '1.0.0'
};
