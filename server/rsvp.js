/*jshint node: true */
'use strict';

const Boom = require('boom');
const Joi = require('joi');
const Oz = require('oz');
const crypto = require('crypto');
const MongoDB = require('./mongodb_client');
const Gigya = require('./gigya_client');
const Google = require('./google_client');

const ENCRYPTIONPASSWORD = process.env.ENCRYPTIONPASSWORD;

const corsRules = {
  credentials: true,
  origin: ['*'],
  // access-control-allow-methods:POST
  headers: ['Accept', 'Authorization', 'Content-Type', 'If-None-Match'],
  exposedHeaders: ['WWW-Authenticate', 'Server-Authorization'],
  maxAge: 86400
};

const rsvpValidation = Joi.object().keys({
  provider: Joi.string().valid('gigya', 'google').required(),
  UID: Joi.string().when('provider', { is: 'gigya', then: Joi.required(), otherwise: Joi.forbidden() }),
  UIDSignature: Joi.string().when('provider', { is: 'gigya', then: Joi.required(), otherwise: Joi.forbidden() }),
  signatureTimestamp: Joi.string().when('provider', { is: 'gigya', then: Joi.required(), otherwise: Joi.forbidden() }),
  ID: Joi.string().when('provider', { is: 'google', then: Joi.required(), otherwise: Joi.forbidden() }),
  id_token: Joi.string().when('provider', { is: 'google', then: Joi.required(), otherwise: Joi.forbidden() }),
  access_token: Joi.string().when('provider', { is: 'google', then: Joi.required(), otherwise: Joi.forbidden() }),
  email: Joi.string().email().required(),
  app: Joi.string().required(),
  returnUrl: Joi.string().uri().optional()
});


module.exports.register = function (server, options, next) {

  server.route({
    method: 'GET',
    path: '/',
    config: {
      auth: false,
      cors: corsRules,
      validate: {
        query: rsvpValidation
      }
    },
    handler: function (request, reply) {
      createUserRsvp(request.query, function(err, rsvp){
        if (err){
          return reply(err);
        }
        // After granting app access, the user returns to the app with the rsvp
        if (request.query.returnUrl) {
          reply.redirect(request.query.returnUrl.concat('?rsvp=', rsvp));
        } else {
          reply(rsvp)
            .header('X-RSVP-TOKEN', rsvp);
        }
      });
    }
  });



  server.route({
    method: 'POST',
    path: '/',
    config: {
      auth: false,
      cors: corsRules,
      validate: {
        payload: rsvpValidation
      }
    },
    handler: function (request, reply) {
      createUserRsvp(request.payload, function(err, rsvp){
        if (err){
          return reply(err);
        }
        // After granting app access, the user returns to the app with the rsvp
        reply(rsvp)
          .header('X-RSVP-TOKEN', rsvp);
      });
    }
  });

  next();
};


module.exports.register.attributes = {
  name: 'rsvp',
  version: '1.0.0'
};




// Here we are creating the user->app rsvp
function createUserRsvp(data, callback){

  // 1. first find the app.
  // 2. Check if the app allows for dynamic creating of grants
  // 3. Check if the app uses Gigya accounts or perhaps pre-defined users (e.g. server-to-server auth keys)

  if (data.provider === 'gigya'){

    // Vefify the user is created in Gigya
    // TODO: Also verify using exchangeUIDSignature (UIDSignature + signatureTimestamp)
    Gigya.getAccountInfo({ UID: data.UID }, function (err, result) {
      if (err){
        return callback(err);
      } else if(data.email !== result.profile.email){
        return callback(Boom.badRequest());
      }

      var query = {
        provider: data.provider,
        id: result.UID,
        email: result.profile.email
      };

      updateUserInDB(query);
      findGrant({ user: data.UID, app: data.app });
    });



  } else if (data.provider === 'google'){

    // Verify the user with Google
    Google.tokeninfo(data, function(err, result){
      if (err){
        return callback(err);
      } else if(data.email !== result.email){
        return callback(Boom.badRequest());
      } else {

        var query = {
          provider: data.provider,
          id: result.user_id,
          email: result.email
        };

        updateUserInDB(query);

        findGrant({ user: data.ID, app: data.app });

      }
    });
  }


  function updateUserInDB(query, callback){
    if (callback === undefined){
        callback = function(err, result){
        if (err) {
          console.error(err);
        }
      };
    }

    MongoDB.collection('users').updateOne(
      query,
      {
        $currentDate: { 'LastLogin': { $type: "timestamp" } },
        $setOnInsert: { 'Permissions': {} },
        //  $set: {
        //  },
        // $addToSet: {
        //   Permissions: 'read'
        // }
      },
      {
        upsert: true
        //  writeConcern: <document>, // Perhaps using writeConcerns would be good here. See https://docs.mongodb.com/manual/reference/write-concern/
        //  collation: <document>
      },
      callback
    );
  }

  function findGrant(input){
    MongoDB.collection('applications').findOne({ id: input.app }, { fields: { _id: 0 } }, function(err, app){
      if (err) {
        console.error(err);
        return callback(Boom.unauthorized(err.message));
      } else if (app === null){
        return callback(Boom.unauthorized('Unknown application'));
      }

      // We only looking for grants that have not expired
      // TODO: Actually, I think we drop the exp_conditions. Instead find any grant and only insert a new one, the the old is not expired.
      // If the old grant is expired, the user should be denied access.
      // var exp_conditions =  [{exp: { $exists: false }}, { exp: null },{ exp: {$lt: Oz.hawk.utils.now() }}];
      // MongoDB.collection('grants').findOne({ user: input.user, app: input.app, $or: exp_conditions }, { fields: { _id: 0 } }, function(err, grant){
      MongoDB.collection('grants').findOne({ user: input.user, app: input.app }, { fields: { _id: 0 } }, function(err, grant){
        if (err) {

          console.error(err);
          return callback(Boom.unauthorized(err.message));

        } else if (grantIsExpired(grant)) {

          return callback(Boom.forbidden());

          // The setting disallowAutoCreationGrants makes sure that no grants are created automatically
        } else if (!app.disallowAutoCreationGrants && grant === null) {

          // Creating new clean grant
          grant = createNewCleanGrant(input.app, input.user);

        }

        // This exp is only the expiration of the rsvp - not the expiration of the grant/ticket.
        if (grant.exp === undefined || grant.exp === null) {
          grant.exp = Oz.hawk.utils.now() + (60000 * 60); // 60000 = 1 minute
        }


        Oz.ticket.rsvp(app, grant, ENCRYPTIONPASSWORD, {}, (err, rsvp) => {
          if (err){
            console.error(err);
            return callback(err);
          }
          // After granting app access, the user returns to the app with the rsvp
          callback(null, rsvp);
        });
      });
    });
  }
}

function grantIsExpired(grant){
  // var exp_conditions =  [{exp: { $exists: false }}, { exp: null },{ exp: {$lt: Oz.hawk.utils.now() }}];
  return grant !== undefined && grant !== null && grant.exp !== undefined && grant.exp !== null && grant.exp < Oz.hawk.utils.now();
}

function createNewCleanGrant(app, user) {
  grant = {
    id : crypto.randomBytes(20).toString('hex'), // (gives 40 characters)
    app : app,
    user : user,
    scope : [],
    exp : null
  };

  MongoDB.collection('grants').insertOne(grant);

  return grant;
}
