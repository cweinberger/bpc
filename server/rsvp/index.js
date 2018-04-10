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
  provider: Joi.strip(),
  UID: Joi.string(),
  UIDSignature: Joi.string(),
  signatureTimestamp: Joi.string(),
  ID: Joi.string(),
  id_token: Joi.string(),
  access_token: Joi.string(),
  email: Joi.strip(),
  app: Joi.string().required(),
  returnUrl: Joi.string().uri().optional()
})
.xor('UID', 'ID')
.with('UID', ['UIDSignature', 'signatureTimestamp'])
.with('ID', ['id_token', 'access_token']);


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
      Rsvp.create(request.query)
      .then(result => {
        // After granting app access, the user returns to the app with the rsvp.
        // TODO: the returnUrl must be a setting on the App, and not part of the URL.
        //   And the reponse must always be a redirect on a GET /rsvp
        if (request.query.returnUrl) {
          reply.redirect(request.query.returnUrl.concat('?rsvp=', rsvp)).header('X-RSVP-TOKEN', result.rsvp);
        } else {
          reply(result).header('X-RSVP-TOKEN', result.rsvp);
        }
      })
      .catch(err => reply(err));
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
      Rsvp.create(request.payload)
      .then(result => reply(result).header('X-RSVP-TOKEN', result.rsvp))
      .catch(err => reply(err));
    }
  });

  next();
};


module.exports.register.attributes = {
  name: 'rsvp',
  version: '1.0.0'
};
