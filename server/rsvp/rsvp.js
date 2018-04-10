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

    return findApplication({ app: data.app })
    .then(app => {

      const provider = app.settings && app.settings.provider ? app.settings.provider : 'gigya';

      var validateSession;
      if (provider === 'gigya') {
        validateSession = validateGigyaSession(data);
      } else if (provider === 'google') {
        validateSession = validateGoogleSession(data);
      } else {
        return Promise.reject(Boom.badRequest('Unsupported provider'));
      }

      return validateSession
      .then(result => {
        result.provider = provider;
        return Promise.resolve(result);
      })
      .then(result => findUser_v2(result))
      .then(user => findGrant_v2({ app: app, user: user }))
      .then(grant => createRsvp_v2({ app: app, grant: grant }));
    });
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
      findApplication({ app: data.app, provider: data.provider }),
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
      findApplication({ app: data.app, provider: data.provider }),
      // findGrant({ user: result.user_id, app: data.app })
      findGrant({ user: result.email.toLowerCase(), app: data.app })
      // findGrant({ $or: [ { user: result.user_id }, { user: result.email.toLowerCase() } ], app: data.app })
    ])
    // .then(results => createRsvp(results[0], results[1], result.user_id));
    .then(results => createRsvp(results[0], results[1], result.email.toLowerCase()));
  });
}


function validateGigyaSession(data) {
  const exchangeUIDSignatureParams = {
    UID: data.UID,
    UIDSignature: data.UIDSignature,
    signatureTimestamp: data.signatureTimestamp
  };

  return Gigya.callApi('/accounts.exchangeUIDSignature', exchangeUIDSignatureParams)
  .then(result => Gigya.callApi('/accounts.getAccountInfo', { UID: data.UID }))
  .then(result => {
    if (!result.body.profile || !result.body.profile.email) {
      return Promise.reject(Boom.unauthorized('User has no email'));
    } else {
      return Promise.resolve({
        id: result.body.UID,
        email: result.body.profile.email.toLowerCase()
      });
    }
  });
}


function validateGoogleSession(data) {
  return Google.tokeninfo(data)
  .then(result => {
    if (!result.email) {
      return Promise.reject(Boom.unauthorized('User has no email'));
    } else {
      return Promise.resolve({
        id: result.user_id,
        email: result.email.toLowerCase()
      });
    }
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
    // } else if (app.settings && app.settings.provider && app.settings.provider !== provider){
    //   return Promise.reject(Boom.unauthorized('Invalid provider for application'));
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


function findUser_v2(user) {
  console.log('findUser_v2', user);
  return MongoDB.collection('users')
  .findOneAndUpdate(
    { provider: user.provider,
      $or:
      [
        { id: user.id },
        { id: user.email },
        { 'gigya.UID': user.id },
        { 'gigya.email': user.email },
        { email: user.email }
      ]
    },
    {
      $currentDate: { 'lastUpdated': { $type: "date" } },
      $set: {
        id: user.id,
        email: user.email,
        provider: user.provider
      },
      $setOnInsert: {
        createdAt: new Date(),
        dataScopes: {}
      }
    },
    {
      upsert: true,
      returnNewDocument: true, // MongoDB
      returnOriginal: false // Node-driver
    }
  )
  .then(result => {
    console.log('then', result);
    return Promise.resolve(result.value);

    if(result.lastErrorObject.updatedExisting) {
    } else {
      new_user._id = result.insertedId;
      return Promise.resolve(new_user);
    }

    if (!result) {

      let new_user = Object.assign(user, {
        createdAt: new Date(),
        dataScopes: {}
      });

      return MongoDB.collection('users')
      .insertOne(new_user)
      .then(result => {
        new_user._id = result.insertedId;
        return Promise.resolve(new_user);
      });
    } else {
      return Promise.resolve(result);
    }
  })
  .catch(err => {
    console.error(err);
    return Promise.reject(Boom.forbidden());
  });
}


function findGrant_v2({app, user}) {

  // Trying to find a grant the old way - to keep compatibility
  return MongoDB.collection('grants')
  .findOne(
    { app: app.id,
      $or: [ {user: user.id}, {user: user.email} ]
    }
  )
  .then(grant => {

    if (grant) {

      // Converting to new grant.user value
      grant.user = user._id;
      MongoDB.collection('grants').save(grant);

      if (OzLoadFuncs.grantIsExpired(grant)) {
        return Promise.reject(Boom.forbidden('Grant expired'));
      } else {
        return Promise.resolve(grant);
      }

    } else {

      // Trying to find a grant the new way - by using user._id

      return MongoDB.collection('grants')
      .findOne({ app: app.id, user: user._id })
      .then(grant => {

        if(grant) {
          if (OzLoadFuncs.grantIsExpired(grant)) {
            return Promise.reject(Boom.forbidden('Grant expired'));
          } else {
            return Promise.resolve(grant);
          }
        } else {

          if (app.settings &&
              app.settings.disallowAutoCreationGrants) {

            return Promise.reject(Boom.forbidden());

          } else {

            // Creating new clean grant
            grant = {
              id: crypto.randomBytes(20).toString('hex'),
              app: app.id,
              user: user._id,
              scope: [],
              exp: null
            };

            // Saves the grant
            MongoDB.collection('grants').insertOne(grant);

            return Promise.resolve(grant);
          }
        }
      })
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


function createRsvp_v2({app, grant}){
  if(!grant) {
    return Promise.reject(Boom.forbidden());
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
