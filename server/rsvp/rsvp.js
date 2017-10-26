/*jshint node: true */
'use strict';

const Oz = require('oz');
const Boom = require('boom');
const crypto = require('crypto');
const MongoDB = require('./../mongo/mongodb_client');
const Applications = require('./../applications/applications');
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
    } else if (data.provider === 'anonymous') {
      // return Promise.reject(Boom.notImplemented('anonymous provider not implemented'));
      return createAnonymousRsvp(data);
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
    var promises = [
      findApplication({ app: data.app, provider: data.provider }),
      findGrant({ user: result.body.profile.email, app: data.app })
    ];

    return Promise.all(promises)
    .then(results => createRsvp(results[0], results[1], result.body.profile.email));
  });
}


function createGoogleRsvp(data) {
  // Verify the user with Google.
  return Google.tokeninfo(data)
  .then(result => {
    var promises = [
      findApplication({ app: data.app, provider: data.provider }),
      findGrant({ user: result.email, app: data.app })
    ];

    return Promise.all(promises)
    .then(results => createRsvp(results[0], results[1], result.email));
  });
}


function createAnonymousRsvp(data) {

  let grant = {};

  return findApplication({ app: data.app, provider: data.provider })
  .then(app => {
    var grant = {
      id: 'TEST',
      app: app.id,
      user: data.fingerprint,
      exp: null,
      scope: []
    };

    var ticket = {
      app: app.id,
      user: data.fingerprint,
      exp: Oz.hawk.utils.now() + (1000 * 60),
      scope: [],
      grant: 'FDGDF'
    };

    var options = {
      ext: {
        private: {
          test: 'test_generate'
        }
      }
    };

    return new Promise((resolve, reject) => {
      // Generating the RSVP based on the grant
      // Oz.ticket.rsvp(app, grant, ENCRYPTIONPASSWORD, {}, (err, rsvp) => {
      Oz.ticket.generate(ticket, ENCRYPTIONPASSWORD, options, (err, rsvp) => {
        if (err) {
          console.error(err);
          return reject(err);
        } else {
          // After granting app access, the user returns to the app with the rsvp.
          console.log('TICKET', rsvp);
          return resolve(rsvp.id);
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

  } else if (noGrant) {

    // Creating new clean grant
    grant = {
      app: app.id,
      user: user,
      scope: []
    };

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
