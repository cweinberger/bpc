/* jshint node: true */
'use strict';

const Boom = require('boom');
const MongoDB = require('./../mongo/mongodb_client');


module.exports.queryPermissionsScope = function(selector, scope, callback) {
  var queryProject = {
    _id: 0
  };
  queryProject['dataScopes.'.concat(scope)] = 1;

  MongoDB.collection('users').findOne(
    selector,
    queryProject
    , function (err, result){
      if (err) {
        console.error(err);
        return callback(err);
      }

      if (!result) {
        callback(Boom.notFound());
      }
      else {
        callback(null, result.dataScopes[scope]);
      }
    }
  );
};


module.exports.setPermissionsScope = function(selector, scope, payload, callback) {

  let set = {};

  Object.keys(payload).forEach(function(key){
    set['dataScopes.'.concat(scope,'.', key)] = payload[key];
  });

  let setOnInsert = {
    createdAt: new Date()
  };

  if (MongoDB.isMock) {
    // We're adding the selector data to the set data from selector.
    // This is needed when we're inserting (upsert), so we have the values
    var dataScopes = {};
    dataScopes[scope] = payload;
    set = Object.assign({}, selector, {
      dataScopes: dataScopes
    });
    delete set.deletedAt;
    Object.assign(setOnInsert, set);
  }


  MongoDB.collection('users').update(
    selector,
    {
      $currentDate: { 'lastUpdated': { $type: "date" } },
      $set: set,
      $setOnInsert: setOnInsert
    },
    {
      upsert: true,
      // We're update multi because when updating using {provider}/{email} endpoint e.g. gigya/dako@berlingskemedia.dk
      //   there is a possibility that the user was deleted and created in Gigya with a new UID.
      //   In this case we have multiple user-objects in BPC. So to be safe, we update them all so nothing is lost.
      multi: true
      //  writeConcern: <document>, // Perhaps using writeConcerns would be good here. See https://docs.mongodb.com/manual/reference/write-concern/
      //  collation: <document>
    },
    function(err, result){
      if (err){
        console.error(err);
        callback(Boom.internal('Database error', err));
      } else if (result === null) {
        callback(Boom.notFound());
      } else {
        callback({'status': 'ok'});
      }
    }
  );
};
