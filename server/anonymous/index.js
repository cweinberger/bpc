/* jshint node: true */
'use strict';

const Oz = require('oz');
const Boom = require('boom');
const Joi = require('joi');
const MongoDB = require('./../mongo/mongodb_client');
const OzLoadFuncs = require('./../oz_loadfuncs');

const ENCRYPTIONPASSWORD = OzLoadFuncs.strategyOptions.oz.encryptionPassword;

const corsRules = {
  credentials: true,
  origin: ['*'],
  // access-control-allow-methods: POST
  headers: ['Accept', 'Authorization', 'Content-Type', 'If-None-Match'],
  exposedHeaders: ['WWW-Authenticate', 'Server-Authorization', 'X-AUID-GENERATED'],
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
    path: '/ticket',
    config: {
      auth: false,
      cors: corsRules,
      state: {
        parse: true, // parse and store in request.state
        failAction: 'error' // may also be 'ignore' or 'log'
      },
      validate: {
        query: {
          app: Joi.string(),
          returnUrl: Joi.string().uri({scheme: ['http','https']})
        }
      }
    },
    handler: getAnonymousTicket
  });


  server.route({
    method: 'DELETE',
    path: '/ticket',
    config: {
      auth: false,
      cors: corsRules,
      state: {
        parse: false, // parse and store in request.state
        failAction: 'error' // may also be 'ignore' or 'log'
      }
    },
    handler: function(request, reply) {
      return reply().unstate('auid');
    }
  });


  server.route({
    method: 'GET',
    path: '/ticket/exists',
    config: {
      auth: false,
      cors: corsRules,
      state: {
        parse: true, // parse and store in request.state
        failAction: 'error' // may also be 'ignore' or 'log'
      }
    },
    handler: hasAnonymousUserId
  });


  server.route({
    method: 'GET',
    path: '/data',
    config: {
      auth: {
        access: {
          scope: ['anonymous'],
          entity: 'user' // <-- Important. Apps cannot request permissions with specifying what {user} to get
        }
      },
      cors: corsRules,
      state: {
        parse: true,
        failAction: 'log'
      }
    },
    handler: getAnonymousData
  });


  server.route({
    method: 'POST',
    path: '/data',
    config: {
      auth: {
        access: {
          scope: ['anonymous'],
          entity: 'user' // <-- Important. Apps cannot request permissions with specifying what {user} to get
        }
      },
      cors: corsRules,
      state: {
        parse: true,
        failAction: 'log'
      }
    },
    handler: postAnonymousData
  });


  server.route({
    method: 'PATCH',
    path: '/data',
    config: {
      auth: {
        access: {
          scope: ['anonymous'],
          entity: 'user' // <-- Important. Apps cannot request permissions with specifying what {user} to get
        }
      },
      cors: corsRules,
      state: {
        parse: true,
        failAction: 'log'
      }
    },
    handler: patchAnonymousData
  });

  next();
};


module.exports.register.attributes = {
  name: 'anonymous',
  version: '1.0.0'
};


function getAnonymousTicket(request, reply) {
  let app_id = request.query.app;
  let auid_generated = false;
  let auid = request.state.auid
    ? request.state.auid
    : request.headers['x-bpc-auid']
      ? request.headers['x-bpc-auid']
      : null;

  // console.log('host', request.info.host);
  // console.log('hostname', request.info.hostname);
  // console.log('referrer', request.info.referrer);
  // console.log('origin', request.headers.origin);
  // console.log('user-agent', request.headers['user-agent']);

  if (request.headers['user-agent']){

    const hasOrigin = request.headers.origin !== undefined;
    const hasSafari = /Safari/.test(request.headers['user-agent']);
    const hasChrome = /Chrome/.test(request.headers['user-agent']);

    // Browser is Safari and is an ajax-request
    if(hasSafari && !hasChrome && hasOrigin) {
      if(!auid){
        return reply().code(204);
      }
    }
  }

  if (!auid || !validAUID(auid)) {
    auid = 'auid**' + generateUUID();
    auid_generated = true;
    // Setting the cookie
    reply.state('auid', auid);
  }

  createAnonymousUser({auid: auid});

  // The client wants a redirect. We don't need the ticket in this case. We got the auid cookie already.
  if (request.query.returnUrl) {
    return reply
    .redirect(request.query.returnUrl)
    .header('X-AUID-GENERATED', auid_generated ? 'true' : 'false');
  }

  if (app_id) {

    findApplication(app_id)
    .then(app => {
  
      // We are fixing/preventing the scope on an anonymous ticket to be anything else than "anonymous"
      app.scope = ['anonymous'];
  
      // Dynamic grant. Will not be stored anywhere.
      // But can be parsed in loadGrantFunc using the id.
      let grant = {
        app: app.id,
        user: auid,
        exp: null,
        scope: ['anonymous']
      };
  
      const oneHour = 1000 * 60 * 60;
      const oneYear = oneHour * 24 * 354;
      grant.exp = Oz.hawk.utils.now() + oneHour;
      // grant.exp = Oz.hawk.utils.now() + oneYear;
  
      grant.id = 'agid**' + new Buffer(JSON.stringify(grant)).toString('base64');
  
      Oz.ticket.issue(app, grant, ENCRYPTIONPASSWORD, {}, (err, ticket) => {
        if (err) {
          console.error(err);
          return reply(err);
        } else {
          return reply(ticket)
          .header('X-AUID-GENERATED', auid_generated ? 'true' : 'false');
        }
      });
    })
    .catch(err => {
      reply(err);
    });

  } else {
    // The client has not given an app id. This means we cannot issue a ticket. But the auid cookie is still relevant.
    
    // If we have a referrer, we redirect to that.
    if (request.info.referrer) {
      return reply
      .redirect(request.info.referrer)
      .header('X-AUID-GENERATED', auid_generated ? 'true' : 'false');
    // Otherwise a simple 200 OK with the user id.
    } else {
      return reply
      .response({ user: auid })
      .header('X-AUID-GENERATED', auid_generated ? 'true' : 'false');
    }
  }
}


