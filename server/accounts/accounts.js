/* jshint node: true */
'use strict';


const GigyaAccounts = require('./../gigya/gigya_accounts');
const GigyaUtils = require('./../gigya/gigya_utils');
const MongoDB = require('./../mongo/mongodb_client');
const EventLog = require('./../audit/eventlog');


module.exports = {
  register,
  deleteOne
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
      lastLogin: new Date(data.lastLoginTimestamp),
      lastUpdated: new Date(data.lastUpdatedTimestamp),
      registered: new Date(data.registedTimestamp),
    },
    lastUpdated: new Date(),
    lastSynced: new Date(),
    dataScopes: {}
  };

}