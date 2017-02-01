/*jshint node: true */
'use strict';

const Boom = require('boom');
const Joi = require('joi');
const Oz = require('oz');
const crypto = require('crypto');
const AWS = require('aws-sdk');
const Facebook = require('./facebook');
const Gigya = require('./gigya_client');
const MongoDB = require('./mongodb_client');

//Declaration of all properties linked to the environment (beanstalk configuration)
const ENCRYPTIONPASSWORD = process.env.ENCRYPTIONPASSWORD;


module.exports.register = function (server, options, next) {

  server.route({
    method: 'GET',
    path: '/rsvp',
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
    path: '/rsvp',
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



  server.route({
    method: 'POST',
    path: '/validateticket',
    config: {
      auth: {
        strategy: 'oz',
        access: {
          scope: false,
          entity: 'any'
        }
      },
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
      }
    },
    handler: function(request, reply) {
      console.log('validateticket');
      reply({});
    }
  });



  server.route({
    method: 'POST',
    path: '/validateappticket',
    config: {
      auth: {
        strategy: 'oz',
        access: {
          scope: false,
          entity: 'app'
        }
      },
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
      }
    },
    handler: function(request, reply) {
      console.log('validateappticket');
      reply({});
    }
  });


    server.route({
      method: 'GET',
      path: '/validateuserticket',
      config: {
        auth: {
          strategy: 'oz',
          access: {
            // scope: '{query.scope}',
            entity: 'user'
          }
        },
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
        }
      },
      handler: function(request, reply) {
        reply();
      }
    });


  server.route({
    method: 'POST',
    path: '/validateuserticket',
    config: {
      auth: {
        strategy: 'oz',
        access: {
          scope: false,
          entity: 'user'
        }
      },
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
      }
    },
    handler: function(request, reply) {

     var subset = request.payload.scope;

     if (subset === undefined || subset === null){
       // The user ticket is not being validated against a subset of scopes.
       return reply({});
     }

     if (subset instanceof Array === false) {
       subset = [subset];
     }

     var err = Oz.scope.validate(subset);
     if (err){
       return reply(Boom.badRequest('Invalid request scope'));
     }

     // We check if the requested scope (subset) is contained in the users grant scope (superset)
     getTicketFromHawkHeader(request.headers.authorization, function(err, ticket){

       var superset = ticket.scope;
       var err = Oz.scope.validate(superset);
       if (err){
         return reply(Boom.badRequest('Invalid ticket scope'));
       }

       if (!Oz.scope.isSubset(superset, subset)){
         return reply(Boom.forbidden('Ticket scope not a subset of request scope'));
       } else {
         reply({});
       }
     });
    }
  });


  server.route({
    method: 'POST',
    path: '/validateuserpermissions',
    config: {
      auth: {
        strategy: 'oz',
        access: {
          scope: false,
          entity: 'user'
        }
      },
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
      }
    },
    handler: function(request, reply) {
      var permissions = request.payload.permissions;

      if (permissions === undefined || permissions === null){
        // The user ticket is not being validated against a subset of scopes.
        reply(badRequest('Missing permissions in payload'));
      }

      if (permissions instanceof Array === false) {
        permissions = [permissions];
      }

      getTicketFromHawkHeader(request.headers.authorization, function(err, ticket){

        const validatePermissionsInTicketInsteadOfMongo = true;

        if (validatePermissionsInTicketInsteadOfMongo){

          var passes = false;

          if(request.payload.all) {
            passes = permissions.every(isIn(ticket.ext.private.Permissions));
          } else {
            passes = ticket.ext.private.Permissions.some(isIn(permissions));
          }

          if (passes){
            reply();
          } else {
            reply(Boom.forbidden());
          }

          function isIn(array){
            return function (entry){
              return array.indexOf(entry) > -1;
            }
          }

        } else {

          var query = {
            IdentityId: ticket.user
          };

          if(request.payload.all) {
            query.Permissions = { $all: permissions };
          } else {
            query.$or = permissions.map(function(permission){
              return {Permissions: permission};
            });
          }

          // Querying the user with the specified permissions
          MongoDB.collection('users').findOne(query, {_id:1}, function(err, user){
            if (err){
              reply(err)
            } else if (user === null) {
              reply(Boom.forbidden());
            } else {
              reply();
            }
          });
        }

      });
    }
  });

  next();
};


module.exports.register.attributes = {
  name: 'tickets',
  version: '1.0.0'
};


// Here we are creating the app ticket
module.exports.loadAppFunc = function(id, callback) {
  console.log('loadAppFunc', id);
  MongoDB.collection('applications').findOne({id:id}, {fields: {_id: 0}}, function(err, app) {
    if (err) {
      return callback(err);
    } else if (app === null){
      callback(Boom.unauthorized('Unknown application'));
    } else {
      callback(null, app);
    }
  });
};


// Here we are creating the user ticket
module.exports.loadGrantFunc = function(id, next) {
  console.log('loadGrantFunc', id);
  MongoDB.collection('grants').findOne({id: id}, {fields: {_id: 0}}, function(err, grant) {
    if (err) {
      return next(err);
    } else if (grant === null) {
      next(Boom.unauthorized('Missing grant'));
    } else {

      if (grant.exp === undefined || grant.exp === null) {
        grant.exp = Oz.hawk.utils.now() + (60000 * 60 * 24); // 60000 = 1 minute
      }

      // // Finding private details to encrypt in the ticket for later usage.
      MongoDB.collection('users').findOne({UID: grant.user}, {fields: {_id: 0, email: 1, UID: 1, Permissions: 1}}, function(err, user){
        if (err) {
          return next(err);
        } else if (user === null) {
          // return next(new Error('Unknown user'));
          next(null, grant);
        } else {
          next(null, grant, {public: {}, private: user});
        }
      });
    }
  });
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
        $addToSet: {
          Permissions: 'read'
        }
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
    var exp_conditions =  [{exp: { $exists: false }}, { exp: null },{ exp: {$lt: Oz.hawk.utils.now() }}];

    MongoDB.collection('grants').findOne({user: data.UID, app: appId, $or: exp_conditions}, {fields: {_id: 0}}, function(err, grant){
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
      }

      // TODO: exp should be set by other logic than this. E.g. the system that handles subscriptions
      // Or a default exp could be set per application and then added to the grant.
      if (grant.exp === undefined || grant.exp === null) {
        grant.exp = Oz.hawk.utils.now() + (60000 * 60); // 60000 = 1 minute
      }

      MongoDB.collection('applications').findOne({id: appId}, {fields: {_id: 0}}, function(err, app){
        if (err) {
          console.error(err);
          return callback(Boom.unauthorized(err.message));
        } else if (app === null){
          return callback(Boom.unauthorized('Unknown application'));
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


function getTicketFromHawkHeader(requestHeaderAuthorization, callback){
  var id = requestHeaderAuthorization.match(/id=([^,]*)/)[1].replace(/"/g, '');
  if (id === undefined || id === null || id === ''){
    return callback(Boom.unauthorized('Authorization Hawk ticket not found'));
  }

  Oz.ticket.parse(id, ENCRYPTIONPASSWORD, {}, callback);
}
