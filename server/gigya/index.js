/*jshint node: true */
'use strict';


const Joi = require('joi');
const Boom = require('boom');
const Gigya = require('./../gigya/gigya_client');
const GigyaUtils = require('./../gigya/gigya_utils');
const MongoDB = require('./../mongo/mongodb_client');
const EventLog = require('./../audit/eventlog');


module.exports.register = function (server, options, next) {

  server.route({
    method: 'POST',
    path: '/notifications',
    config: {
      auth: false
    },
    handler: (request, reply) => {

      if (GigyaUtils.validNotificationRequest(request)){

        handleEvents(request.payload.events)
        .then(() => {
          // reply();
        })
        .catch((err) => {
          console.error(err);
          console.error('  when getting gigya notifications events', request.payload.events);
          // reply(Boom.badRequest());
        });

        reply();

      } else {

        reply(Boom.badRequest());

      }
    }
  });


  next();

};


module.exports.register.attributes = {
  name: 'gigya',
  version: '1.0.0'
};


function handleEvents(events){
  let p = [];

  events.forEach(event => {
    switch (event.type) {
      // Types of events:
      // accountCreated:
        // Account created - fired when a new account record is actually created in Gigya's database.
      // accountRegistered:
        // Account registered - fired when a user completes registration.
      // accountUpdated:
        // Account updated - fired when a user record is updated.
      // accountLoggedIn:
        // Account logged in - fired when a user logs in.
      // accountDeleted:
        // Account deleted - fired when an account is deleted.

      // case "accountCreated":
      //   accountCreatedEventHandler(event);
      //   break;
      case "accountRegistered":
        let a = accountRegisteredEventHandler(event);
        p.push(a);
        break;
      case "accountUpdated":
        let b = accountUpdatedEventHandler(event);
        p.push(b);
        break;
      // case "accountLoggedIn":
      //   accountLoggedInEventHandler(event);
      //   break;
      case "accountDeleted":
        let c = accountDeletedEventHandler(event);
        p.push(c);
        break;
      default:

    }
  });

  return Promise.all(p);

}


function accountCreatedEventHandler(event) {
  // Do nothing
  return Promise.resolve();
}


function accountRegisteredEventHandler(event) {
  return Gigya.callApi('/accounts.getAccountInfo', { UID: event.data.uid })
  .then(result => upsertUser(result.body));
}


function accountUpdatedEventHandler(event) {
  return Gigya.callApi('/accounts.getAccountInfo', { UID: event.data.uid })
  .then(result => upsertUser(result.body));
}


function accountLoggedInEventHandler(event) {
  // Do nothing
  return Promise.resolve();
}


function accountDeletedEventHandler(event) {
  return deleteUserId({ id: event.data.uid })
  .then(() => EventLog.logUserEvent(event.data.uid, 'Deleting user'))
  .catch(err => {
    EventLog.logUserEvent(event.data.uid, 'Deleting user Failed');
    console.error(err);
  });
}


function upsertUser (accountInfo) {

  let selector = {
    $or: [
      { email: accountInfo.profile.email.toLowerCase() },
      { id: accountInfo.UID }
    ]
  };

  let set = {
    id: accountInfo.UID,
    email: accountInfo.profile.email.toLowerCase(),
    gigya: {
      UID: accountInfo.UID,
      email: accountInfo.profile.email.toLowerCase()
    }
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

  const options = {
    upsert: true
  };

  return MongoDB.collection('users').update(selector, operators, options);
};



// TODO: Should we do more? Eg. expire grants?
function deleteUserId ({id}){

  return MongoDB.collection('users').findOneAndDelete({ id: id })
  .then(result => {
    let user = result.value;
    if (user === null) {
      return Promise.reject();
    }
    user.deletedAt = new Date();
    return MongoDB.collection('deleted_users').insert(user);
  });

};
