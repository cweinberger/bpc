/* jshint node: true */
'use strict';

const Boom = require('boom');
const Joi = require('joi');
const ObjectID = require('mongodb').ObjectID;
const MongoDB = require('./../mongo/mongodb_client');


module.exports = {

  findPermissions: findPermissions,

  getPermissions: function(request, reply) {
    const ticket = request.auth.credentials;

    findPermissions(ticket)
    .then(reply)
    .catch(reply);
  },

  getPermissionsScope: function(request, reply) {

    const ticket = request.auth.credentials;

    // Should we query the database or look in the private part of the ticket?
    // When the app setting includeScopeInPrivatExt is set to true, we can validate the users scope by looking in ticket.ext.private.
    // But we need to find out how we should handle any changes to the scope (by POST/PATCH). Should we then reissue the ticket with new ticket.ext.private?
    if (true) {

      if (Object.keys(request.query).length > 0) {

        countPermissions({
          user: ticket.user,
          scope: request.params.scope
        },
        request.query)
        .then(result => {
          if(result === 1) {
            reply({ status: 'OK' });
          } else {
            reply(Boom.notFound());
          }
        })
        .catch(err => reply(err));

      } else {

        findPermissions({
          user: ticket.user,
          scope: request.params.scope
        })
        .then(dataScopes => reply(dataScopes[request.params.scope]
          ? dataScopes[request.params.scope]
          : {}))
        .catch(err => reply(err));
      }


    } else {

      if (ticket.ext.private === undefined || ticket.ext.private.dataScopes[request.params.scope] === undefined){
        reply(Boom.forbidden());
      }

      // We only want to reply the permissions within the requested scope
      var scopePermissions = Object.assign({}, ticket.ext.private.dataScopes[request.params.scope]);

      reply(scopePermissions);
    }
  },

  getPermissionsUserScope: function(request, reply) {
// console.log('fdfdfd', request.auth.credentials.app);
    if (Object.keys(request.query).length > 0) {

      countPermissions(request.params, request.query)
      .then(result => {
        if(result === 1) {
          reply({ status: 'OK' });
        } else {
          reply(Boom.notFound());
        }
      })
      .catch(err => reply(err));

    } else {

      findPermissions(request.params)
      .then(dataScopes => reply(dataScopes[request.params.scope]
        ? dataScopes[request.params.scope]
        : {}))
      .catch(err => reply(err));

    }
  },

  postPermissionsUserScope: function(request, reply) {

    setPermissions(request.params, request.payload)
    .then(result => reply({'status': 'ok'}))
    .catch(err => reply(err));

  },

  patchPermissionsUserScope: function(request, reply) {

    updatePermissions({
      app: request.auth.credentials.app,
      user: request.params.user,
      scope: request.params.scope,
      payload: request.payload
    })
    .then(result => {
      if (result.value === null || result.n === 0) {
        reply(Boom.notFound());
      } else {
        reply(result.value.dataScopes[request.params.scope]);
      }
    })
    .catch(err => reply(Boom.badRequest(err.message)));
  }

};


function stdFilter(user){
  return ObjectID.isValid(user)
  ? { _id: new ObjectID(user) }
  : {
    $or: [
      { id: user },
      { id: user.toLowerCase() },
      { 'gigya.UID': user },
      { 'gigya.email': user.toLowerCase() },
      { email: user.toLowerCase() }
    ]
  };
}

function setPermissions({user, scope}, payload) {

  if (!user || !scope) {
    return Promise.reject(Boom.badRequest('user or scope missing'));
  }

  const filter = stdFilter(user);

  let set = {};

  const valid_email = Joi.validate({ email: user }, { email: Joi.string().email() });

  // We are setting 'id' = 'user'.
  // When the user registered with e.g. Gigya, the webhook notification will update 'id' to UID.
  let setOnInsert = {
    id: user.toLowerCase(),
    email: valid_email.error === null ? user.toLowerCase() : null,
    provider: null,
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
    $currentDate: { 'lastUpdated': { $type: "date" } },
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



function findPermissions({user, scope}) {

  if (!user || !scope) {
    return Promise.reject(Boom.badRequest('user or scope missing'));
  }

  const filter = stdFilter(user);

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

  return MongoDB.collection('users')
  .findOneAndUpdate(filter, update, options)
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


function countPermissions({user, scope}, query) {

  if (!user || !scope) {
    return Promise.reject(Boom.badRequest('user or scope missing'));
  }

  if (typeof scope !== 'string') {
    return Promise.reject(Boom.badRequest('scope must be a string'));
  }

  let filter = stdFilter(user);

  Object.keys(query).forEach(key => {
    try {
      filter['dataScopes.'.concat(scope,".",key)] = JSON.parse(query[key]);
    } catch(ex) {
      filter['dataScopes.'.concat(scope,".",key)] = query[key];
    }
  });

  return MongoDB.collection('users')
  .count(filter, {limit: 1});
};



function updatePermissions({app, user, scope, payload}) {

  if (!user || !scope) {
    return Promise.reject(Boom.badRequest('user or scope missing'));
  }

  const filter = stdFilter(user);

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

  return MongoDB.collection('users')
  .findOneAndUpdate(filter, update, options);

  function disallowedUpdateOperators(operator) {
    return [
      "$setOnInsert",
      "$isolated",
      "$pushAll"
    ].indexOf(operator) === -1;
  }
};
