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

      if(request.query.id) {
        query = {
          $or: [
            { id: request.query.id },
            { 'gigya.UID': request.query.id }
          ]
        };
      } else if (request.query.email) {
        query = {
          $or: [
            { 'gigya.email': request.query.email },
            { email: request.query.email.toLowerCase() },
            { id: request.query.email }
          ]
        };
      } else if (request.query.UID) {
        query = {
          $or: [
            { 'gigya.UID': request.query.UID },
            { id: request.query.UID }
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
        if(result === null || !result.gigya) {
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
      case "accountLoggedIn":
      return accountLoggedInEventHandler(event);
      break;
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
  return getAccountInfo(event.data.uid)
  .then(result => upsertUser(result.body));
}


function accountUpdatedEventHandler(event) {
  return getAccountInfo(event.data.uid)
  .then(result => upsertUser(result.body));
}



function accountLoggedInEventHandler(event) {
  return getAccountInfo(event.data.uid)
  .then(result => upsertUser(result.body));
}


function accountDeletedEventHandler(event) {
  return deleteUser({ id: event.data.uid })
  .then(() => EventLog.logUserEvent(event.data.uid, 'Deleting user'))
  .catch(err => {
    EventLog.logUserEvent(event.data.uid, 'Deleting user Failed');
    console.error(err);
  });
}


function getAccountInfo(uid) {
  return Gigya.callApi('/accounts.getAccountInfo', {
    UID: uid,
    include: 'profile,emails'
  });
}


function upsertUser (accountInfo) {

  // We have cases where the profile does not have an email
  if (!accountInfo.profile || !accountInfo.profile.email){
    // We are resolving, because we don't need a lot of errors in the log because of these users.
    return Promise.resolve('User has no email');
  }

  const filter = {
    $or: [
      {
        // This will find the user if she/he has been created properly (eg. by this webhook handler)
        id: accountInfo.UID,
        provider: 'gigya'
      },
      {
        // This will find the user if it was created (upsert) from a POST /permissions/{email}
        id: accountInfo.profile.email.toLowerCase(),
        email: accountInfo.profile.email.toLowerCase(),
        $or: [
          { provider: 'gigya' }, // The usual/most records will have provider set.
          { provider: { $exists: false } } // But there's still some old records without provider.
          // These old records must be updated sooner or later
        ]
      },
    ]
  };

  const set = {
    id: accountInfo.UID,
    email: accountInfo.profile.email.toLowerCase(),
    provider: 'gigya',
    gigya: {
      UID: accountInfo.UID,
      loginProvider: accountInfo.loginProvider,
      // profile: accountInfo.profile,
      // emails: [].concat(accountInfo.emails.verified, accountInfo.emails.unverified),
      email: accountInfo.profile.email.toLowerCase()
    }
  };

  const setOnInsert = {
    createdAt: new Date(),
    dataScopes: {}
  };


  const update = {
    $currentDate: { 'lastUpdated': { $type: "date" } },
    $set: set,
    $setOnInsert: setOnInsert
  };

  // It's important to do the upsert operation.
  // Permissions can be created by other services, before the user was registered with gigya.
  // In this case we are adding gigya details to the existing user.
  const options = {
    upsert: true
  };

  return MongoDB.collection('users')
  .updateOne(filter, update, options);
};


function deleteUser ({ id }){

  const selector = {
    $or: [
      { id: id, provider: 'gigya' },
      { 'gigya.UID': id }
    ]
  };

  return MongoDB.collection('users')
  .findOneAndDelete(selector)
  .then(result => {

    if (result.ok !== 1) {
      return Promise.reject();
    }

    var user = result.value;

    var deleteGrants = MongoDB.collection('grants').remove({ user: user._id });

    user.deletedAt = new Date();
    var insertDeletedUser = MongoDB.collection('deleted_users').insert(user);

    return Promise.all([deleteGrants, insertDeletedUser]);
  });
};
