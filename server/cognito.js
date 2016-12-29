/*jshint node: true */
'use strict';

const Boom = require('boom');
const Oz = require('oz');
const crypto = require('crypto');
const AWS = require('aws-sdk');
const Facebook = require('./facebook');
const MongoDB = require('./mongodb_client');

//Declaration of all properties linked to the environment (beanstalk configuration)
const ENCRYPTIONPASSWORD = process.env.ENCRYPTIONPASSWORD;
const AWS_ACCOUNT_ID = process.env.AWS_ACCOUNT_ID;
const AWS_REGION = process.env.AWS_REGION;
const COGNITO_IDENTITY_POOL_ID = process.env.COGNITO_IDENTITY_POOL_ID;
const IAM_ROLE_ARN = process.env.IAM_ROLE_ARN;
const COGNITO_DATASET_NAME = process.env.COGNITO_DATASET_NAME;
const COGNITO_KEY_NAME = process.env.COGNITO_KEY_NAME;
const CALLBACKURL = process.env.CALLBACKURL;
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
var AWS_SESSION_TOKEN = '';

// if (process.env.AWS_ACCESS_KEY_ID === undefined || process.env.AWS_SECRET_ACCESS_KEY === undefined){
//   console.error('AWS credentials are missing');
//   process.exit(0);
// }

AWS.config.region = AWS_REGION;
AWS.config.update({
  // accessKeyId: AWS_ACCESS_KEY_ID,
  // secretAccessKey: AWS_SECRET_ACCESS_KEY,
  region: AWS_REGION
});

var cognitoIdentity = new AWS.CognitoIdentity();
var cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider();




