/*jshint node: true */
'use strict';

const Boom = require('boom');
const Oz = require('oz');
const MongoDB = require('./mongodb_client');

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

      // We're adding the application scope to the ticket.

      MongoDB.collection('applications').findOne({ id: grant.app }, { fields: { _id: 0, scope: 1 } }, function(err, app){
        if (err) {
          return next(err);
        }

        // Adding all the missing app scopes to the ticket - unless they are and admin:scope
        var missingScopes = app.scope.filter(function (appScope){
          return appScope.indexOf('admin:') === -1 && grant.scope.indexOf(appScope) === -1;
        });
console.log('missingScopes', missingScopes);
        grant.scope = grant.scope.concat(missingScopes);

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
      });
    }
  });
};
