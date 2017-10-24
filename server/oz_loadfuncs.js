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
const Permissions = require('./permissions/permissions');


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
    } else if (grant === undefined || grant === null) {
      next(Boom.unauthorized());
    } else if (grantIsExpired(grant)) {
      next(Boom.unauthorized());
    } else {

      MongoDB.collection('applications').findOne({ id: grant.app }, { fields: { _id: 0, scope: 1, settings: 1 } })
      .then(app => {

        let ticketDuration = app.settings && app.settings.ticketDuration
          // The app can set the default ticket duration.
          ? (60000 * app.settings.ticketDuration)
          // Default ticket expiration (60000 = 1 minute)
          : (60000 * 60); // = One hour

        let ticketExpiration = Oz.hawk.utils.now() + ticketDuration;

        // If the users grant does not have an expiration
        //   or if grant expires later than the calculated ticket expiration
        // Else we can just keep the grant/ticket expiration as-is
        if (!grant.exp || ticketExpiration < grant.exp) {
          grant.exp = ticketExpiration;
        }

        // Adding all the missing app scopes to the ticket - unless they are and admin:scope
        // Note: We want the scope "admin" (reserved scope of the console app) to be added to the ticket.
        var missingScopes = app.scope.filter(function (appScope){
          return appScope.indexOf('admin:') === -1 && grant.scope.indexOf(appScope) === -1;
        });

        grant.scope = grant.scope.concat(missingScopes);


        // Finding scope data to encrypt in the ticket for later usage.
        if (app.settings && app.settings.includeScopeInPrivatExt) {

          Permissions.get(grant)
          .then(user => {
            if (user === null) {
              // next(new Error('Unknown user'));
              next(null, grant);
            } else {
              let ext = { public: {}, private: user.dataScopes };
              next(null, grant, ext);
            }
          })
          .catch(err => {
            next(err);
          });

        } else {

          next(null, grant);

        }
      })
      .catch(err => {
        next(err);
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


module.exports.grantIsExpired = function (grant) {
  return (
    grant !== undefined &&
    grant !== null &&
    grant.exp !== undefined &&
    grant.exp !== null &&
    grant.exp < Oz.hawk.utils.now()
  );
};

const grantIsExpired = module.exports.grantIsExpired;
