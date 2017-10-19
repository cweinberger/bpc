/* jshint node: true */
'use strict';

const Boom = require('boom');
const Gigya = require('./../gigya/gigya_client');
const MongoDB = require('./../mongo/mongodb_client');
const EventLog = require('./../audit/eventlog');


module.exports.upsertUserId = function({id, email, provider}) {

  let selector = {
    $or: [
      { id: id },
      { email: email }
    ],
    deletedAt: { $exists: false }
  };

  let set = {
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

  let operators = {
    $currentDate: { 'lastUpdated': { $type: "date" } },
    $set: set,
    $setOnInsert: setOnInsert
  };

  return MongoDB.collection('users').update(
    selector,
    operators,
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
