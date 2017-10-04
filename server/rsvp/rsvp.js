/*jshint node: true */
'use strict';

const Oz = require('oz');
const Boom = require('boom');
const crypto = require('crypto');
const MongoDB = require('./../mongo/mongodb_client');
const Users = require('./../users/users');
const Gigya = require('./../gigya/gigya_client');
const Google = require('./../google/google_client');

const ENCRYPTIONPASSWORD = process.env.ENCRYPTIONPASSWORD;


module.exports = {
  create: function (data, callback) {
    if (data.provider === 'gigya') {
      // return createGigyaRsvp(data).then(callback);
      return createGigyaRsvp(data)
      .then((response) => {
        callback(null, response);
      })
      .catch(err => callback(err));
    } else if (data.provider === 'google') {
      return createGoogleRsvp(data, callback);
    } else {
      return callback(new Error('Unsupported provider'));
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

  var exchangeUIDSignatureParams = {
    UID: data.UID,
    UIDSignature: data.UIDSignature,
    signatureTimestamp: data.signatureTimestamp
  };

  return Gigya.callApi('/accounts.exchangeUIDSignature', exchangeUIDSignatureParams)
  .then(result => Gigya.callApi('/accounts.getAccountInfo', { UID: data.UID }))
  .then(result => {
    if (data.email !== result.body.profile.email) {
      return Promise.reject(Boom.badRequest('Invalid email'));
    }

    Users.upsertUserId({ id: data.UID, email: result.body.profile.email.toLowerCase(), provider: data.provider });

    return findGrant({ user: data.email, app: data.app, provider: data.provider });

  });
}


function createGoogleRsvp(data, callback) {

  // Verify the user with Google.
  return Google.tokeninfo(data, (err, result) => {
    if (err) {
      return callback(err);
    } else if (data.email !== result.email) {
      return callback(Boom.badRequest());
    } else {

      Users.upsertUserId({ id: data.ID, email: result.email.toLowerCase(), provider: data.provider });

      return findGrant({ user: data.email, app: data.app, provider: data.provider }, callback);

    }
  });

}


function findGrant(input, callback) {

  return new Promise((resolve, reject) => {

    if (callback === undefined){
      callback = function(err, result){
        if(err) {
          reject(err);
        } else {
          resolve(result);
        }
      };
    }

    MongoDB.collection('applications').findOne(
      { id: input.app },
      { fields: { _id: 0 } },
      (err, app) => {
        if (err) {
          console.error(err);
          return callback(Boom.unauthorized(err.message));
        } else if (app === null){
          return callback(Boom.unauthorized('Unknown application'));
        } else if (app.settings && app.settings.provider && app.settings.provider !== input.provider){
          return callback(Boom.unauthorized('Invalid provider'));
        }

        // We only looking for any grants between user and app.
        // We only insert a new one if none is found, the app allows it creation of now blank grants.
        // If the existing grant is expired, the user should be denied access.
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

  });

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
    exp : null
  };

  MongoDB.collection('grants').insertOne(grant);

  return grant;
}