module.exports.register = function (server, options, next) {

  var oneday = 1000 * 60 * 60 * 24;
  var onemonth = oneday * 30;

  server.state('ii', {
    ttl: oneday,
    isHttpOnly: false,
    isSecure: false,
    isSameSite: false,
    path: '/'
  });

  server.state('il', {
    ttl: oneday,
    isHttpOnly: false,
    isSecure: false,
    isSameSite: false,
    path: '/'
  });

  server.state('ll', {
    ttl: oneday,
    isHttpOnly: false,
    isSecure: false,
    isSameSite: false,
    path: '/',
    encoding: 'base64json'
  });




  server.route({
    method: 'GET',
    path: '/',
    config: {
      auth: false,
      cors: false,
      state: {
        parse: true,
        failAction: 'log'
      }
    },
    handler: function (request, reply) {
      console.log('GET / state', request.state);
      console.log('GET / query', request.query);

      var logins;

      var app = request.query.app;
      if (app === undefined || app === null){
        return reply(Boom.unauthorized('Missing app parameter'));
      }

      if (request.state.ll){
        logins = request.state.ll;
      } else if (request.query.Logins){
        logins = request.query.Logins;
      } else {
        // Redirecting the user to the login-page
        var temp = Object.keys(request.query).map(f).join('&');
        return reply.redirect('/cognito_login.html?'.concat(temp));
      }

      createUserRsvp(app, logins, function(err, rsvp){
        if (err){
          if (err.isBoom && err.output.statusCode === 401 && err.output.payload.message.indexOf('Token is expired') > -1){
            var originalRequestParameters = Object.keys(request.query).map(function(k){
              return k.concat('=', request.query[k]);
            }).join('&');
            return reply.redirect('/cognito_login.html'.concat('?returnUrl=', request.path, encodeURIComponent('?'.concat(originalRequestParameters))));
          } else {
            return reply(err);
          }
        }
        // After granting app access, the user returns to the app with the rsvp
        if (request.query.returnUrl) {
          console.log('redirecting to main page with returnUrl');
          reply.redirect(request.query.returnUrl.concat('?rsvp=', rsvp));
        } else {
          reply(rsvp)
            .header('X-RSVP-TOKEN', rsvp);
        }
      });

      function f(k){
        return k.concat('=', request.query[k]);
      }
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
      }
    },
    handler: function (request, reply) {
      console.log('POST / headers', request.headers);
      console.log('POST / payload', request.payload);

      if(request.payload == null){
        return reply(Boom.unauthorized('Missing payload'));
      }

      var app = request.payload.app;
      if (app === undefined || app === null){
        return reply(Boom.unauthorized('Missing app parameter'));
      }

      var logins;

      if (request.state.ll){
        logins = request.state.ll;
      } else if (request.payload.Logins){
        logins = request.payload.Logins;
      } else {
        return reply(Boom.unauthorized());
      }

      createUserRsvp(app, logins, function(err, rsvp){
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
    path: '/signin',
    config: {
      auth: false
    },
    handler: function(request, reply) {

      console.log('');
      console.log('registerUser', request.payload);

      // if (request.payload.IdentityId === undefined || request.payload.IdentityId === null){
      //   return reply(Boom.badRequest('Parameter IdentityId missing'));
      // }

      if (request.payload.Logins === undefined || request.payload.Logins === null){
        return reply(Boom.badRequest('Parameter Logins missing'));
      }

      // if (request.payload.AccessToken === undefined || request.payload.AccessToken === null){
      //   return reply(Boom.badRequest('Parameter AccessToken missing'));
      // }

      var logins = request.payload.Logins;

      var params = {
        IdentityPoolId: COGNITO_IDENTITY_POOL_ID,
        AccountId: AWS_ACCOUNT_ID,
        Logins: logins
      };

      cognitoIdentity.getId(params, function(err, data) {
        if (err) {
          console.log(err);
          reply(Boom.unauthorized('Error getting IdentityId'));
        } else if (data.IdentityId === undefined || data.IdentityId === null) {
          reply(Boom.unauthorized('IdentityId could not be found'));
        } else {

          var IdentityId = data.IdentityId;

          MongoDB.collection('users').updateOne(
             {IdentityId: IdentityId},
             {$set: {
               IdentityId: IdentityId,
               IdentityProvider: Object.keys(logins)[0],
               Logins: JSON.stringify(logins),
               Permissions: [
                 '*:read'
               ]
             }},
             {
               upsert: true
              //  writeConcern: <document>, // Perhaps using writeConcerns would be good here. See https://docs.mongodb.com/manual/reference/write-concern/
              //  collation: <document>
            }, function(err, result){
              if (err) {
                console.error(err);
                reply(Boom.badImplementation());
              } else if(result.result.ok !== 1) {
                console.log('result', result);
                reply(Boom.badImplementation());
              } else {
                done();
              }
            }
          );

          function done(){
            reply()
            .state('ii', IdentityId)
            .state('il', Object.keys(logins)[0])
            .state('ll', logins);
          }
        }
      });
    }
  });




  server.route({
    method: 'POST',
    path: '/signout',
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
      }
    },
    handler: function(request, reply){
      reply()
        .unstate('ii')
        .unstate('il')
        .unstate('ll');
    }
  });



  server.route({
    method: 'GET',
    path: '/credentials',
    config: {
      auth: false,
      cors: {
        credentials: true,
        origin: ['*'],
        // access-control-allow-methods:POST
        headers: ['Accept', 'Authorization', 'Content-Type', 'If-None-Match', 'Cookie'],
        exposedHeaders: ['WWW-Authenticate', 'Server-Authorization'],
        maxAge: 86400
      },
      state: {
        parse: true,
        failAction: 'log'
      }
    },
    handler: function(request, reply){

      console.log('');
      console.log('authUser');

      var logins;
      if (request.state.ll){
        logins = request.state.ll;
      } else if (request.payload.Logins){
        logins = request.payload.Logins;
      } else {
        return reply(Boom.unauthorized());
      }

      console.log('logins', logins);

      var cognitoIdentityCredentials = new AWS.CognitoIdentityCredentials({
        IdentityPoolId: COGNITO_IDENTITY_POOL_ID,
        Logins: logins
      });

      cognitoIdentityCredentials.get(function(err){
        if (err) {
          console.error(err);
          reply(Boom.unauthorized(err.message));
        } else {
          reply(cognitoIdentityCredentials);
        }
      });
    }
  });




  server.route({
    method: 'GET',
    path: '/profile',
    config: {
      // auth: {
      //   strategy: 'oz',
      //   access: {
      //     scope: ['profile'],
      //     entity: 'user'
      //   }
      // },
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
      }
    },
    handler(request, reply){
      console.log('GET /profile', request.state);

      var logins = request.state.ll;

      // TODO: Check the login tokens expiration

      var cognitoLogin = Object.keys(logins).find((k) => {return k.indexOf('cognito') > -1;});

      if(cognitoLogin) {

        parseCognitoLogin(logins[cognitoLogin], reply);

      } else if (logins['graph.facebook.com']){
          Facebook.getProfile({access_token: logins['graph.facebook.com']}, function(err, result){
            if(err){
              console.error(err);
              reply(err);
            } else {
              reply(result);
            }
          });

      } else {

        reply(Boom.notFound());

      }
    }
  });


  server.route({
    method: 'GET',
    path: '/userprofile',
    config: {
      auth: {
        strategy: 'oz',
        access: {
          // scope: ['profile'],
          entity: 'user'
        }
      }
    },
    handler(request, reply){
      console.log('GET /userprofile (server)', request.headers);

      getTicketFromHawkHeader(request.headers.authorization, function(err, ticket){
        console.log('ticket parse', err, ticket);

        if (ticket.ext.private.Logins === undefined || ticket.ext.private.Logins === null){
          return reply(Boom.unauthorized('Authorization Hawk ticket missing logins'));
        }

        var logins = ticket.ext.private.Logins;

        // TODO: Check the login tokens expiration

        var cognitoLogin = Object.keys(logins).find((k) => {return k.indexOf('cognito') > -1;});

        if(cognitoLogin) {

          parseCognitoLogin(logins[cognitoLogin], reply);

        } else if (logins['graph.facebook.com']){
            Facebook.getProfile({access_token: logins['graph.facebook.com']}, reply);

        } else {

          reply(Boom.notFound());

        }
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
       reply({});
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
         return reply(Boom.unauthorized('Ticket scope not a subset of request scope'));
       } else {
         reply({});
       }
     });
    }
  });


  next();
};


