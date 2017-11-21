/*jshint node: true */
'use strict';

const Oz = require('oz');
const Boom = require('boom');
const Crypto = require('crypto');
const MongoDB = require('./../mongo/mongodb_client');
const Applications = require('./../applications/applications');
const Gigya = require('./../gigya/gigya_client');
const Google = require('./../google/google_client');
const OzLoadFuncs = require('./../oz_loadfuncs');

const ENCRYPTIONPASSWORD = process.env.ENCRYPTIONPASSWORD;


module.exports = {
  create: function (data, reply) {
    if (data.provider === 'gigya') {
      // return createGigyaRsvp(data).then(callback);
      return createGigyaRsvp(data);
    } else if (data.provider === 'google') {
      return createGoogleRsvp(data);
    } else if (data.provider === 'anonymous') {
      // return Promise.reject(Boom.notImplemented('anonymous provider not implemented'));
      return createAnonymousRsvp(data, reply);
    } else {
      return Promise.reject(Boom.badRequest('Unsupported provider'));
    }
  }
};


// Here we are creating the user->app rsvp.


function createGigyaRsvp(data) {
  // 1. first find the app.
  // 2. Check if the app allows for dynamic creating of grants
  // 3. Check if the app uses Gigya accounts or perhaps pre-defined users
  //    (e.g. server-to-server auth keys)
  // Vefify the user is created in Gigya

  let exchangeUIDSignatureParams = {
    UID: data.UID,
    UIDSignature: data.UIDSignature,
    signatureTimestamp: data.signatureTimestamp
  };

  return Gigya.callApi('/accounts.exchangeUIDSignature', exchangeUIDSignatureParams)
  .then(result => Gigya.callApi('/accounts.getAccountInfo', { UID: data.UID }))
  .then(result => {
    return Promise.all([
      findApplication({ app: data.app, provider: data.provider }),
      findGrant({ user: result.body.profile.email, app: data.app })
    ])
    .then(results => createRsvp(results[0], results[1], result.body.profile.email));
  });
}


function createGoogleRsvp(data) {
  // Verify the user with Google.
  return Google.tokeninfo(data)
  .then(result => {
    return Promise.all([
      findApplication({ app: data.app, provider: data.provider }),
      findGrant({ user: result.email, app: data.app })
    ])
    .then(results => createRsvp(results[0], results[1], result.email));
  });
}


function createAnonymousRsvp(data, reply) {

  if (!data.auid || !validUUID(data.auid.replace('auid::', ''))) {
    data.auid = 'auid::' + generateUUID();
    // Setting the cookie
    if (reply && reply.state) { // Because of testing
      reply.state('auid', data.auid)
    }
  }

  return findApplication({ app: data.app, provider: data.provider })
  .then(app => {

    // Dynamic grant. Will not be stored anywhere.
    // But can be parsed in loadGrantFunc using the id.
    let grant = {
      app: app.id,
      user: data.auid,
      exp: null,
      scope: []
    };

    grant.id = 'agid::' + new Buffer(JSON.stringify(grant)).toString('base64');

    return new Promise((resolve, reject) => {
      Oz.ticket.rsvp(app, grant, ENCRYPTIONPASSWORD, {}, (err, rsvp) => {
        if (err) {
          console.error(err);
          return reject(err);
        } else {
          return resolve(rsvp);
        }
      });
    });
  });
}


function findApplication({app, provider}) {
  return MongoDB.collection('applications')
  .findOne(
    { id: app },
    { fields: { _id: 0 } })
  .then (app => {
    if (app === null){
      return Promise.reject(Boom.unauthorized('Unknown application'));
    } else if (app.settings && app.settings.disallowGrants){
      return Promise.reject(Boom.unauthorized('App disallow users'));
    } else if (app.settings && app.settings.provider && app.settings.provider !== provider){
      return Promise.reject(Boom.unauthorized('Invalid provider for application'));
    } else {
      return Promise.resolve(app);
    }
  });
}


function findGrant({user, app}) {
  return MongoDB.collection('grants')
  .findOne(
    { user: user, app: app },
    { fields: { _id: 0 } }
  )
  .then(grant => {
    if (OzLoadFuncs.grantIsExpired(grant)) {
      return Promise.reject(Boom.forbidden('Grant expired'));
    } else {
      return Promise.resolve(grant);
    }
  });
}


function createRsvp(app, grant, user){
  const noGrant = grant === undefined || grant === null;
  if (noGrant &&
      app.settings &&
      app.settings.disallowAutoCreationGrants) {
      // The setting disallowAutoCreationGrants makes sure that no grants
      // are created automatically.

    return Promise.reject(Boom.forbidden());

  } else if (noGrant && !user) {

    return Promise.reject(Boom.forbidden());

  } else if (noGrant) {

    // Creating new clean grant
    grant = {
      app: app.id,
      user: user,
      scope: []
    };

    // Generates the grant.id and saves the grant
    Applications.createAppGrant(grant);

  }

  return new Promise((resolve, reject) => {
    // Generating the RSVP based on the grant
    Oz.ticket.rsvp(app, grant, ENCRYPTIONPASSWORD, {}, (err, rsvp) => {
      if (err) {
        console.error(err);
        return reject(err);
      } else {
        // After granting app access, the user returns to the app with the rsvp.
        return resolve(rsvp);
      }
    });
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
