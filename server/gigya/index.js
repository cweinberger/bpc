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
    method: 'GET',
    path: '/',
    config: {
      auth: {
        access: {
          entity: 'app'
        }
      },
      validate: {
        query: Joi.object().keys({
          id: Joi.string(),
          email: Joi.string(),
          UID: Joi.string()
        }).xor('id', 'email', 'UID') // <-- Only one is required + allowed
      }
    },
    handler: function(request, reply) {
      let query;

      // These are a lot of mixed keys.
      // I'm am in the transition of moving the keys.
      // So this is to be backwards compatible

      if(request.query.id){
        query = {
          $or: [
            { id: request.query.id },
            { email: request.query.id }
          ]
        };
      } else if (request.query.email){
        let email = request.query.email.toLowerCase();
        query = {
          $or: [
            { id: email },
            { email: email }
          ]
        };
      } else if (request.query.UID){
        query = {
          $or: [
            { id: request.query.UID },
            { 'gigya.UID': request.query.UID }
          ]
        };
      } else {
        // Based on the Joi validation, this "else" should not be possible
        return reply(Boom.badRequest());
      }

      const projection = {
        _id: 0,
        gigya: 1
      };

      MongoDB.collection('users')
      .findOne(query, projection)
      .then(result => {
        if(result === null) {
          reply(Boom.notFound());
        } else {
          reply(result.gigya);
        }
      })
      .catch((err) => {
        reply(Boom.badRequest());
      });
    }
  });

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
  let completed = 0;

  return new Promise((resolve, reject) => {

    // We are doing this recursive because we want event event to be completed
    //  before doing the next.
    // Also multiple idential events might occur in the notifications.

    dothisthis(events);


    function dothisthis(events){
      handleEvent(events[completed])
      .then(() => {
        if(++completed === events.length){
          return resolve();
        }
        dothisthis(events);
      });
    }

  });

  function handleEvent(event){

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
      return accountRegisteredEventHandler(event);
      break;
      case "accountUpdated":
      return accountUpdatedEventHandler(event);
      break;
      // case "accountLoggedIn":
      //   accountLoggedInEventHandler(event);
      //   break;
      case "accountDeleted":
      return accountDeletedEventHandler(event);
      break;
      default:
        return Promise.resolve();
    }
  }
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
  return deleteUser({ id: event.data.uid })
  .then(() => EventLog.logUserEvent(event.data.uid, 'Deleting user'))
  .catch(err => {
    EventLog.logUserEvent(event.data.uid, 'Deleting user Failed');
    console.error(err);
  });
}


function upsertUser (accountInfo) {

  const selector = {
    $or: [
      { id: accountInfo.profile.email.toLowerCase() },
      { email: accountInfo.profile.email.toLowerCase() },
      { id: accountInfo.UID }
    ]
  };

  const set = {
    gigya: {
      UID: accountInfo.UID,
      email: accountInfo.profile.email.toLowerCase()
    }
  };

  let setOnInsert = {
    id: accountInfo.profile.email.toLowerCase(),
    email: accountInfo.profile.email.toLowerCase(),
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
function deleteUser ({ id }){

  const selector = {
    $or: [
      { 'gigya.UID': id },
      { id: id }
    ]
  };

  return MongoDB.collection('users').findOneAndDelete(selector)
  .then(result => {
    let user = result.value;
    if (user === null) {
      return Promise.reject();
    }
    user.deletedAt = new Date();
    return MongoDB.collection('deleted_users').insert(user);
  });

};
