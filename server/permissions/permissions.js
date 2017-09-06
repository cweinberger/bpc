/* jshint node: true */
'use strict';

const Boom = require('boom');
const MongoDB = require('./../mongo/mongodb_client');


module.exports.queryPermissionsScope = function(selector, scope, callback) {
  var projection = {
    _id: 0
  };
  projection['dataScopes.'.concat(scope)] = 1;

  MongoDB.collection('users').findOne(
    selector,
    projection
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

  } else {

    Object.keys(payload).forEach(function(field){
      set['dataScopes.'.concat(scope,'.',field)] = payload[field];
    });

  }

  let operators = {
    $currentDate: { 'lastUpdated': { $type: "date" } },
    $set: set,
    $setOnInsert: setOnInsert
  };


  MongoDB.collection('users').update(
    selector,
    operators,
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
        callback(Boom.badImplementation(err.message));
      } else if (result === null) {
        callback(Boom.notFound());
      } else {
        callback({'status': 'ok'});
      }
    }
  );
};


module.exports.updatePermissionsScope = function(selector, scope, payload, callback) {

  let operators = {
    '$currentDate': {}
  };


  Object.keys(payload).filter(disallowedUpdateOperators).forEach(operator => {
    operators[operator] = {};
    Object.keys(payload[operator]).forEach(field => {
      operators[operator]['dataScopes.'.concat(scope,'.',field)] = payload[operator][field];
    });
  });

  // This must come after payload to make sure it cannot be set by the application
  operators['$currentDate']['lastUpdated'] = { $type: "date" };

  var projection = {
    _id: 0
  };
  projection['dataScopes.'.concat(scope)] = 1;

  MongoDB.collection('users').findOneAndUpdate(
    selector,
    operators,
    {
      projection: projection,
      returnOriginal: false
    },
    function(err, result){
      if (err){
        console.error(err);
        // We are replying with badRequest here, because it's propably and error in the operators in the request.
        callback(Boom.badRequest(err.message));
      } else if (result === null) {
        callback(Boom.notFound());
      } else {
        callback(result.value.dataScopes[scope]);
      }
    }
  );

  function disallowedUpdateOperators(operator) {
    return [
      "$setOnInsert",
      "$isolated",
      "$pushAll"
    ].indexOf(operator) === -1;
  }
};
