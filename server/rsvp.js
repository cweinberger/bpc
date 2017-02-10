/*jshint node: true */
'use strict';

const Boom = require('boom');
const Joi = require('joi');
const Oz = require('oz');
const crypto = require('crypto');
const Gigya = require('./gigya_client');
const MongoDB = require('./mongodb_client');

//Declaration of all properties linked to the environment (beanstalk configuration)
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
        id: accountInfo.UID,
        email: accountInfo.profile.email
      };

      updateUserInDB(query);
      findGrant({ user: data.UID, app: data.app });
    });

  } else if (data.provider === 'google'){

    // TODO: Verify the user with Google

    var query = {
      provider: data.provider,
      id: accountInfo.UID,
      email: accountInfo.profile.email
    };

    // updateUserInDB(query);

    reply();
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
      var exp_conditions =  [{exp: { $exists: false }}, { exp: null },{ exp: {$lt: Oz.hawk.utils.now() }}];

      MongoDB.collection('grants').findOne({ user: input.user, app: input.app, $or: exp_conditions }, { fields: { _id: 0 } }, function(err, grant){
        if (err) {
          console.error(err);
          return callback(Boom.unauthorized(err.message));

        } else if (app.disallowAutoGrant && grant === null){

          return callback(Boom.forbidden());

        } else if (grant === null){

          // Creating new grant
          grant = {
            id : crypto.randomBytes(20).toString('hex'), // (gives 40 characters)
            app : input.app,
            user : input.user,
            scope : [],
            exp : null
          };

          MongoDB.collection('grants').insertOne(grant);

        // } else if (grantMissingScopeFromApp(app, grant)) {
        //
        //   var missingScopes = app.scope.filter(function (appScope){
        //     return grant.scope.indexOf(appScope) === -1;
        //   });

          // MongoDB.collection('grants').update({id: grant.id}, { $addToSet: {scope: { $each: missingScopes } } });
          // grant.scope = grant.scope.concat(missingScopes);

        }

        // TODO: exp should be set by other logic than this. E.g. the system that handles subscriptions
        // Or a default exp could be set per application and then added to the grant.
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
