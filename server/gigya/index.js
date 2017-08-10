/*jshint node: true */
'use strict';


const Joi = require('joi');
const Boom = require('boom');
const Gigya = require('./../gigya/gigya_client');
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
      return Gigya.callApi('/accounts.isAvailableLoginID', {loginID: request.query.email})
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
            // accountCreated:
              // Account created - fired when a new account record is actually created in Gigya's database.
            // accountRegistered:
              // Account registered - fired when a user completes registration.
            // accountUpdated:
              // Account updated - fired when a user record is updated.
            // accountLoggedIn:
              // Account logged in - fired when a user logs in.
            // accountDeleted:
              // Account deleted - fired when an account is deleted.

            // case "accountCreated":
            //   accountCreatedEventHandler(event, reply);
            //   break;
            case "accountRegistered":
              accountRegisteredEventHandler(event, reply);
              break;
            // case "accountUpdated":
            //   accountUpdatedEventHandler(event, reply);
            //   break;
            // case "accountLoggedIn":
            //   accountLoggedInEventHandler(event, reply);
            //   break;
            case "accountDeleted":
              accountDeletedEventHandler(event, reply);
              break;
            default:
              reply();

          }
        });

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


function accountCreatedEventHandler(event, callback){
  console.log('accountCreatedEventHandler', event.data.uid);
  // Do nothing
  callback();
}


function accountRegisteredEventHandler(event, callback){
  console.log('accountRegisteredEventHandler', event.data.uid);
  Gigya.callApi('/accounts.getAccountInfo', { UID: event.data.uid }).then(result => {

    Users.updateUserInDB({ id: event.data.uid, email: result.body.profile.email.toLowerCase(), provider: 'gigya' }, (err) => {
      if (err) {
        callback(Boom.badRequest());
      } else {
        callback();
      }
    });

  }, err => {
    console.error(err);
    callback(Boom.badRequest());
  });
}


function accountUpdatedEventHandler(event, callback){
  console.log('accountUpdatedEventHandler', event.data.uid);
  // Do nothing
  callback();
}


function accountLoggedInEventHandler(event, callback){
  console.log('accountLoggedInEventHandler', event.data.uid);
  // Do nothing
  callback();
}


function accountDeletedEventHandler(event, callback){
  console.log('accountDeletedEventHandler', event.data.uid);
  Users.deleteUserId(event.data.uid);
  callback();
}
