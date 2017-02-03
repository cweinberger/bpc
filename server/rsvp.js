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


module.exports.register = function (server, options, next) {

  server.route({
    method: 'GET',
    path: '/',
    config: {
      auth: false,
      cors: {
        credentials: true,
        origin: ['*'],
        // access-control-allow-methods:POST
        headers: ['Accept', 'Authorization', 'Content-Type', 'If-None-Match'],
        exposedHeaders: ['WWW-Authenticate', 'Server-Authorization'],
        maxAge: 86400
      },
      state: {
        parse: true,
        failAction: 'log'
      },
      validate: {
        query: {
          UID: Joi.string().required(),
          email: Joi.string().email().required(),
          app: Joi.string().required(),
          returnUrl: Joi.string().uri()
        }
      }
    },
    handler: function (request, reply) {
      createUserRsvp(request.query.app, {UID: request.query.UID, email: request.query.email}, function(err, rsvp){
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
      cors: {
        credentials: true,
        origin: ['*'],
        // access-control-allow-methods:POST
        headers: ['Accept', 'Authorization', 'Content-Type', 'If-None-Match'],
        exposedHeaders: ['WWW-Authenticate', 'Server-Authorization'],
        maxAge: 86400
      },
      state: {
        parse: true,
        failAction: 'log'
      },
      validate: {
        payload: {
          UID: Joi.string().required(),
          email: Joi.string().email().required(),
          app: Joi.string().required()
        }
      }
    },
    handler: function (request, reply) {
      createUserRsvp(request.payload.app, {UID: request.payload.UID, email: request.payload.email}, function(err, rsvp){
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
function createUserRsvp(appId, data, callback){

  // Vefify the user is created in Gigya
  Gigya.getAccountInfo(data, function (err, result) {
    if (err){
      return callback(err);
    } else if(data.email !== result.profile.email){
      return callback(Boom.badRequest());
    }

    updateUserInDB(result);
    findGrant();
  });

  function updateUserInDB(accountInfo){
    MongoDB.collection('users').updateOne(
      {
        UID: accountInfo.UID,
        email: accountInfo.profile.email
      },
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
      function(err, result){
        if (err) {
          console.error(err);
        }
      }
    );
  }

  function findGrant(){
    MongoDB.collection('applications').findOne({ id: appId }, { fields: { _id: 0 } }, function(err, app){
      if (err) {
        console.error(err);
        return callback(Boom.unauthorized(err.message));
      } else if (app === null){
        return callback(Boom.unauthorized('Unknown application'));
      }

      // We only looking for grants that have not expired
      var exp_conditions =  [{exp: { $exists: false }}, { exp: null },{ exp: {$lt: Oz.hawk.utils.now() }}];

      MongoDB.collection('grants').findOne({ user: data.UID, app: appId, $or: exp_conditions }, { fields: { _id: 0 } }, function(err, grant){
        if (err) {
          console.error(err);
          return callback(Boom.unauthorized(err.message));
        } else if (grant === null){
          // return callback(Boom.unauthorized('Missing grant'));

          // TODO: Perhaps it's better to use delegation. Eg. deletage a generic grant from a central app to the requesting app??

          // Creating new grant
          grant = {
            id : crypto.randomBytes(20).toString('hex'), // (gives 40 characters)
            app : appId,
            user : data.UID,
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
