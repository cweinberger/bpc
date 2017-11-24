/* jshint node: true */
'use strict';

const Oz = require('oz');
const Boom = require('boom');
const Joi = require('joi');
const MongoDB = require('./../mongo/mongodb_client');

const ENCRYPTIONPASSWORD = process.env.ENCRYPTIONPASSWORD;

const corsRules = {
  credentials: true,
  origin: ['*'],
  // access-control-allow-methods: POST
  headers: ['Accept', 'Authorization', 'Content-Type', 'If-None-Match'],
  exposedHeaders: ['WWW-Authenticate', 'Server-Authorization'],
  maxAge: 86400
};


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
        query: {
          app: Joi.string().required()
        }
      }
    },
    handler: createAnonymousRsvp
  });

  server.route({
    method: 'POST',
    path: '/',
    config: {
      auth: false,
      cors: corsRules,
      state: {
        parse: true, // parse and store in request.state
        failAction: 'error' // may also be 'ignore' or 'log'
      },
      validate: {
        payload: {
          app: Joi.string().required()
        }
      }
    },
    handler: createAnonymousRsvp
  });

  next();
};


module.exports.register.attributes = {
  name: 'anonymous',
  version: '1.0.0'
};


function createAnonymousRsvp(request, reply) {
  let data = Object.assign({}, request.query, request.payload, request.state);

  if (!data.auid || !validUUID(data.auid.replace('auid::', ''))) {
    data.auid = 'auid::' + generateUUID();
    // Setting the cookie
    reply.state('auid', data.auid);
  }

  return findApplication({ app: data.app })
  .then(app => {

    app.scope = ['anonymous'];

    // Dynamic grant. Will not be stored anywhere.
    // But can be parsed in loadGrantFunc using the id.
    let grant = {
      app: app.id,
      user: data.auid,
      exp: null,
      scope: ['anonymous']
    };

    grant.exp = Oz.hawk.utils.now() + (60000 * 60 * 24 * 350);

    grant.id = 'agid::' + new Buffer(JSON.stringify(grant)).toString('base64');

    Oz.ticket.issue(app, grant, ENCRYPTIONPASSWORD, {}, (err, ticket) => {
      if (err) {
        console.error(err);
        return reply(err);
      } else {
        return reply(ticket);
      }
    });
  }).
  catch(err => {
    reply(err);
  });
}


function findApplication({app}) {
  return MongoDB.collection('applications')
  .findOne(
    { id: app },
    { fields: { _id: 0 } })
  .then (app => {
    if (app === null){
      return Promise.reject(Boom.unauthorized('Unknown application'));
    } else if (app.settings && app.settings.disallowGrants){
      return Promise.reject(Boom.unauthorized('App disallow users'));
    } else if (app.settings && !app.settings.allowAnonymousUsers){
      return Promise.reject(Boom.unauthorized('Anonymous tickets not allowed for application'));
    } else {
      return Promise.resolve(app);
    }
  });
}


function generateUUID () {
  var d = Date.now();
  if (typeof performance !== 'undefined' && typeof performance.now === 'function'){
      d += performance.now(); //use high-precision timer if available
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (d + Math.random() * 16) % 16 | 0;
      d = Math.floor(d / 16);
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}


function validUUID(input) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input);
}
