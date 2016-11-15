/*jshint node: true */
'use strict';

var Boom = require('boom');

//Declaration of all properties linked to the environment (beanstalk configuration)
var AWS_ACCOUNT_ID = process.env.AWS_ACCOUNT_ID;
var AWS_REGION = process.env.AWS_REGION;
var COGNITO_IDENTITY_POOL_ID = process.env.COGNITO_IDENTITY_POOL_ID;
var IAM_ROLE_ARN = process.env.IAM_ROLE_ARN;
var COGNITO_DATASET_NAME = process.env.COGNITO_DATASET_NAME;
var COGNITO_KEY_NAME = process.env.COGNITO_KEY_NAME;
var CALLBACKURL = process.env.CALLBACKURL;
// var AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
// var AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

var AWS = require('aws-sdk');

if (process.env.AWS_ACCESS_KEY_ID === undefined || process.env.AWS_SECRET_ACCESS_KEY === undefined){
  console.error('AWS credentials er missing');
  process.exit(0);
}

AWS.config.region = AWS_REGION;
AWS.config.update({region: AWS_REGION});

//Params for making the API call
var params = {
  AccountId: AWS_ACCOUNT_ID, // AWS account Id
  RoleArn: IAM_ROLE_ARN, // IAM role that will be used by authentication
  IdentityPoolId: COGNITO_IDENTITY_POOL_ID, //ID of the identity pool
  Logins: {
    // 'www.amazon.com': AMAZON_TOKEN //Token given by Amazon
  }
};

//Initialize the Credentials object
// AWS.config.credentials = new AWS.CognitoIdentityCredentials(params);


var cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider();

//Call to Amazon Cognito, get the credentials for our user
// AWS.config.credentials.get(err,data){…}

module.exports.register = function (server, options, next) {

  server.route({
    method: 'GET',
    path: '/',
    handler: function (request, reply) {
      reply('Hello cognito!');
    }
  });

  server.route({
    method: 'POST',
    path: '/permissions',
    handler: function (request, reply) {
      getUser(request.payload.accessToken, function(err, data){
        if (err) {
          console.error(err, data);
          return reply(err);
        } else if (data === null) {
          return reply(Boom.unauthorized());
        } else if (data.Username !== request.payload.username) {
          return reply(Boom.unauthorized());
        } else {
          if (request.payload.permissions.indexOf('read:*') > -1) {
          }
          reply();
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


function getUser(accessToken, callback){
  cognitoIdentityServiceProvider.getUser({
    AccessToken: accessToken
  }, callback);
  //  function(err, data) {
  //   if (err) console.log(err, err.stack); // an error occurred
  //   else     console.log(data);           // successful response
    // Example response
    // {
    //   Username: 'dako',
    //   UserAttributes:
    //   [
    //     {
    //       Name: 'sub',
    //       Value: '936dc9e8-3f64-4f95-ad30-2305ff93944f'
    //     },
    //     {
    //       Name: 'email_verified',
    //       Value: 'true'
    //     },
    //     {
    //       Name: 'email',
    //       Value: 'dako@berlingskemedia.dk'
    //     }
    //   ]
    // }
  // });
}
