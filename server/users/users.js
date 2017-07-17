/* jshint node: true */
'use strict';

const Boom = require('boom');
const GigyaAccounts = require('./../gigya/gigya_accounts');
const GigyaUtils = require('./../gigya/gigya_utils');
const MongoDB = require('./../mongo/mongodb_client');
const EventLog = require('./../audit/eventlog');


module.exports = {
  register,
  update,
  updateUserId,
  updateUserInDB
};


/**
 * Registers a new account with Gigya and stores the user in MongoDB
 *
 * @param {Object} user
 * @return {Promise} Receives the created user is the operation went well
 */
function register(user) {

  return GigyaAccounts.registerUser(user).then(data => {

    const _user = assembleDbUser(data.body);
    // Create user and provide the user object to the resolved promise.
    return MongoDB.collection('users').insert(_user)
      .then(res => res.ops[0])
      .then(res => {
        EventLog.logUserEvent(res.id, 'User registered');
        return res;
      });

  }, err => {
    EventLog.logUserEvent(null, 'User registration failed', {email: user.email});
    return Promise.reject(err);
  });

  /**
   * Picks the data from a Gigya account that we have chosen to store in MongoDB
   */
  function assembleDbUser(data) {
    return {
      email: data.profile.email,
      id: data.UID,
      provider: 'gigya',
      providerData: {
        loginProvider: data.loginProvider,
        isActive: data.isActive,
        isLockedOut: data.isLockedOut,
        isVerified: data.isVerified,
        profile: data.profile,
        data: data.data ? data.data : {},
        lastLogin: new Date(data.lastLoginTimestamp),
        lastUpdated: new Date(data.lastUpdatedTimestamp),
        registered: new Date(data.registedTimestamp),
      },
      lastUpdated: new Date(),
      lastLogin: new Date(),
      lastSynced: new Date(),
      dataScopes: {}
    };

  }

}

/**
 * Updates account with Gigya and updates the user in MongoDB
 *
 * @param {Object} user
 * @return {Promise} Receives the created user is the operation went well
 */
function update(user) {

  return GigyaAccounts.setAccountInfo(user).then(data => {

    // const _user = assembleDbUser(data.body);
    // // Update user.
    // return MongoDB.collection('users').update(_user)
    //   .then(res => res.ops[0])
    //   .then(res => {
    //     EventLog.logUserEvent(res.id, 'User Updated');
    //     return res;
    //   });
    return {status: 'ok'};

  }, err => {
    EventLog.logUserEvent(null, 'User update failed', {email: user.email});
    return Promise.reject(err);
  });

}


function updateUserInDB(data, callback) {

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
        id: data.id
      },
      {
        provider: data.provider,
        email: data.email
      }
    ]
  };

  MongoDB.collection('users').update(query, {
    $setOnInsert: {
      dataScopes: {}
    },
     // We want to update id, email and provider in case we're missing one of the parameters
    $set: data,
    $currentDate: {
      'lastLogin': { $type: "date" }
    }
  }, {
    upsert: true
  }, callback);

}


/**
 * Updates user Id if it doesn't exist
 * @param user
 * @return Promise
 */
function updateUserId({id, email}) {
  if (id !== undefined) {
    return Promise.resolve(id);
  }

  return GigyaAccounts.getUID(email)
    .then((id) => {
      MongoDB.collection('users').update({email}, {
        $set: {id}
      });

      return id;
    });
}


function deleteUserId({id, provider}){
  return MongoDB.collection('users').update(
    { id: id },
    { $set: { deletedAt: new Date() } }
  );
}
