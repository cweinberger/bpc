/*jshint node: true */
'use strict';

const Oz = require('oz');
const Boom = require('boom');
const crypto = require('crypto');
const MongoDB = require('./../mongo/mongodb_client');
const GigyaAccounts = require('./../gigya/gigya_accounts');
const Google = require('./../google/google_client');

const ENCRYPTIONPASSWORD = process.env.ENCRYPTIONPASSWORD;


module.exports = {
  createUserRsvp
};


// Here we are creating the user->app rsvp.
function createUserRsvp(data, callback) {

  if (data.provider === 'gigya') {
    return createGigyaRsvp(data, callback);
  } else if (data.provider === 'google') {
    return createGoogleRsvp(data, callback);
  } else {
    return callback(new Error('Unsupported provider'));
  }

}


function createGigyaRsvp(data, callback) {
  // 1. first find the app.
  // 2. Check if the app allows for dynamic creating of grants
  // 3. Check if the app uses Gigya accounts or perhaps pre-defined users
  //    (e.g. server-to-server auth keys)
  // Vefify the user is created in Gigya
  
  // TODO: Also verify using exchangeUIDSignature
  //   (UIDSignature + signatureTimestamp).
  //   Use accounts.exchangeUIDSignature
  //   See https://developers.gigya.com/display/GD/accounts.exchangeUIDSignature+REST
  GigyaAccounts.getAccountInfo({ UID: data.UID }).then(result => {

    if (data.email !== result.body.profile.email) {
      return callback(Boom.badRequest());
    }

    updateUserInDB({ id: data.UID, email: result.body.profile.email.toLowerCase(), provider: data.provider });

    findGrant({ user: data.UID, app: data.app, provider: data.provider }, callback);

  }, err => callback(err));

}


function createGoogleRsvp(data, callback) {

  // Verify the user with Google.
  Google.tokeninfo(data, (err, result) => {
    if (err) {
      return callback(err);
    } else if (data.email !== result.email) {
      return callback(Boom.badRequest());
    } else {

      updateUserInDB({ id: data.ID, email: result.email, provider: data.provider });

      findGrant({ user: data.ID, app: data.app, provider: data.provider }, callback);

    }
  });

}


function findGrant(input, callback) {

  MongoDB.collection('applications').findOne(
    { id: input.app },
    { fields: { _id: 0 } },
    (err, app) => {
      if (err) {
        console.error(err);
        return callback(Boom.unauthorized(err.message));
      } else if (app === null){
        return callback(Boom.unauthorized('Unknown application'));
      } else if (app.settings && app.settings.provider !== input.provider){
        return callback(Boom.unauthorized('Invalid provider'));
      }

    // We only looking for grants that have not expired
    // TODO: Actually, I think we drop the exp_conditions. Instead find any
    // grant and only insert a new one, the the old is not expired.
    // If the old grant is expired, the user should be denied access.
    MongoDB.collection('grants').findOne(
      { user: input.user, app: input.app },
      { fields: { _id: 0 } },
      (err, grant) => {

      if (err) {

        console.error(err);
        return callback(Boom.unauthorized(err.message));

        // The setting disallowAutoCreationGrants makes sure that no grants
        // are created automatically.
      } else if (grant === null &&
          (app.disallowAutoCreationGrants ||
          (app.settings && app.settings.disallowAutoCreationGrants))) {

        return callback(Boom.forbidden());

      } else if (grantIsExpired(grant)) {

        return callback(Boom.forbidden());

      } else if (grant === null ) {

        // Creating new clean grant
        grant = createNewCleanGrant(input.app, input.user);
      }

      // This exp is only the expiration of the rsvp - not the expiration of
      // the grant/ticket.
      if (grant.exp === undefined || grant.exp === null) {
        grant.exp = Oz.hawk.utils.now() + (60000 * 60); // 60000 = 1 minute
      }

      // Generating the RSVP based on the grant
      Oz.ticket.rsvp(app, grant, ENCRYPTIONPASSWORD, {}, (err, rsvp) => {
        if (err) {
          console.error(err);
          return callback(err);
        }
        // After granting app access, the user returns to the app with the rsvp.
        return callback(null, rsvp);
      });
    });
  });
}


function errorLogger(err, result) {
  if (err) {
    console.error(err);
  }
};


function updateUserInDB(data, callback) {

  if (callback === undefined) {
    callback = errorLogger;
  }

  const query = {
    $or: [
      {
        id: data.id
      },
      {
        provider: data.provider,
        email: data.email
      }
    ]
  };

  MongoDB.collection('users').update(query, {
    $setOnInsert: {
      dataScopes: {}
    },
     // We want to update id, email and provider in case we're missing one of the parameters
    $set: data,
    $currentDate: {
      'lastLogin': { $type: "date" }
    }
  }, {
    upsert: true
  }, callback);

}


function grantIsExpired(grant) {
  return (
    grant !== undefined &&
    grant !== null &&
    grant.exp !== undefined &&
    grant.exp !== null &&
    grant.exp < Oz.hawk.utils.now()
  );
}


function createNewCleanGrant(app, user) {
  var grant = {
    id : crypto.randomBytes(20).toString('hex'), // (gives 40 characters)
    app : app,
    user : user,
    scope : [],
    exp : null,
    createdAt: new Date()
  };

  MongoDB.collection('grants').insertOne(grant);

  return grant;
}
