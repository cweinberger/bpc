/*jshint node: true */
'use strict';

const Oz = require('oz');
const Boom = require('boom');
const Joi = require('joi');
const crypto = require('crypto');
const MongoDB = require('./../mongo/mongodb_client');
const Gigya = require('./../gigya/gigya_client');
const Google = require('./../google/google_client');
const OzLoadFuncs = require('./../oz_loadfuncs');

const ENCRYPTIONPASSWORD = process.env.ENCRYPTIONPASSWORD;


module.exports = {
  create: function (data) {

    return findApplication({ id: data.app })
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
      .then(result => {
        if(app.settings && app.settings && app.settings.allowEmailMasksRsvp) {
          return validateEmailMask(result.email, app.settings.allowEmailMasksRsvp)
          .then(() => result);
        } else {
          return Promise.resolve(result);
        }
      })
      .then(result => findUser(result))
      .then(user => findGrant({ app: app, user: user }))
      .then(grant => createRsvp({ app: app, grant: grant }));
    });
  }
};




function validateGigyaSession(data) {
  const exchangeUIDSignatureSchema = Joi.object().keys({
    UID: Joi.string().required(),
    UIDSignature: Joi.string().required(),
    signatureTimestamp: Joi.string().required()
  });

  const exchangeUIDSignatureParams = {
    UID: data.UID,
    UIDSignature: data.UIDSignature,
    signatureTimestamp: data.signatureTimestamp
  };

  const validateResult = Joi.validate(exchangeUIDSignatureParams, exchangeUIDSignatureSchema);
  if (validateResult.error){
    return Promise.reject(Boom.badRequest(validateResult.error));
  }

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
  const tokeninfoSchemae = Joi.object().keys({
    ID: Joi.string().required(),
    id_token: Joi.string().required(),
    access_token: Joi.string().required()
  });

  const tokeninfoParams = {
    ID: data.ID,
    id_token: data.id_token,
    access_token: data.access_token
  };

  const validateResult = Joi.validate(tokeninfoParams, tokeninfoSchemae);
  if (validateResult.error){
    return Promise.reject(Boom.badRequest(validateResult.error));
  }

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


function findApplication({id}) {
  return MongoDB.collection('applications')
  .findOne(
    { id: id },
    { fields: { _id: 0 } })
  .then (app => {
    if (app === null){
      return Promise.reject(Boom.unauthorized('Unknown application'));
    } else if (app.settings && app.settings.disallowUserTickets){
      return Promise.reject(Boom.unauthorized('App disallow user tickets'));
    } else {
      return Promise.resolve(app);
    }
  });
}



function validateEmailMask(email, emailMask) {
  if(!(emailMask instanceof Array)) {
    return Promise.reject(Boom.unauthorized('Invalid email mask in application settings'));
  }

  const validEmail = emailMask
  .filter(mask => {
    return typeof mask === 'string';
  })
  .some(mask => {
    return email.endsWith(mask);
    // return email.indexOf(mask) > -1;
  });

  if (validEmail) {
    return Promise.resolve();
  } else {
    return Promise.reject(Boom.forbidden('Invalid email mask'));
  }
}



function findUser(user) {
  if (MongoDB.isMock) {
    const temp_user = {
      _id: crypto.randomBytes(20).toString('hex'),
      id: user.id,
      email: user.email,
      provider: user.provider,
      createdAt: new Date(),
      dataScopes: {}
    };

    MongoDB.collection('users')
    .insertOne(temp_user);

    return Promise.resolve(temp_user);
  }

  return MongoDB.collection('users')
  .findOneAndUpdate(
    { $and:
      [
        { $or:
          [
            { provider: { $eq: user.provider }},
            { provider: { $exists: false }},
            { provider: null }
          ]
        },
        { $or:
          [
            { id: user.id },
            { id: user.email },
            { 'gigya.UID': user.id },
            { 'gigya.email': user.email },
            { email: user.email }
          ]
        }
      ]
    },
    {
      $currentDate: { 'lastLogin': { $type: "date" } },
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

    return Promise.resolve(result.value);

  })
  .catch(err => {
    console.error(err);
    return Promise.reject(Boom.forbidden());
  });
}


function findGrant({app, user}) {

  // Trying to find a grant the old way - to keep compatibility
  return MongoDB.collection('grants')
  .findOne({
    app: app.id,
    $or: [
      {user: user.id},
      {user: user.email}
    ]
  })
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
      .findOne({
        app: app.id,
        user: user._id
      })
      .then(grant => {

        if(grant) {

          if (OzLoadFuncs.grantIsExpired(grant)) {
            return Promise.reject(Boom.forbidden('Grant expired'));
          } else {
            return Promise.resolve(grant);
          }

        } else {

          if (app.settings &&
            app.settings.allowAutoCreationGrants) {

              return createGrant(app, user);

          } else {
                
            return Promise.reject(Boom.forbidden());

          }
        }
      })
    }
  });
}


function createGrant(app, user) {
  // Creating new clean grant
  const newGrant = {
    id: crypto.randomBytes(20).toString('hex'),
    app: app.id,
    user: user._id,
    scope: [],
    exp: null
  };

  // Saves the grant
  MongoDB.collection('grants').insertOne(newGrant);

  // Resolve it straight away. No need to wait on the database
  return Promise.resolve(newGrant);
}


function createRsvp({app, grant}){
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
