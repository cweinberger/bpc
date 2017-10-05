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
  provider: Joi.string().valid('gigya', 'google').default('gigya'),
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
  email: Joi.string().email().required(),
  app: Joi.string().required(),
  returnUrl: Joi.string().uri().optional()
});


module.exports.register = function (server, options, next) {

  server.route({
    method: 'GET',
    path: '/',
    config: {
      auth: false,
      cors: corsRules,
      validate: {
        query: rsvpValidation
      }
    },
    handler: function (request, reply) {
      Rsvp.create(request.query, (err, rsvp) => {
        if (err) {
          if(err.statusCode >= 500) {
            // We want to hide the error from the end user.
            // Boom.badImplementation() logs the error
            return reply(Boom.badImplementation())
          } else {
            return reply(Boom.wrap(err, err.statusCode));
          }
        }
        // After granting app access, the user returns to the app with the rsvp.
        if (request.query.returnUrl) {
          reply.redirect(request.query.returnUrl.concat('?rsvp=', rsvp));
        } else {
          reply(rsvp).header('X-RSVP-TOKEN', rsvp);
        }
      });
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
      Rsvp.create(request.payload, (err, rsvp) => {
        if (err){
          if(err.statusCode >= 500) {
            // We want to hide the error from the end user.
            // Boom.badImplementation() logs the error
            return reply(Boom.badImplementation())
          } else {
            return reply(Boom.wrap(err, err.statusCode));
          }
        }
        // After granting app access, the user returns to the app with the rsvp
        reply(rsvp).header('X-RSVP-TOKEN', rsvp);
      });
    }
  });

  next();
};


module.exports.register.attributes = {
  name: 'rsvp',
  version: '1.0.0'
};
