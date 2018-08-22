/*jshint node: true */
'use strict';

const Oz = require('oz');
const Boom = require('boom');
const Joi = require('joi');
const crypto = require('crypto');
const MongoDB = require('./../mongo/mongodb_client');
const ObjectID = require('mongodb').ObjectID;
const Gigya = require('./../gigya/gigya_client');
const Google = require('./../google/google_client');
const OzLoadFuncs = require('./../oz_loadfuncs');

const ENCRYPTIONPASSWORD = OzLoadFuncs.strategyOptions.oz.encryptionPassword;


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

  if(emailMask.length === 0) {
    return Promise.resolve();
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
  return MongoDB.collection('users')
  .findOneAndUpdate(
    {
      $or: [
        {
          // This will find the user if it has been created properly (eg. by the webhook handler)
          id: user.id,
          provider: { $eq: user.provider }
        },
        {
          // This will find the user if it was created (upsert) from a POST /permissions/{email}
          id: user.email,
          email: user.email,
          $or: [
            { provider: 'gigya' }, // The usual/most records will have provider set.
            { provider: { $exists: false } } // But there's still some old records without provider.
            // These old records must be updated sooner or later
          ]
        }
      ]
    },
    {
      $currentDate: { 'lastLogin': { $type: "date" } },
      // We use operator $set for these values, because:
      $set: {
        id: user.id,                        //  1) in case the user was created (upsert) from a POST /permissions/{email}
        email: user.email.toLowerCase(),    //  2) update the email to the newest. Always useful.
        provider: user.provider             //  3) in case the record is an old record without provider.
                                            // When we no longer get {email} in POST /permission and all records have a provider,
                                            //  we can move "id" and "provider" to operator @setOnInsert
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
  
  return MongoDB.collection('grants')
  .findOneAndUpdate({
    app: app.id,
    $or: [
      // Trying to find a grant the new way - by using user._id
      { user: user._id },
      // Trying to find a grant the old way - to keep compatibility
      { user: user.id },
      { user: user.email }
    ]
  },
  {
    $currentDate: { 'lastLogin': { $type: "date" } }
  })
  .then(result => {

    if (result.lastErrorObject.updatedExisting) {
      
      let grant = result.value
      
      // Converting to new grant.user value
      if(!ObjectID.isValid(grant.user)) {
        grant.user = user._id;
        MongoDB.collection('grants').save(grant);
      }
      
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
