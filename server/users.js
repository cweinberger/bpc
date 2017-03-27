/*jshint node: true */
'use strict';


const Boom = require('boom');
const Joi = require('joi');
const Oz = require('oz');
const OzLoadFuncs = require('./oz_loadfuncs');
const crypto = require('crypto');
const MongoDB = require('./mongo/mongodb_client');
const Accounts = require('./accounts/accounts');
const GigyaAccounts = require('./gigya/gigya_accounts');
const GigyaUtils = require('./gigya/gigya_utils');


// Note: this is almost the same as in rsvp.js/rsvpValidation
// This could be programmed better.
const userValidation = Joi.object().keys({
  UID: Joi.string().required(),
  ID: Joi.string().required(),
  email: Joi.string().email().required()
});


const registrationValidation = Joi.object().keys({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
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
      auth:  {
        access: {
          scope: ['admin'],
          entity: 'user'
        }
      },
      cors: stdCors
    },
    handler: function(request, reply) {
      MongoDB.collection('users').find().toArray(reply);
    }
  });


  server.route({
    method: 'GET',
    path: '/schema',
    config: {
      auth:  {
        access: {
          scope: ['admin'],
          entity: 'user'
        }
      },
      cors: stdCors
    },
    handler: function(request, reply) {
      GigyaAccounts.getAccountSchema().then(
        res => reply(res.body),
        err => reply(GigyaUtils.errorToResponse(err))
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
      auth:  {
        access: {
          scope: ['admin'],
          entity: 'user'
        }
      },
      cors: stdCors
    },
    handler: (request, reply) => {
      return GigyaAccounts.searchAccount(request.query.query)
        .then(res => reply(res.body), err => reply(GigyaUtils.errorToResponse(err)));
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
      auth:  {
        access: {
          scope: ['admin'],
          entity: 'user'
        }
      },
      cors: stdCors
    },
    handler: (request, reply) => {
      return GigyaAccounts.isEmailAvailable(request.query.email)
        .then(res => reply(res.body), err => reply(GigyaUtils.errorToResponse(err)));
    }
  });


  server.route({
    method: 'DELETE',
    path: '/{id}',
    config: {
      auth:  {
        access: {
          scope: ['admin'],
          entity: 'user'
        }
      },
      auth: false,
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
            return reply(GigyaUtils.errorToResponse(err));
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
          scope: ['admin'],
          entity: 'user'
        }
      },
      cors: stdCors,
      validate: {
        payload: registrationValidation
      }
    },
    handler: (request, reply) => {

      const user = request.payload;
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
            return reply(GigyaUtils.errorToResponse(err, err.validationErrors));
          }
        }
      );

    }
  });


  server.route({
    method: 'POST',
    path: '/',
    config: {
      auth:  {
        access: {
          scope: ['admin'],
          entity: 'user'
        }
      },
      cors: stdCors,
      validate: {
        payload: userValidation
      }
    },
    handler: function(request, reply) {

      var user = {
        email: request.payload.email,
        provider: 'gigya',
        id: request.payload.UID
      };

      MongoDB.collection('users').updateOne(
        user,
        {
          $setOnInsert: {
            dataScopes: {},
            LastLogin: null
          }
        },
        {
          upsert: true
          //  writeConcern: <document>, // Perhaps using writeConcerns would be good here. See https://docs.mongodb.com/manual/reference/write-concern/
          //  collation: <document>
        },
        reply
      );
    }
  });


  server.route({
    method: 'GET',
    path: '/{id}',
    config: {
      auth:  {
        access: {
          scope: ['admin'],
          entity: 'user'
        }
      },
      cors: stdCors
    },
    handler: function(request, reply) {
      MongoDB.collection('users').aggregate(
        [
          {
            $match:
            {
              id: request.params.id
            }
          },
          {
            $lookup:
            {
              from: 'grants',
              localField: 'id',
              foreignField: 'user',
              as: 'grants'
            }
          }
        ],
        function(err, result){
          if(err){
            return reply(err);
          } else if (result === null || result.length !== 1){
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
          entity: 'user'
        }
      },
      cors: stdCors
    },
    handler: function(request, reply) {
      OzLoadFuncs.parseAuthorizationHeader(request.headers.authorization, function(err, ticket){
        MongoDB.collection('grants').update(
          {
            app: ticket.app,
            user: request.params.id
          },
          {
            $addToSet: { scope: 'admin:*' }
          },
          function(err, result){
            if(err){
              return reply(err);
            }

            reply();
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
          entity: 'user'
        }
      },
      cors: stdCors
    },
    handler: function(request, reply) {
      OzLoadFuncs.parseAuthorizationHeader(request.headers.authorization, function(err, ticket){

        if (ticket.user === request.params.id){
          return reply(Boom.badRequest('You cannot demote yourself'));
        }

        MongoDB.collection('grants').update(
          {
            app: ticket.app,
            user: request.params.id
          },
          {
            $pull: { scope: 'admin:*' }
          },
          function(err, result){
            if(err){
              return reply(err);
            }

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
