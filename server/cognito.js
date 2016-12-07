/*jshint node: true */
'use strict';

const Boom = require('boom');
const Oz = require('oz');
const crypto = require('crypto');
const AWS = require('aws-sdk');
const Facebook = require('./facebook');

//Declaration of all properties linked to the environment (beanstalk configuration)
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

var temp_users = {};

//Params for making the API call
// var params = {
//   AccountId: AWS_ACCOUNT_ID, // AWS account Id
//   RoleArn: IAM_ROLE_ARN, // IAM role that will be used by authentication
//   IdentityPoolId: COGNITO_IDENTITY_POOL_ID, //ID of the identity pool
//   Logins: {
//     // 'www.amazon.com': AMAZON_TOKEN //Token given by Amazon
//   }
// };

//Initialize the Credentials object
// AWS.config.credentials = new AWS.CognitoIdentityCredentials(params);


// var poolData = {
//   UserPoolId : COGNITO_IDENTITY_POOL_ID,
//   ClientId : '5tv5te4df577992koo6mo7t6me',
//   Paranoia : 7
// };


// Call to Amazon Cognito, get the credentials for our user
// AWS.config.credentials.get(err,data){…}

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
      cors: true,
      state: {
        parse: true, // parse and store in request.state
        failAction: 'log' // may also be 'ignore' or 'log'
      }
    },
    handler: function (request, reply) {
      console.log('GET state', request.state);
      console.log('GET query', request.query);
      //
      // if (request.state.awsAccessToken && request.query.returnUrl){
      //   console.log('redirecting with a cookie');
      //   reply
      //   // .redirect(request.query.returnUrl.concat('?awsAccessToken=', request.state.awsAccessToken,'&awsIdToken=', request.state.awsIdToken, '&awsRefreshToken=', request.state.awsRefreshToken))
      //   // .state('accessToken', request.state.accessToken)
      //   .state('sjfhkgsdjkhfgsdjkhfg', 'fdfdfd')
      //   .redirect(request.query.returnUrl);
      //   // .header('X-AWS-ACCESS-TOKEN', request.state.awsAccessToken)
      //   // .header('X-AWS-ID-TOKEN', request.state.awsIdToken)
      //   // .header('X-AWS-REFRESH-TOKEN', request.state.awsRefreshToken);
      //
      // } else if (request.query.returnUrl) {
      if (request.query.returnUrl) {
        console.log('redirecting to main page with returnUrl');
        reply.redirect('/?returnUrl='.concat(request.query.returnUrl));
      } else {
        console.log('redirecting to main page');
        reply.redirect('/');
      }
    }
  });

  server.route({
    method: 'POST',
    path: '/create',
    handler: createUser
  });

  server.route({
    method: 'POST',
    path: '/signout',
    config: {
      cors: {
        credentials: true,
        origin: ['*'],
        // access-control-allow-methods:POST
        headers: ['Accept', 'Authorization', 'Content-Type', 'If-None-Match'],
        exposedHeaders: ['WWW-Authenticate', 'Server-Authorization'],
        maxAge: 86400
      },
      state: {
        parse: true, // parse and store in request.state
        failAction: 'log' // may also be 'ignore' or 'log'
      }
    },
    handler: signout
  });

  server.route({
    method: 'POST',
    path: '/permissions',
    config: {
      cors: {
        credentials: true,
        origin: ['*'],
        // access-control-allow-methods:POST
        headers: ['Accept', 'Authorization', 'Content-Type', 'If-None-Match'],
        exposedHeaders: ['WWW-Authenticate', 'Server-Authorization'],
        maxAge: 86400
      },
      state: {
        parse: true, // parse and store in request.state
        failAction: 'log' // may also be 'ignore' or 'log'
      }
    },
    handler: validateUser
  });

  server.route({
    method: 'POST',
    path: '/auth',
    config: {
      cors: {
        credentials: true,
        origin: ['*'],
        // access-control-allow-methods:POST
        headers: ['Accept', 'Authorization', 'Content-Type', 'If-None-Match', 'Cookie'],
        exposedHeaders: ['WWW-Authenticate', 'Server-Authorization'],
        maxAge: 86400
      },
      state: {
        parse: true, // parse and store in request.state
        failAction: 'log' // may also be 'ignore' or 'log'
      }
    },
    handler: authUser
  });

  server.route({
    method: 'POST',
    path: '/oztest',
    config: {
      cors: {
        credentials: true,
        origin: ['*'],
        // access-control-allow-methods:POST
        headers: ['Accept', 'Authorization', 'Content-Type', 'If-None-Match'],
        exposedHeaders: ['WWW-Authenticate', 'Server-Authorization'],
        maxAge: 86400
      },
      state: {
        parse: true, // parse and store in request.state
        failAction: 'log' // may also be 'ignore' or 'log'
      }
    },
    handler: function (request, reply) {
      console.log('POST state', request.state);
      console.log('POST headers', request.headers);
      console.log('POST payload', request.payload);

      if (request.state.awsAccessToken) {

        // TODO: Validate the app ID (request.payload.id) exists.
        // And validate that the key is the real secret.

        cognitoIdentityServiceProvider.getUser({ AccessToken: request.state.awsAccessToken}, function(err, user){
          console.log('getUser', err, user);

          var app = {
            id: request.payload.id, // - the application identifier.
            scope: [request.payload.scope], // - an array with the default application scope.
            delegate: false, // - if true, the application is allowed to delegate a ticket to another application. Defaults to false.
            key: 'fakesecret', // - the shared secret used to authenticate.
            algorithm: 'sha256' // - the HMAC algorithm used to authenticate (e.g. HMAC-SHA256).
          };

          var grant = {
            id: 'fakegrant', // - the grant identifier.
            app: request.payload.id, // - the application identifier.
            user: user.Username, // - the user identifier.
            exp: Oz.hawk.utils.now() + (6000 * 60 * 24), // - grant expiration time in milliseconds since 1/1/1970.
            scope: ['read'] // - an array with the scope granted by the user to the application.
          };

          Oz.ticket.rsvp(app, grant, process.env.ENCRYPTIONPASSWORD, {}, (err, rsvp) => {
            // After granting app access, the user returns to the app with the rsvp
            reply(rsvp)
            .header('X-RSVP-TOKEN', rsvp);
          });
        });

        // reply()
        // .state('test', 'test', {isSameSite: ''})
        // .header('X-AWS-ACCESS-TOKEN', 'TODO')
        // .header('X-AWS-ID-TOKEN', 'TODO')
        // .header('X-AWS-REFRESH-TOKEN', 'TODO');
      } else {
        console.log('redirecting to main page with returnUrl');
        reply.redirect('/?returnUrl='.concat(request.headers.referer));
        // reply(Boom.unauthorized());
      }
    }
  });

  next();
};

