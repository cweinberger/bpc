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


module.exports.parseAuthorizationHeader = function (requestHeaderAuthorization, callback) {

  return new Promise((resolve, reject) => {
    if(callback === undefined){
      callback = function(err, ticket) {
        if(err) {
          reject(err);
        } else {
          resolve(ticket);
        }
      };
    }

    var id = requestHeaderAuthorization.match(/id=([^,]*)/)[1].replace(/"/g, '');
    if (id === undefined || id === null || id === ''){
      return callback(Boom.unauthorized('Authorization Hawk ticket not found'));
    }

    Oz.ticket.parse(id, ENCRYPTIONPASSWORD, {}, callback);
  });
};


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



// Here we are creating the app ticket
function loadAppFunc(id, callback) {

  if(callback === undefined){
    callback = function(){};
  }

  return MongoDB.collection('applications')
  .findOne({id:id}, {fields: {_id: 0}})
  .then(app => {
    if (app === null){
      return callback(Boom.unauthorized('Unknown application'));
    }

    callback(null, app);
    return Promise.resolve(app);

    // // Dynamically adding the admin:{id} scope
    // app.scope.push('admin:'.concat(app.id));
    //
    // if(app.scope.indexOf('admin:*') > -1) {
    //
    //   // This is a superadmin app. So we find all the id's so we can add the admin:{id} scopes
    //   return MongoDB.collection('applications').find({ id:{ $ne: id }}, {_id: 0, id:1})
    //   .toArray()
    //   .then(otherApps => appendAllAdminScopes(app, otherApps))
    //   .then(app => {
    //     callback(null, app);
    //     return Promise.resolve(app);
    //   });
    //
    // } else {
    //
    //   callback(null, app);
    //   return Promise.resolve(app);
    //
    // }
    //
    // function appendAllAdminScopes(mainApp, apps){
    //   const adminScopes = apps.map(otherApp => 'admin:'.concat(otherApp.id));
    //   mainApp.scope = mainApp.scope.concat(adminScopes);
    //   return Promise.resolve(mainApp);
    // }
  })
  .catch(err => {
    callback(err);
    return Promise.reject(err);
  });
};


// Here we are creating the user ticket
function loadGrantFunc(id, next) {

  let gettingGrant;

  if (id.startsWith('agid**')) {
    gettingGrant = parseAgid(id);
  } else {
    gettingGrant = findGrant(id);
  }

  gettingGrant
  .then(grant => validateGrant(grant))
  .then(grant => {
    return loadAppFunc(grant.app)
    .then(app => {

      // We test the scope of the grant now, so we don't get the internal server error:
      // Boom.internal('Grant scope is not a subset of the application scope');
      // in oz/lib/ticket.js
      // Theoretically this should not occur. But errors can be made in the database.
      if(app.scope && grant.scope && !Oz.scope.isSubset(app.scope, grant.scope)) {
        return Promise.reject(Boom.unauthorized('Invalid grant scope'));
      }

      return Promise.all([

        setDuration(grant, app)
        .then(grant => addMissingScopes(grant, app)),

        buildExt(grant, app)

      ])
      .then(result => next(null, result[0], result[1]));
    })
    .catch(err => next(err));
  })
  .catch(err => next(err));
};


function parseAgid(id){
  return new Promise((resolve, reject) => {
    try {
      let grant = JSON.parse(new Buffer(id.replace('agid**', ''), 'base64'));
      grant.id = id;
      resolve(grant);
    } catch (ex) {
      reject(ex);
    }
  });
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


function setDuration(grant, app) {

  let ticketDuration = app.settings && app.settings.ticketDuration
    // The app can set the default ticket duration.
    ? (60000 * app.settings.ticketDuration)
    // Default ticket expiration (60000 = 1 minute)
    : (60000 * 60); // = One hour

  let ticketExpiration = Oz.hawk.utils.now() + ticketDuration;

  // If the users grant does not have an expiration
  //   or if grant expires later than the calculated ticket expiration
  if (!grant.exp || ticketExpiration < grant.exp) {
    grant.exp = ticketExpiration;
  } else {
    // Else we can just keep the grant/ticket expiration as-is
  }

  return Promise.resolve(grant);
}


function addMissingScopes(grant, app) {

  // Adding all the missing app scopes to the ticket - unless they are an admin:{id}
  // Note: But we want the scope "admin", which is a reserved scope of the console app, to be added.
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
