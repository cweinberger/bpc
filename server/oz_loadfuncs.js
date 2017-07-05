/*jshint node: true */
'use strict';

if (module.parent.exports.lab !== undefined || process.env.NODE_ENV === 'test') {
  process.env.ENCRYPTIONPASSWORD = 'random_test_password_that_is_longer_than_32_characters';
}

const ENCRYPTIONPASSWORD = process.env.ENCRYPTIONPASSWORD;
const BPC_PUB_HOST = process.env.BPC_PUB_HOST;
const BPC_PUB_PORT = process.env.BPC_PUB_PORT;


const Boom = require('boom');
const Oz = require('oz');
const MongoDB = require('./mongo/mongodb_client');


// Here we are creating the app ticket
function loadAppFunc(id, callback) {
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
function loadGrantFunc(id, next) {
  MongoDB.collection('grants').findOne({id: id}, {fields: {_id: 0}}, function(err, grant) {
    if (err) {
      return next(err);
    } else if (grantIsMissingOrExpired(grant)) {
      next(Boom.unauthorized());
    } else {

      // TODO: Perhaps the app should define the default ticket expiration. See below.
      if (grant.exp === undefined || grant.exp === null) {
        grant.exp = Oz.hawk.utils.now() + (60000 * 60 * 24); // 60000 = 1 minute
      }

      // We're adding the application scope to the ticket.

      MongoDB.collection('applications').findOne({ id: grant.app }, { fields: { _id: 0, scope: 1 } }, function(err, app){
        if (err) {
          return next(err);
        }

        // TODO: Perhaps the app should override the default ticket expiration, if the grant has not expiration. See above.

        // Adding all the missing app scopes to the ticket - unless they are and admin:scope
        // Note: We want the scope "admin" (reserved scope of the console app) to be added to the ticket.
        var missingScopes = app.scope.filter(function (appScope){
          return appScope.indexOf('admin:') === -1 && grant.scope.indexOf(appScope) === -1;
        });

        grant.scope = grant.scope.concat(missingScopes);

        // // Finding private details to encrypt in the ticket for later usage.
        MongoDB.collection('users').findOne({id: grant.user}, {fields: {_id: 0, email: 1, id: 1, dataScopes: 1}}, function(err, user){
          if (err) {
            return next(err);
          } else if (user === null) {
            // return next(new Error('Unknown user'));
            next(null, grant);
          } else {
            next(null, grant, {public: {}, private: user});
          }
        });
      });
    }
  });
};


module.exports.strategyOptions = {
  oz: {
    encryptionPassword: ENCRYPTIONPASSWORD,
    loadAppFunc: loadAppFunc,
    loadGrantFunc: loadGrantFunc,
    hawk: {
      // Optional:
      // Used to override the host and port for validating request in case the host or port is changed by a proxy eg. behind an ELB.
      host: BPC_PUB_HOST,
      port: BPC_PUB_PORT
    }
  },
  urls: {
    app: '/ticket/app',
    reissue: '/ticket/reissue',
    rsvp: '/ticket/user'
  }
};


module.exports.parseAuthorizationHeader = function (requestHeaderAuthorization, callback){
  var id = requestHeaderAuthorization.match(/id=([^,]*)/)[1].replace(/"/g, '');
  if (id === undefined || id === null || id === ''){
    return callback(Boom.unauthorized('Authorization Hawk ticket not found'));
  }

  Oz.ticket.parse(id, ENCRYPTIONPASSWORD, {}, callback);
}


function grantIsMissingOrExpired(grant){
  // var exp_conditions =  [{exp: { $exists: false }}, { exp: null },{ exp: {$lt: Oz.hawk.utils.now() }}];
  return grant === undefined || grant === null || (grant.exp !== undefined && grant.exp !== null && grant.exp < Oz.hawk.utils.now());
}
