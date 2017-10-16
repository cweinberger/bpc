/* jshint node: true */
'use strict';

const Boom = require('boom');
const Gigya = require('./../gigya/gigya_client');
const MongoDB = require('./../mongo/mongodb_client');
const EventLog = require('./../audit/eventlog');


// Used by /rsvp (createRsvp)
// But should not be nessecary after going full webhooks
module.exports.upsertUserId = function({id, email, provider}) {

  const query = {
    $or: [
      {
        id: id
      },
      {
        email: email,
        provider: provider,
        deletedAt: { $exists: false }
      }
    ]
  };

  const set = {
    id: id,
    email: email.toLowerCase(),
    provider: provider
  };

  let setOnInsert = {
    createdAt: new Date(),
    dataScopes: {}
  };

  // mongo-mock does not do upset the same way as MongoDB.
  // $set is ignored when doing upsert in mongo-mock
  if (MongoDB.isMock) {
    setOnInsert = Object.assign(setOnInsert, set);
  }



  return MongoDB.collection('users').update(
    query,
    {
      $currentDate: { 'lastUpdated': { $type: "date" } },
      $set: set,
      $setOnInsert: setOnInsert
      // We want to update id, email and provider in case we're missing one of the parameters
    },
    {
      upsert: true
    }
  );
};



// TODO: Set deletedAt timestamp enough? Or should we do more? Eg. expire grants?
module.exports.deleteUserId = function({id}){
  return MongoDB.collection('users')
  .update({ id: id },{ $set: { deletedAt: new Date() } });
};


module.exports.getDataScopes = function({user, scope}) {

  if (!user || !scope) {
    return Promise.reject('user or scope missing');
  }

  let projection = {
    _id: 0,
  };
  // The details must only be the dataScopes that are allowed for the application.
  scope.forEach(scopeName => {
    projection['dataScopes.'.concat(scopeName)] = 1;
  });

  return MongoDB.collection('users').findOne({email: user}, projection);
};
