/* jshint node: true */
'use strict';


const Boom = require('boom');
const Joi = require('joi');
const Rsvp = require('./rsvp');

const corsRules = {
  credentials: true,
  origin: ['*'],
  // access-control-allow-methods: POST
  headers: ['Accept', 'Authorization', 'Content-Type', 'If-None-Match'],
  exposedHeaders: ['WWW-Authenticate', 'Server-Authorization'],
  maxAge: 86400
};


const rsvpValidation = Joi.object().keys({
  provider: Joi.string().valid('gigya', 'google', 'anonymous').default('gigya'),
  UID: Joi.string().when('provider', {
    is: 'gigya', then: Joi.required(), otherwise: Joi.forbidden()
  }),
  UIDSignature: Joi.string().when('provider', {
    is: 'gigya', then: Joi.required(), otherwise: Joi.forbidden()
  }),
  signatureTimestamp: Joi.string().when('provider', {
    is: 'gigya', then: Joi.required(), otherwise: Joi.forbidden()
  }),
  ID: Joi.string().when('provider', {
    is: 'google', then: Joi.required(), otherwise: Joi.forbidden()
  }),
  id_token: Joi.string().when('provider', {
    is: 'google', then: Joi.required(), otherwise: Joi.forbidden()
  }),
  access_token: Joi.string().when('provider', {
    is: 'google', then: Joi.required(), otherwise: Joi.forbidden()
  }),
  email: Joi.strip(),
  app: Joi.string().required(),
  returnUrl: Joi.string().uri().optional()
});


module.exports.register = function (server, options, next) {

  server.state('auid', {
    path: '/',
    // domain: ".".concat(BPC_PUB_HOST ? BPC_PUB_HOST : server.info.host.concat('.local')),
    ttl: 30585600000, // 354 days
    isSecure: false,
    isSameSite: false,
    isHttpOnly: true,
    encoding: 'none',
    clearInvalid: false, // remove invalid cookies
    strictHeader: false // don't allow violations of RFC 6265
  });

  server.route({
    method: 'GET',
    path: '/',
    config: {
      auth: false,
      cors: corsRules,
      state: {
        parse: true, // parse and store in request.state
        failAction: 'error' // may also be 'ignore' or 'log'
      },
      validate: {
        query: rsvpValidation
      }
    },
    handler: function (request, reply) {

      let data = Object.assign({}, request.query, request.state);
      console.log('data', data);

      Rsvp.create(data)
      .then(rsvp => {
        // After granting app access, the user returns to the app with the rsvp.
        // TODO: the returnUrl must be a setting on the App, and not part of the URL.
        //   And the reponse must always be a redirect on a GET /rsvp
        if (request.query.returnUrl) {
          reply.redirect(request.query.returnUrl.concat('?rsvp=', rsvp))
          .state('auid', 'test_redir');
        } else {
          reply({rsvp:rsvp})
          .state('auid', 'test')
          // .unstate('auid')
          .header('X-RSVP-TOKEN', rsvp);
        }
      })
      .catch(err => reply(err));
      // .catch(err => {
      //   if(err.statusCode >= 500) {
      //     // We want to hide the error from the end user.
      //     // Boom.badImplementation() logs the error
      //     return reply(Boom.badImplementation())
      //   } else {
      //     return reply(err);
      //   }
      // });
    }
  });

  server.route({
    method: 'POST',
    path: '/',
    config: {
      auth: false,
      cors: corsRules,
      validate: {
        payload: rsvpValidation
      }
    },
    handler: function (request, reply) {
      let data = Object.assign({}, request.query, request.state);
      console.log('data', data);

      Rsvp.create(data)
      .then(rsvp => reply({rsvp:rsvp}).header('X-RSVP-TOKEN', rsvp))
      .catch(err => reply(err));
      // .catch(err => {
      //   if(err.statusCode >= 500) {
      //     // We want to hide the error from the end user.
      //     // Boom.badImplementation() logs the error
      //     return reply(Boom.badImplementation())
      //   } else {
      //     return reply(err);
      //   }
      // });
    }
  });

  next();
};


module.exports.register.attributes = {
  name: 'rsvp',
  version: '1.0.0'
};
