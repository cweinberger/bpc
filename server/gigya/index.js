/*jshint node: true */
'use strict';


const Joi = require('joi');
const Boom = require('boom');
const GigyaAccounts = require('./../gigya/gigya_accounts');
const GigyaUtils = require('./../gigya/gigya_utils');
const Users = require('./../users/users');
const exposeError = GigyaUtils.exposeError;



module.exports.register = function (server, options, next) {

  const stdCors = {
    credentials: true,
    origin: ['*'],
    headers: ['Accept', 'Authorization', 'Content-Type', 'If-None-Match'],
    exposedHeaders: ['WWW-Authenticate', 'Server-Authorization'],
    maxAge: 86400
  };


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
      cors: stdCors,
      validate: {
        query: Joi.object().keys({
          email: Joi.string().email()
        }).unknown(false)
      }
    },
    handler: (request, reply) => {
      return GigyaAccounts.isEmailAvailable(request.query.email)
        .then(res => reply(res.body), err => exposeError(reply, err));
    }
  });


  server.route({
    method: 'POST',
    path: '/notifications',
    config: {
      auth: false
    },
    handler: (request, reply) => {
      if (GigyaUtils.validNotificationRequest(request)){

        request.payload.events.forEach(event => {
          switch (event.type) {
            // Types of events:
            // accountCreated
            // accountRegistered
            // accountUpdated
            // accountLoggedIn
            // accountDeleted
            case "accountCreated":
              accountCreatedEventHandler(event);
              break;
            case "accountRegistered":
              accountRegisteredEventHandler(event);
              break;
            case "accountUpdated":
              accountUpdatedEventHandler(event);
              break;
            case "accountLoggedIn":
              accountLoggedInEventHandler(event);
              break;
            case "accountDeleted":
              accountDeletedEventHandler(event);
              break;
            default:

          }
        });

        reply();

      } else {

        reply(Boom.badRequest());

      }
    }
  })


  next();

};


module.exports.register.attributes = {
  name: 'gigya',
  version: '1.0.0'
};


function accountCreatedEventHandler(event){
  console.log('accountCreatedEventHandler', event.data.uid);

  GigyaAccounts.getAccountInfo({ UID: data.UID }).then(result => {

    if (data.email !== result.body.profile.email) {
      return callback(Boom.badRequest());
    }

    Users.updateUserInDB({ id: event.data.uid, email: result.body.profile.email.toLowerCase(), provider: 'gigya' });

  }, err => {
    console.error(err);
  });
}


function accountRegisteredEventHandler(event){
  console.log('accountRegisteredEventHandler', event.data.uid);
}


function accountUpdatedEventHandler(event){
  console.log('accountUpdatedEventHandler', event.data.uid);
}


function accountLoggedInEventHandler(event){
  console.log('accountLoggedInEventHandler', event.data.uid);
}


function accountDeletedEventHandler(event){
  console.log('accountDeletedEventHandler', event.data.uid);
  Users.deleteUserId({ id: event.data.uid, provider: 'gigya' });
}
