/* jshint node: true */
'use strict';

const Boom = require('boom');
const MongoDB = require('./../mongo/mongodb_client');


module.exports.get = function({user, scope}) {

  if (!user || !scope) {
    return Promise.reject(Boom.badRequest('user or scope missing'));
  }

  const filter = {
    $or: [
      { email: user.toLowerCase() },
      { id: user },
      { 'gigya.UID': user }
    ]
  };

  const update = {
    $currentDate: {
      'lastFetched': { $type: "date" }
    }
  };

  let projection = {
    _id: 0
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
    } else {
      projection['dataScopes'] = 0;
    }
  }

  const options = {
    projection: projection
  };

  return MongoDB.collection('users').findOneAndUpdate(filter, update, options)
  .then(result => {
    if (result.n === 0 || result.value === null) {
      return Promise.reject(Boom.notFound());
    }

    const user = result.value;

    if (user.dataScopes === undefined || user.dataScopes === null) {
      return Promise.resolve({});
    } else {
      return Promise.resolve(user.dataScopes);
    }

  });
};


module.exports.count = function({user, scope}, query) {

  if (!user || !scope) {
    return Promise.reject(Boom.badRequest('user or scope missing'));
  }

  if (typeof scope !== 'string') {
    return Promise.reject(Boom.badRequest('scope must be a string'));
  }

  let filter = {
    $or: [
      { email: user.toLowerCase() },
      { id: user },
      { 'gigya.UID': user }
    ]
  };

  Object.keys(query).forEach(key => {
    try {
      filter['dataScopes.'.concat(scope,".",key)] = JSON.parse(query[key]);
    } catch(ex) {
      filter['dataScopes.'.concat(scope,".",key)] = query[key];
    }
  });

  return MongoDB.collection('users').count(filter, {limit: 1});

};


module.exports.set = function({user, scope, payload}) {

  if (!user || !scope) {
    return Promise.reject(Boom.badRequest('user or scope missing'));
  }

  const filter = {
    $or: [
      { email: user.toLowerCase() },
      { id: user },
      { 'gigya.UID': user }
    ]
  };


  let set = {};

  // We are setting both 'id' and 'email' to the 'user'.
  // When the user registered with e.g. Gigya, the webhook notification will update 'id' to UID.
  let setOnInsert = {
    id: user,
    email: user.toLowerCase(),
    createdAt: new Date()
    // expiresAt: new Date(new Date().setMonth(new Date().getMonth() + 6)) // - in 6 months
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

  const update = {
    $currentDate: {
      'lastUpdated': { $type: "date" }
    },
    $set: set,
    $setOnInsert: setOnInsert
  };

  const options = {
    upsert: true
    //  writeConcern: <document>, // Perhaps using writeConcerns would be good here. See https://docs.mongodb.com/manual/reference/write-concern/
    //  collation: <document>
  };

  return MongoDB.collection('users').updateOne(filter, update, options);

};


module.exports.update = function({user, scope, payload}) {

  if (!user || !scope) {
    return Promise.reject(Boom.badRequest('user or scope missing'));
  }

  const filter = {
    $or: [
      { email: user.toLowerCase() },
      { id: user },
      { 'gigya.UID': user }
    ]
  };

  let update = {
    '$currentDate': {}
  };

  Object.keys(payload).filter(disallowedUpdateOperators).forEach(operator => {
    update[operator] = {};
    Object.keys(payload[operator]).forEach(field => {
      update[operator]['dataScopes.'.concat(scope,'.',field)] = payload[operator][field];
    });
  });

  // This must come after payload to make sure it cannot be set by the application
  update['$currentDate']['lastUpdated'] = { $type: "date" };

  let projection = {
    _id: 0
  };
  projection['dataScopes.'.concat(scope)] = 1;

  const options = {
    projection: projection,
    returnOriginal: false
  };

  return MongoDB.collection('users').findOneAndUpdate(filter, update, options);

  function disallowedUpdateOperators(operator) {
    return [
      "$setOnInsert",
      "$isolated",
      "$pushAll"
    ].indexOf(operator) === -1;
  }
};