module.exports.register.attributes = {
  name: 'cognito',
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
      // if (app.scope instanceof Array && app.scope[0] === 'admin'){
      if (false){
        // If the app is admin/console-app, then we'll add scopes to match all other apps ala 'admin:{AppId}'
        MongoDB.collection('applications').find({}, {fields: {_id: 0, id: 1}}).toArray(function(err, result) {

          var ids = result
            .filter((k) => { return k.id !== app.id; }) // We don't want the main admin-app
            .map((i) => {return 'admin:'.concat(i.id);});
          app.scope = app.scope.concat(ids);
          callback(null, app);
        });
      } else {
        callback(null, app);
      }
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

      // Finding private details to encrypt in the ticket for later usage.
      MongoDB.collection('users').findOne({IdentityId: grant.user}, {fields: {_id: 0, IdentityId: 1, Logins: 1}}, function(err, user){
        if (err) {
          return next(err);
        } else if (user === null) {
          // return next(new Error('Unknown user'));
          next(null, grant);
        } else {
          next(null, grant, {public: {IdentityId: user.IdentityId}, private: {Logins:JSON.parse(user.Logins)}});
        }
      });
    }
  });
};


// Here we are creating the user->app rsvp
function createUserRsvp(app_id, logins, callback){
  console.log('createUserRsvp', app_id);
  MongoDB.collection('applications').findOne({id: app_id}, {fields: {_id: 0}}, function(err, app){
    if (err) {
      console.error(err);
      return callback(Boom.unauthorized(err.message));
    } else if (app === null){
      return callback(Boom.unauthorized('Unknown application'));
    }

    var cognitoIdentityCredentials = new AWS.CognitoIdentityCredentials({
      IdentityPoolId: COGNITO_IDENTITY_POOL_ID,
      Logins: logins
    });

    cognitoIdentityCredentials.get(function(err){
      if (err) {
        console.error('cognitoIdentityCredentials error:', err);
        return callback(Boom.unauthorized(err.message));
      }

      // TODO: Check if user exists here.
      MongoDB.collection('users').findOne({IdentityId: cognitoIdentityCredentials.identityId}, function(err, user){
        console.log('Checking the user exists', err, user);
      });

      MongoDB.collection('grants').findOne({user: cognitoIdentityCredentials.identityId, app: app_id}, {fields: {_id: 0}}, function(err, grant){
        if (err) {
          console.error(err);
          return callback(Boom.unauthorized(err.message));
        } else if (grant === null){
          return callback(Boom.unauthorized('Missing grant'));
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
  });
}


function getTicketFromHawkHeader(requestHeaderAuthorization, callback){
  var id = requestHeaderAuthorization.match(/id=([^,]*)/)[1].replace(/"/g, '');
  if (id === undefined || id === null || id === ''){
    return callback(Boom.unauthorized('Authorization Hawk ticket not found'));
  }

  Oz.ticket.parse(id, ENCRYPTIONPASSWORD, {}, callback);
}


function parseCognitoLogin(login, callback){
  var profile = {};
  var payload = JSON.parse(new Buffer(login.split('.')[1], 'base64').toString());
  Object.keys(payload).filter(allowedFields).forEach(addToProfile);
  callback(null, profile);

  // Allow fields that start with cognito: and email
  function allowedFields(k) {return k.indexOf('cognito:') > -1 || ['email'].indexOf(k) > -1;}
  function addToProfile(k) {profile[k] = payload[k];}
}
