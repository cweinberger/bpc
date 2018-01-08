/*jshint node: true */
'use strict';


const Boom = require('boom');
const Joi = require('joi');
const Oz = require('oz');
const OzLoadFuncs = require('./../oz_loadfuncs');
const crypto = require('crypto');
const MongoDB = require('./../mongo/mongodb_client');
const Gigya = require('./../gigya/gigya_client');
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
          id: Joi.string(),
          email: Joi.string()
        }).unknown(false).or('id', 'email')
      }
    },
    handler: function(request, reply) {
      var query = {
        $or: [
          { id: request.query.id },
          { email: request.query.email.toLowerCase() }
        ]
      };

      MongoDB.collection('users').find(query)
        .toArray(reply);
    }
  });



  server.route({
    method: 'POST',
    path: '/',
    config: {
      auth:  {
        access: {
          scope: ['admin', 'users'],
          entity: 'any'
        }
      },
      cors: stdCors,
      validate: {
        payload: Joi.object().keys({
          email: Joi.string().required()
        }).unknown(false)
      }
    },
    handler: function(request, reply) {
      reply(Boom.notImplemented());
    }
  });


  /**
   * GET /users/search
   *
   * Query parameters:
   * - query=<Gigya SQL-style query> eg.;
   *   SELECT * FROM accounts WHERE profile.email = "mkoc@berlingskemedia.dk"
   */
   // TODO: this endpoint is temporary.
   // Going forward the Gigya API should be used directly.
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
      .then(res => reply(res.body))
      .catch(err => reply(err));
    }
  });


  /**
   * GET /users/exists
   *
   * Query parameters:
   * - email=email to check
   */
   // TODO: this endpoint is temporary.
   // Going forward the Gigya API should be used directly.
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
      .then(res => reply(res.body))
      .catch(err => reply(err));
    }
  });


  // TODO: this endpoint is temporary.
  // Going forward the Gigya API should be used directly.
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
          email: Joi.string().email().required(),
          password: Joi.string().required(),
          data: Joi.object().optional(),
          profile: Joi.object().optional(),
          regSource: Joi.string().optional()
        }
      }
    },
    handler: (request, reply) => {

      let user = request.payload;
      // Lowercase the email.
      user.email = user.email.toLowerCase();

      register(user)
      .then(data => reply(data.body ? data.body : data))
      .catch(err => {
        if (err.code === 400009 && Array.isArray(err.details) &&
            err.details.length && err.details[0].errorCode === 400003) {
          // Reply with a conflict if the email address exists.
          return reply(Boom.conflict(
            `[${err.details[0].errorCode}] ${err.details[0].message}`
          ));
        } else {
          return reply(err);
        }
      });


      function register(user) {

        if (!user) {
          return Promise.reject(Boom.badRequest('"user" is required'));
        }

        return Gigya.callApi('/accounts.initRegistration')
        .then(initRes => {
          if (!initRes.body && !initRes.body.regToken) {
            return Promise.reject(Boom.badRequest('"regToken" is required'));
          }

          const _body = Object.assign({}, user, {
            finalizeRegistration: true,
            include: 'profile,data',
            format: 'json',
            regToken: initRes.body.regToken
          });

          return Gigya.callApi('/accounts.register', _body)
          .then(data => {
            EventLog.logUserEvent(data.body.UID, 'User registered');
            return Promise.resolve(data);
          })
          .catch(err => {
            EventLog.logUserEvent(null, 'User registration failed', {email: user.email});
            return Promise.reject(err);
          });

        });
      }

    }
  });


  // TODO: this endpoint is temporary.
  // Going forward the Gigya API should be used directly.
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
          email: Joi.string().email().required(),
          data: Joi.object().optional(),
          profile: Joi.object().optional()
        }
      }
    },
    handler: (request, reply) => {

      let user = request.payload;
      console.log('user', user);
      const userQuery = {
        query: 'select UID from accounts where loginIDs.emails = "' + user.email + '" '
      };
      console.log('userQuery', userQuery);

      Gigya.callApi('/accounts.search', userQuery).then(data => {
        console.log('data', data.body);
        if (data.body.results === undefined || data.body.results.length === 0) {
          EventLog.logUserEvent(null, 'User not found', {email: user.email});
          return reply(Boom.notFound("User " + user.email + " not found"));
        }

        delete user.email;
        user.uid = data.body.results[0].UID;

        Gigya.callApi('/accounts.setAccountInfo', user)
        .then(data => reply(data.body ? data.body : {status: 'ok'}))
        .catch(err => {
          EventLog.logUserEvent(null, 'User update failed', {email: user.email});
          return reply(err);
        });
      }).catch(err => {
        console.error('err', err);
        reply(err);
      });
    }
  });


  // TODO: this endpoint is temporary.
  // Going forward the Gigya API should be used directly.
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
      })
      .then(response =>
        Gigya.callApi('/accounts.resetPassword', {
          passwordResetToken: response.body.passwordResetToken,
          newPassword: newPassword,
          sendEmail: false
        })
      )
      .then(() => reply({'status': 'ok'}))
      .catch(err => reply(err));
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
          return reply(Boom.wrap(err));
        }

        if (ticket.user === request.params.id){
          return reply(Boom.badRequest('You cannot delete yourself'));
        }

        MongoDB.collection('users').remove({ id: request.params.id })
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


  next();

};


module.exports.register.attributes = {
  name: 'users',
  version: '1.0.0'
};