module.exports.register.attributes = {
  name: 'cognito',
  version: '1.0.0'
};



function createUser(request, reply) {

  console.log('');
  console.log('createUser', request.payload);

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
      reply(Boom.unauthorized());
    } else if (data.IdentityId === undefined || data.IdentityId === null) {
      reply(Boom.unauthorized());
    } else {

      var IdentityId = data.IdentityId;

      if (temp_users[IdentityId] === undefined || temp_users[IdentityId] === null){
        temp_users[IdentityId] = {
          IdentityId: IdentityId,
          Permissions: [
            '*:read'
          ]
        };
      }

      reply()
        .state('ii', IdentityId)
        .state('il', Object.keys(logins)[0])
        .state('ll', logins);
    }
  });

  // var cognitoIdentityCredentials = new AWS.CognitoIdentityCredentials({
  //   IdentityPoolId: COGNITO_IDENTITY_POOL_ID,
  //   Logins: logins
  // });
  //
  // cognitoIdentityCredentials.get(function(err){
  //   if (err) {
  //     return reply(Boom.unauthorized());
  //   }
  //
  //   var IdentityId = cognitoIdentityCredentials.identityId;
  //
  //   if (temp_users[IdentityId] === undefined || temp_users[IdentityId] === null){
  //     temp_users[IdentityId] = {};
  //   }
  //
  //   temp_users[IdentityId].CognitoIdentityCredentials = cognitoIdentityCredentials;
  //
  //   temp_users[IdentityId].Permissions = [
  //     '*:read'
  //   ];




    // We need AccessToken to get the profile data

    // if (logins['graph.facebook.com']){
    //   Facebook.getProfile({access_token: cognitoIdentityCredentials.params.Logins['graph.facebook.com']}, function(err, response){
    //     temp_users[IdentityId].FacebookProfile = response;
    //   });
    // }
    //
    // var cognitoLogin = Object.keys(logins).find((k) => {return k.indexOf('cognito') > -1;});
    // console.log('cognitoLogin', cognitoLogin);
    // if(cognitoLogin){
    //   cognitoIdentityServiceProvider.getUser({AccessToken: cognitoIdentityCredentials.params.Logins[cognitoLogin]}, function(err, data){
    //     console.log('getUser', err, data);
    //     if (err) {
    //       // return reply(err);
    //     } else if (data === null) {
    //       // return reply(Boom.unauthorized());
    //       // } else if (data.Username !== request.payload.username) {
    //       //   return reply(Boom.unauthorized());
    //     } else {
    //       temp_users[IdentityId].CognitoUser = data;
    //     }
    //   });
    // }


  // });

  //
  // var params = {
  //   IdentityId: request.payload.IdentityId,
  //   Logins: request.payload.Logins
  // };
  //
  // // cognitoIdentity.getOpenIdToken(params, function(err, data) {
  // //   console.log('getOpenIdToken', err, data);
  // // });
  //
  // cognitoIdentity.getCredentialsForIdentity(params, function(err, data) {
  //   console.log('getCredentialsForIdentity', data, err);
  //   if (err) {
  //     return reply(Boom.unauthorized());
  //   } else if (request.payload.SessionToken !== data.Credentials.SessionToken){
  //     // return reply(Boom.unauthorized());
  //   }
  //
  //   temp_users[IdentityId].CognitoIdentityCredentials = data.Credentials;
  //
  //   Facebook.getProfiles({access_token: params.Logins['graph.facebook.com']}, function(err, response){
  //     temp_users[IdentityId].FacebookProfile = response;
  //   });
  //
  //
  //   reply();
  // });
}