function findApplication(app) {
  return MongoDB.collection('applications')
  .findOne(
    { id: app },
    { fields: { _id: 0 } })
  .then (app => {
    if (app === null){
      return Promise.reject(Boom.unauthorized('Unknown application'));
    } else if (app.settings && app.settings.disallowUserTickets){
      return Promise.reject(Boom.unauthorized('App disallow user tickets'));
    } else if (app.settings && app.settings.allowAnonymousUsers){
      return Promise.resolve(app);
    } else {
      return Promise.reject(Boom.unauthorized('Anonymous tickets not allowed for application'));
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

function validAUID(input) {
  if (!input.startsWith('auid**')){
    return false;
  }
  return validUUID(input.replace('auid**', ''));
}

function validUUID(input) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input);
}


function hasAnonymousUserId(request, reply) {
  if(request.state.auid){
    reply();
  } else {
    reply().code(204);
  }
}


function createAnonymousUser({auid}){

  if(!validAUID(auid)){
    return Promise.reject();
  }

  const filter = {
    id: auid,
    provider: 'anonymous'
  };

  const update = {
    $currentDate: {
      lastLogin: { $type: "date" }
    },
    $set: {
      expiresAt: new Date(new Date().setMonth(new Date().getMonth() + 6))
    },
    $setOnInsert: {
      createdAt: new Date(),
      dataUser: {}
    }
  };

  const options = {
    upsert: true
  };

  return MongoDB.collection('users')
  .updateOne(filter, update, options);
}


function getAnonymousData(request, reply){

  const ticket = request.auth.credentials;

  const filter = {
    id: ticket.user,
    provider: 'anonymous'
  };

  const update = {
    $currentDate: {
      lastFetched: { $type: "date" }
    },
    $set: {
      expiresAt: new Date(new Date().setMonth(new Date().getMonth() + 6))
    }
  };

  const options = {
    upsert: false,
    projection: {
      _id: 0,
      'dataUser.anonymous': 1
    }
  };

  return MongoDB.collection('users')
  .findOneAndUpdate(filter, update, options)
  .then(result => {
    if (result.lastErrorObject.updatedExisting) {
      return reply(result.value.dataUser.anonymous);
    } else {
      return reply(Boom.notFound());
    }
  })
  .catch(err => reply(err));
}


function postAnonymousData(request, reply){

  const ticket = request.auth.credentials;
  const userData = request.payload;

  const filter = {
    id: ticket.user,
    provider: 'anonymous'
  };

  let set = {};

  Object.keys(userData).forEach(function(field){
    set[`dataUser.anonymous.${field}`] = userData[field];
  });

  const update = {
    $currentDate: { 'lastUpdated': { $type: "date" } },
    $set: set
  };

  const options = {
    upsert: false
  };

  return MongoDB.collection('users')
  .updateOne(filter, update, options)
  .then(result => {
    if (result.result.n === 0) {
      reply(Boom.notFound());
    } else {
      reply({'status': 'ok'});
    }
  });
}


function patchAnonymousData(request, reply){
  reply(Boom.notImplemented());
}