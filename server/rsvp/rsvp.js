/*jshint node: true */
'use strict';

const Oz = require('oz');
const Boom = require('boom');
const crypto = require('crypto');
const MongoDB = require('./../mongo/mongodb_client');
const Gigya = require('./../gigya/gigya_client');
const Google = require('./../google/google_client');
const OzLoadFuncs = require('./../oz_loadfuncs');

const ENCRYPTIONPASSWORD = process.env.ENCRYPTIONPASSWORD;


module.exports = {
  create: function (data) {
    if (data.provider === 'gigya') {
      // return createGigyaRsvp(data).then(callback);
      return createGigyaRsvp(data);
    } else if (data.provider === 'google') {
      return createGoogleRsvp(data);
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

    if (!result.body.profile || !result.body.profile.email) {
      return Promise.reject(Boom.unauthorized('User has no email'));
    }

    return Promise.all([
      findApplication(data),
      // findApplication({ app: data.app, provider: data.provider }),
      // findGrant({ user: result.body.UID, app: data.app })
      findGrant({ user: result.body.profile.email.toLowerCase(), app: data.app })
      // findGrant({ $or: [ { user: result.body.UID }, { user: result.body.profile.email.toLowerCase() } ], app: data.app })
    ])
    // .then(results => createRsvp(results[0], results[1], result.body.UID));
    .then(results => createRsvp(results[0], results[1], result.body.profile.email.toLowerCase()));
  });
}


function createGoogleRsvp(data) {
  // Verify the user with Google.
  return Google.tokeninfo(data)
  .then(result => {

    if (!result.email) {
      return Promise.reject(Boom.unauthorized('User has no email'));
    }

    return Promise.all([
      findApplication(data),
      // findApplication({ app: data.app, provider: data.provider }),
      // findGrant({ user: result.user_id, app: data.app })
      findGrant({ user: result.email.toLowerCase(), app: data.app })
      // findGrant({ $or: [ { user: result.user_id }, { user: result.email.toLowerCase() } ], app: data.app })
    ])
    // .then(results => createRsvp(results[0], results[1], result.user_id));
    .then(results => createRsvp(results[0], results[1], result.email.toLowerCase()));
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


function findGrant(query) {
  return MongoDB.collection('grants')
  .findOne(
    query,
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
      id: crypto.randomBytes(20).toString('hex'),
      app: app.id,
      user: user,
      scope: [],
      exp: null
    };

    // Saves the grant
    MongoDB.collection('grants').insertOne(grant);

  }

  return new Promise((resolve, reject) => {
    // Generating the RSVP based on the grant
    Oz.ticket.rsvp(app, grant, ENCRYPTIONPASSWORD, {}, (err, rsvp) => {
      if (err) {
        console.error(err);
        return reject(err);
      } else {
        // After granting app access, the user returns to the app with the rsvp.
        return resolve({rsvp: rsvp});
      }
    });
  });
}
