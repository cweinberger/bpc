/* jshint node: true */
'use strict';


const GigyaAccounts = require('./../gigya/gigya_accounts');
const GigyaUtils = require('./../gigya/gigya_utils');
const MongoDB = require('./../mongo/mongodb_client');
const EventLog = require('./../audit/eventlog');


module.exports = {
  register,
  deleteOne,
  update
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

}

/**
 * Updates account with Gigya and updates the user in MongoDB
 *
 * @param {Object} user
 * @return {Promise} Receives the created user is the operation went well
 */
function update(user) {

  return GigyaAccounts.setAccountInfo(user).then(data => {

    const _user = assembleDbUser(data.body);
    // Update user.
    return MongoDB.collection('users').update(_user)
      .then(res => res.ops[0])
      .then(res => {
        EventLog.logUserEvent(res.id, 'User Updated');
        return res;
      });

  }, err => {
    EventLog.logUserEvent(null, 'User update failed', {email: user.email});
    return Promise.reject(err);
  });

}

/**
 * Deletes a single account from Gigya, and marks the local one as deleted
 * 
 * @param {String} Gigya user id 
 */
function deleteOne(id) {

  return GigyaAccounts.deleteAccount(id).then(data => {

    EventLog.logUserEvent(id, 'Deleting user');

    // TODO: Set deletedAt timestamp? Or should we do more?
    return MongoDB.collection('users')
      .findOneAndUpdate({id: id}, {$set: {deletedAt: new Date()}});

  }, err => Promise.reject(err));

}


/**
 * Picks the data from a Gigya account that we have chosen to store in MongoDB
 * 
 * @param {Object} Gigya data
 * @param {Object} Initial user data received to register
 * @return {Object} User object
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
    lastSynced: new Date(),
    dataScopes: {}
  };

}