function validateUser(request, reply) {

  console.log('');
  console.log('validateUser');
  console.log('PAYLOAD', request.payload);
  // console.log('STATE', request.state);

  // TODO: Validate accessToken
  // - Check the iss claim. It should match your user pool. For example, a user pool created in the us-east-1 region will have an iss value of https://cognito-idp.us-east-1.amazonaws.com/{userPoolId}.
  // - Check the token_use claim.

  //   If you are only accepting the access token in your web APIs, its value must be access.
  //   If you are only using the ID token, its value must be id.
  //   If you are using both tokens, the value is either id or access.

  // - Verify the signature of the decoded JWT token.
  // - Check the exp claim and make sure the token is not expired.

  // See "To verify a signature for ID and access tokens" on https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-with-identity-providers.html


  // var accessToken = request.payload.accessToken;
  // var idToken = request.payload.idToken;

  if (request.payload.sessionToken){
    var accessKeyId = request.payload.accessKeyId ? request.payload.accessKeyId : '';
    var secretKey = request.payload.secretKey ? request.payload.secretKey : '';
    var creds = new AWS.Credentials(accessKeyId, secretKey, request.payload.sessionToken);
    console.log('creds', creds);

    if(creds.expired){
      return reply(Boom.unauthorized());
    }

    getUser(request.payload.identityId, reply);

  }

  var logins;
  if (request.state.ll){
    logins = request.state.ll;
  } else if (request.payload.Logins){
    logins = request.payload.Logins;
  } else {
    return reply(Boom.unauthorized());
  }

  console.log('logins', logins);

  var params = {
    IdentityPoolId: COGNITO_IDENTITY_POOL_ID,
    AccountId: AWS_ACCOUNT_ID,
    Logins: logins
  };

  cognitoIdentity.getId(params, function(err, data) {
    console.log('getId', err, data);
    if (err) {
      reply(Boom.unauthorized());
    } else if (data.IdentityId === undefined || data.IdentityId === null) {
      reply(Boom.unauthorized());
    } else if (data.IdentityId !== request.state.ii) {
      reply(Boom.unauthorized());
    } else {
      getUser(data.IdentityId, reply);
    }
  });

  function getUser(IdentityId, callback){
    var user = temp_users[IdentityId];
    if (user === undefined || user.Permissions === undefined){
      reply(Boom.unauthorized());
    } else {
      callback(null, user);
    }
  }



  // var cognitoIdentityCredentials = new AWS.CognitoIdentityCredentials({
  //   IdentityPoolId: COGNITO_IDENTITY_POOL_ID,
  //   Logins: logins
  // });
  //
  // cognitoIdentityCredentials.get(function(err){
  //   if (err) {
  //     return reply(Boom.unauthorized());
  //   }
  //
  //   if (new Date(cognitoIdentityCredentials.Expiration) < Date.now()) {
  //     reply(Boom.unauthorized('Session expired'));
  //   } else {
  //
  //     var user = temp_users[cognitoIdentityCredentials.identityId];
  //
  //     reply(user);
  //   }
  // });




  // var params = {
  //   IdentityPoolId: COGNITO_IDENTITY_POOL_ID,
  //   AccountId: AWS_ACCOUNT_ID,
  //   Logins: logins
  // };
  //
  // cognitoIdentity.getId(params, function(err, data) {
  //   console.log('getId', err, data); // successful response
  //   if (err) {
  //     reply(Boom.unauthorized());
  //   } else if (data.IdentityId === undefined || data.IdentityId === null) {
  //     reply(Boom.unauthorized());
  //   } else {
  //
  //     var params = {
  //       IdentityId: data.IdentityId,
  //       Logins: logins
  //     };
  //
  //     cognitoIdentity.getOpenIdToken(params, function(err, data) {
  //       console.log('getOpenIdToken', err, data);
  //     });
  //
  //     cognitoIdentity.getCredentialsForIdentity(params, function(err, data) {
  //       console.log('getCredentialsForIdentity', err, data);
  //       if (err) {
  //         reply(Boom.unauthorized());
  //       } else {
  //         // TODO
  //         if (new Date(data.Expiration) < Date.now()) {
  //           reply(Boom.unauthorized('Session expired'));
  //         } else {
  //
  //           var user = temp_users[data.IdentityId];
  //           console.log('user', user);
  //
  //           reply(user);
  //         }
  //       }
  //     });
  //   }
  // });

  // if(Object.keys(logins).some((k) => {return k.indexOf('facebook') > -1;})){
  //
  // } else if(Object.keys(logins).some((k) => {return k.indexOf('cognito') > -1;})){
  //   cognitoIdentityServiceProvider.getUser({AccessToken: accessToken}, function(err, data){
  //     console.log('getUser', err, data);
  //     if (err) {
  //       // return reply(err);
  //     } else if (data === null) {
  //       // return reply(Boom.unauthorized());
  //       // } else if (data.Username !== request.payload.username) {
  //       //   return reply(Boom.unauthorized());
  //     } else {
  //       // if (request.payload.permissions.indexOf('read:*') > -1) {
  //       // }
  //       // reply();
  //     }
  //   });
  // }
}


function authUser(request, reply){

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
      return reply(Boom.unauthorized());
    }

    reply(cognitoIdentityCredentials);
  });
}


function signout(request, reply){

  reply().
    unstate('ll');
}
