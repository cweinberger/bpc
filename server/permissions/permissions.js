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

      findPermissions({
        user: ticket.user,
        scope: request.params.scope,
        scopeProjection: request.query
      })
      .then(dataScopes => reply(dataScopes[request.params.scope]
        ? dataScopes[request.params.scope]
        : {}))
      .catch(err => reply(err));

    } else {

      if (ticket.ext.private === undefined || ticket.ext.private.dataScopes[request.params.scope] === undefined){
        reply(Boom.forbidden());
      }

      // We only want to reply the permissions within the requested scope
      var scopePermissions = Object.assign({}, ticket.ext.private.dataScopes[request.params.scope]);

      reply(scopePermissions);
    }
  },

  
  // Getting all the scopes that the ticket allows
  getPermissionsUserAllScopes: function(request, reply) {
    const ticket = request.auth.credentials;

    findPermissions({
      user: request.params.user,
      scope: ticket.scope
    })
    .then(reply)
    .catch(reply);
  },


  getPermissionsUserScope: function(request, reply) {

    findPermissions({
      user: request.params.user,
      scope: request.params.scope,
      scopeProjection: request.query
    })
    .then(dataScopes => {
      reply(dataScopes[request.params.scope]
        ? dataScopes[request.params.scope]
        : {}
      );
    })
    .catch(err => reply(err));
  },


  postPermissionsUserScope: function(request, reply) {

    const input_is_email = Joi.validate({ email: request.params.user }, { email: Joi.string().email() });

    // DENNNE HVIS user ER EN EMAIL
    if(input_is_email.error === null) {

      MongoDB.collection('applications')
      .findOne(
        { id: request.auth.credentials.app },
        { fields: { 'settings.provider': 1 } })
      .then(res => {

        const provider = res.settings && res.settings.provider
          ? res.settings.provider
          : 'gigya';

        setPermissions({
          user: request.params.user,
          scope: request.params.scope,
          permissions: request.payload,
          provider: provider,
          useProviderEmailFilter: true
        })
        .then(result => replyResult(result))
        .catch(err => reply(err));

      });

    } else {

      setPermissions({
        user: request.params.user,
        scope: request.params.scope,
        permissions: request.payload,
        useProviderEmailFilter: false
      })
      .then(result => replyResult(result))
      .catch(err => reply(err));
    }

    function replyResult(result){
      if (result.result.n === 0) {
        reply(Boom.notFound());
      } else {
        reply({'status': 'ok'});
      }
    }
  },


  patchPermissionsUserScope: function(request, reply) {
    updatePermissions({
      user: request.params.user,
      scope: request.params.scope,
      permissions: request.payload
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




function findPermissions({user, scope, scopeProjection}) {

  if (!user || !scope) {
    return Promise.reject(Boom.badRequest('user or scope missing'));
  }

  const filter = stdFilter({ input: user });

  const update = {
    $currentDate: {
      'lastFetched': { $type: "date" }
    }
  };

  let projection = {
    _id: 0
  };

  // The details must only be the dataScopes that are allowed for the application.
  if (scope instanceof Array) {
    scope.forEach(scopeName => {
      projection['dataScopes.'.concat(scopeName)] = 1;
    });
  } else if(typeof scope === 'string'){
    if (scopeProjection && Object.keys(scopeProjection).length > 0) {

      const temp = Object.keys(scopeProjection).map(k => scopeProjection[k]);
      const anyInclusion = temp.some(v => v === 1);
      const anyExclusion = temp.some(v => v === 0);

      if(anyInclusion && anyExclusion) {
        return Promise.reject(Boom.badRequest('cannot have a mix of inclusion and exclusion'));
      }

      Object.keys(scopeProjection).forEach((key) => {
        projection[`dataScopes.${scope}.${key}`] = scopeProjection[key];
      });
    } else {
      projection['dataScopes.'.concat(scope)] = 1;
    }
  } else {
    projection['dataScopes'] = 0;
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


function setPermissions({user, scope, permissions, provider, useProviderEmailFilter}) {

  if (!user || !scope) {
    return Promise.reject(Boom.badRequest('user or scope missing'));
  }

  const filter = useProviderEmailFilter
    ? providerEmailFilter({ input: user, provider: provider })
    : stdFilter({ input: user });

  let set = {};

  Object.keys(permissions).forEach(function(field){
    set[`dataScopes.${scope}.${field}`] = permissions[field];
  });

  const valid_email = Joi.validate({ email: user }, { email: Joi.string().email() });

  // We are setting 'id' = 'user'.
  // When the user registered with e.g. Gigya, the webhook notification will update 'id' to UID.
  // Otherwise, getting an RSVP also updates the id to Gigya UID or Google ID
  const setOnInsert = {
    id: user.toLowerCase(),
    email: valid_email.error === null ? user.toLowerCase() : null,
    provider: provider,
    createdAt: new Date()
    // expiresAt: new Date(new Date().setMonth(new Date().getMonth() + 6)) // - in 6 months
  };

  const update = {
    $currentDate: { 'lastUpdated': { $type: "date" } },
    $set: set,
    $setOnInsert: setOnInsert
  };

  // If the user does not exists, the response should be a 404. But we have upsert because of legacy support.
  // But logic could be changed to only have upsert when the user param is an email (useProviderEmailFilter === true).
  const options = {
    upsert: useProviderEmailFilter
    //  writeConcern: <document>, // Perhaps using writeConcerns would be good here. See https://docs.mongodb.com/manual/reference/write-concern/
    //  collation: <document>
  };

  return MongoDB.collection('users')
  .updateOne(filter, update, options);
};


function updatePermissions({user, scope, permissions}) {

  if (!user || !scope) {
    return Promise.reject(Boom.badRequest('user or scope missing'));
  }

  const filter = stdFilter({ input: user });

  let update = {
    '$currentDate': {}
  };

  Object.keys(permissions)
  .filter(disallowedUpdateOperators)
  .forEach(operator => {
    update[operator] = {};
    Object.keys(permissions[operator]).forEach(field => {
      update[operator]['dataScopes.'.concat(scope,'.',field)] = permissions[operator][field];
    });
  });

  // This must come after permissions to make sure it cannot be set by the application
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


function stdFilter({input}){
  // We only allow filter by fields _id and id - not field email.
  return ObjectID.isValid(input)
  ? { _id: new ObjectID(input) }
  : { $or:
      [
        { id: input },
        // In case the user was created using POST /permissions/THIRD_USER@berlingskemedia.dk and still not logged in,
        //  user.id would be an email (and some requests from KU uses uppercase letters in {email})
        { id: input.toLowerCase() }
      ]
    };
}


function providerEmailFilter({input, provider}){
  return { $and:
    [
      { $or:
        [
          { provider: { $eq: provider }},
          { provider: { $exists: false }}
        ]
      },
      { $or:
        [
          { id: input },
          { id: input.toLowerCase() },
          { email: input.toLowerCase() }
        ]
      }
    ]
  };
}
