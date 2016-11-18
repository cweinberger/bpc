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

var poolData = {
  UserPoolId : COGNITO_IDENTITY_POOL_ID,
  ClientId : '5tv5te4df577992koo6mo7t6me',
  Paranoia : 7
};


// Call to Amazon Cognito, get the credentials for our user
// AWS.config.credentials.get(err,data){…}

module.exports.register = function (server, options, next) {

  server.route({
    method: 'GET',
    path: '/',
    config: {
      state: {
          parse: true, // parse and store in request.state
          failAction: 'error' // may also be 'ignore' or 'log'
        }
      },
    handler: function (request, reply) {
      console.log('state', request.state);
      console.log('query', request.query);

      if (request.state.awsAccessToken && request.query.returnUrl){
        console.log('redirecting with a cookie');
        reply
        .redirect(request.query.returnUrl.concat('?awsAccessToken=', request.state.awsAccessToken,'&awsIdToken=', request.state.awsIdToken))
        .header('X-AWS-ACCESS-TOKEN', request.state.awsAccessToken)
        .header('X-AWS-ID-TOKEN', request.state.awsIdToken);
        // .state('accessToken', request.state.accessToken)
        // .state('sjfhkgsdjkhfgsdjkhfg', 'fdfdfd')

      } else if (request.query.returnUrl) {
        reply.redirect('/?returnUrl='.concat(request.query.returnUrl));
      } else {
        reply.redirect('/');
      }

      // reply('Hello!');
    }
  });

  server.route({
    method: 'POST',
    path: '/permissions',
    handler: function (request, reply) {


      // TODO: Validate accessToken
      // - Check the iss claim. It should match your user pool. For example, a user pool created in the us-east-1 region will have an iss value of https://cognito-idp.us-east-1.amazonaws.com/{userPoolId}.
      // - Check the token_use claim.

      //   If you are only accepting the access token in your web APIs, its value must be access.
      //   If you are only using the ID token, its value must be id.
      //   If you are using both tokens, the value is either id or access.

      // - Verify the signature of the decoded JWT token.
      // - Check the exp claim and make sure the token is not expired.

      // See "To verify a signature for ID and access tokens" on https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-with-identity-providers.html


      getUser(request.payload.accessToken, function(err, data){
        if (err) {
          console.error(err, data);
          return reply(err);
        } else if (data === null) {
          return reply(Boom.unauthorized());
        } else if (data.Username !== request.payload.username) {
          return reply(Boom.unauthorized());
        } else {
          // if (request.payload.permissions.indexOf('read:*') > -1) {
          // }
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
