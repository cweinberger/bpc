/* jshint node: true */
'use strict';

const Boom = require('boom');
const Gigya = require('./../gigya/gigya_client');
const MongoDB = require('./../mongo/mongodb_client');
const EventLog = require('./../audit/eventlog');


module.exports = {
  upsertUserId,
  deleteUserId
};



// Used by /rsvp (createRsvp)
// But should not be nessecary after going full webhooks
function upsertUserId({id, email, provider}, callback) {
  if (callback === undefined) {
    callback = function(err, result) {
      if (err) {
        console.error(err);
      }
    };
  }

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


  return new Promise((resolve, reject) => {

    MongoDB.collection('users').update(
      query,
      {
        $currentDate: { 'lastUpdated': { $type: "date" } },
        $set: set,
        $setOnInsert: setOnInsert
        // We want to update id, email and provider in case we're missing one of the parameters
      },
      { upsert: true },
      function(err, result) {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
        callback(err, result);
      }
    );
  });
}




// TODO: Set deletedAt timestamp enough? Or should we do more? Eg. expire grants?
function deleteUserId(id){
  return new Promise((resolve, reject) => {
    MongoDB.collection('users').update(
      { id: id },
      { $set: { deletedAt: new Date() } },
      function(err, result) {
        if (err) {
          console.error(err);
          reject(err);
        } else {
          resolve(result);
        }
      }
    );
  });
}
