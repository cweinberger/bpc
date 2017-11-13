/* jshint node: true */
'use strict';

const Boom = require('boom');
const MongoDB = require('./../mongo/mongodb_client');


module.exports.get = function({user, scope}) {

  if (!user || !scope) {
    return Promise.reject('user or scope missing');
  }

  let selector = {
    $or: [
      { email: user.toLowerCase() },
      { id: user }
    ]
  };

  let projection = {
    _id: 0,
  };

  // The details must only be the dataScopes that are allowed for the application.
  if (MongoDB.isMock) {
    // Well, mongo-mock does not support projection of sub-documents
  } else {
    if (scope instanceof Array) {
      scope.forEach(scopeName => {
        projection['dataScopes.'.concat(scopeName)] = 1;
      });
    } else if(typeof scope === 'string'){
      projection['dataScopes.'.concat(scope)] = 1;
    }
  }

  return MongoDB.collection('users')
  .findOne(selector, projection)
  .then(user => {
    if (user === null){
      return Promise.resolve(Boom.notFound());
    } else if (user.dataScopes === undefined || user.dataScopes === null) {
      return Promise.resolve({});
    } else {
      return Promise.resolve(user.dataScopes);
    }

  })
  .catch(err => Boom.badRequest());
};


module.exports.set = function({user, scope, payload}) {

  let selector = {
    $or: [
      { email: user.toLowerCase() },
      { id: user }
    ]
  };


  let set = {};

  // We are setting both 'id' and 'email' to the 'user'.
  // When the user registered with e.g. Gigya, the webhook notification will update 'id' to UID.
  let setOnInsert = {
    id: user,
    email: user.toLowerCase(),
    createdAt: new Date()
  };


  if (MongoDB.isMock) {

    set.dataScopes = {};
    set.dataScopes[scope] = payload;

    // We are adding the $set onto $setOnInsert
    //   because apparently mongo-mock does not use $set when inserting (upsert=true)
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


  return MongoDB.collection('users')
  .update(
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
    }
  )
  .catch(err => Boom.badRequest());
};


module.exports.update = function({user, scope, payload}) {

  let selector = {
    $or: [
      { email: user.toLowerCase() },
      { id: user }
    ]
  };

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

  return MongoDB.collection('users')
  .findOneAndUpdate(
    selector,
    operators,
    {
      projection: projection,
      returnOriginal: false
    }
  )
  .catch(err => Boom.badRequest());

  function disallowedUpdateOperators(operator) {
    return [
      "$setOnInsert",
      "$isolated",
      "$pushAll"
    ].indexOf(operator) === -1;
  }
};
