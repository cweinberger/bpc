/* jshint node: true */
'use strict';


const GigyaAccounts = require('./../gigya/gigya_accounts');
const GigyaUtils = require('./../gigya/gigya_utils');
const MongoDB = require('./../mongo/mongodb_client');

module.exports = {
  register
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
    return MongoDB.collection('users').insert(_user).then(res => res.ops[0]);

  }, err => {

    if (err.output.payload && err.output.payload[0].errorCode === 400003) {
      // Email exists. Check if account exists in Gigya.
      return GigyaAccounts.searchAccount(
        `SELECT * FROM accounts WHERE profile.email = "${user.email}"`
      ).then(res => {

        if (res.objectsCount > 1) {
          // TODO: Perhaps do account linking here if there is more than one?
          return Promise.reject(new Error(
            `Gigya already has ${res.objectsCount} accounts with that email address`
          ));
        }

        const _user = assembleDbUser(res.body.results[0]);

        return MongoDB.collection('users')
          .findOneAndUpdate({id: _user.id}, {$set: _user}, {
            upsert: true,
            returnOriginal: false
          })
          .then(res => res.value);

      });
    } else {
      return Promise.reject(err);
    }

  });

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