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

  let gettingGrant;

  if (id.startsWith('agid::')) {
    gettingGrant = parseAgid(id);
  } else {
    gettingGrant = findGrant(id);
  }

  gettingGrant
  .then(grant => validateGrant(grant))
  .then(grant => {
    return findApplication(grant.app)
    .then(app => {
      return Promise.all([
        extendGrant(grant, app),
        buildExt(grant, app)
      ])
      .then(result => {
        next(null, result[0], result[1]);
      })
    })
    .catch(err => next);
  })
  .catch(err => next);
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


function parseAgid(id){
  return new Promise((resolve, reject) => {
    try {
      let grant = JSON.parse(new Buffer(id.replace('agid::', ''), 'base64'));
      grant.id = id;
      resolve(grant);
    } catch (ex) {
      reject(ex);
    }
  });
}


function findApplication(id){
  return MongoDB.collection('applications').findOne({ id: id }, { fields: { _id: 0, scope: 1, settings: 1 } });
}


function findGrant(id){
  return MongoDB.collection('grants').findOne({id: id}, {fields: {_id: 0}});
}


function validateGrant(grant){
  if (grant === undefined || grant === null) {
    return Promise.reject(Boom.unauthorized());
  } else if (grantIsExpired(grant)) {
    return Promise.reject(Boom.unauthorized());
  } else {
    return Promise.resolve(grant);
  }
}


function extendGrant(grant, app) {

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

  return Promise.resolve(grant);
}


function buildExt(grant, app){

  if (app.settings && app.settings.includeScopeInPrivatExt) {

    let ext = {
      public: {},
      private: {
        // collection: 'test'
      }
    };

    return Permissions.get(grant)
    .then(dataScopes => {
      if (dataScopes === null) {
        return Promise.resolve(null);
      } else {
        Object.assign(ext.private, dataScopes);
        return Promise.resolve(ext);
      }
    })
    .catch(err => {
      if (err.isBoom && err.output && err.output.statusCode === 404){
        return Promise.resolve(null);
      } else {
        return Promise.reject(err);
      }
    });

  } else {

    return Promise.resolve(null);

  }
}
