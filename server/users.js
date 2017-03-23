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
      auth:  false,
      cors: stdCors
    },
    handler: function(request, reply) {
      GigyaAccounts.getAccountSchema().then(
        res => reply(res.body),
        err => reply(GigyaUtils.toError(err))
      );
    }
  });


  /**
   * GET /users/search
   * 
   * Query parameter:
   * - query=<Gigya SQL-style query> eg.;
   *   SELECT * FROM accounts WHERE profile.email = "mkoc@berlingskemedia.dk"
   */
  server.route({
    method: 'GET',
    path: '/search',
    config: {
      auth:  false,
      cors: stdCors
    },
    handler: (request, reply) => {
      return GigyaAccounts.searchAccount(request.query.query)
        .then(res => reply(res.body), err => reply(GigyaUtils.toError(err)));
    }
  });


  server.route({
    method: 'GET',
    path: '/exists',
    config: {
      auth:  false,
      cors: stdCors
    },
    handler: (request, reply) => {
      return GigyaAccounts.isEmailAvailable(request.query.email)
        .then(res => reply(res.body), err => reply(GigyaUtils.toError(err)));
    }
  });


  server.route({
    method: 'DELETE',
    path: '/{id}',
    config: {
      auth:  false,
      cors: stdCors
    },
    handler: (request, reply) => {
      return GigyaAccounts.deleteAccount(request.params.id) .then(
        res => reply(GigyaUtils.isError(res) ? GigyaUtils.toError(res) : res),
        err => reply(GigyaUtils.toError(err))
      );
    }
  });


  server.route({
    method: 'POST',
    path: '/register',
    config: {
      auth: false,
      cors: stdCors,
      validate: {
        payload: registrationValidation
      }
    },
    handler: (request, reply) => {

      const user = request.payload;
      Accounts.register(user).then(
        data => {
          if (GigyaUtils.isError(data.body)) {
            if (data.body.errorCode === 400003) {
              // Email exists.
              return reply({message: data.body.errorMessage}).status(409);
            } else {
              return reply(GigyaUtils.toError(data.body));
            }
          } else {
            return reply(data.body ? data.body : data);
          }
        },
        err => {
          console.log(err);
          return reply(GigyaUtils.toError(err, err.validationErrors));
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
