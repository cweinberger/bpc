/* jshint node: true */
'use strict';


const gigyaClient = require('./gigya_client');
const gigyaUtils = require('./gigya_utils');


module.exports = {
  getAccountInfo,
  setAccountInfo,
  exchangeUIDSignature,
  initRegistration,
  isEmailAvailable,
  searchAccount,
  linkAccounts,
  register,
  deleteAccount,
  getAccountSchema,
  setAccountSchema,
  registerUser,
  resetPassword
};


/**
 * Returns account information for the account with the given regToken or UID
 *
 * @see https://developers.gigya.com/display/GD/accounts.getAccountInfo+REST
 * @param {Object} Payload containing "regToken" or "UID"
 * @return {Promise}
 */
function getAccountInfo(payload) {

  var parameters = payload.regToken ?
  {
    regToken: payload.regToken
  } : {
    UID: payload.UID
    // UIDSignature: payload.UIDSignature,
    // signatureTimestamp: payload.signatureTimestamp
  };

  return gigyaClient.callApi('/ids.getAccountInfo', parameters);

}


/**
 * Updates account information for a single account
 *
 * @see https://developers.gigya.com/display/GD/accounts.setAccountInfo+REST
 * @param {Object} Account information to set/update
 * @return {Promise}
 */
function setAccountInfo(payload) {

  return gigyaClient.callApi('/accounts.setAccountInfo', payload);

}


/**
 * ???
 *
 * @see https://developers.gigya.com/display/GD/accounts.exchangeUIDSignature+REST
 * @param {Object}
 * @return {Promise}
 */

function exchangeUIDSignature(payload) {

  return gigyaClient.callApi('/accounts.exchangeUIDSignature', payload);

}


/**
 * Initializes a registration flow for a new account.
 *
 * This function call should be followed up by a call to "register".
 *
 * @see http://developers.gigya.com/display/GD/accounts.initRegistration+REST
 * @return {Promise}
 */
function initRegistration() {

  return gigyaClient.callApi('/accounts.initRegistration');

}


/**
 * Checks if the given email address is available for account registration
 *
 * @see http://developers.gigya.com/display/GD/accounts.isAvailableLoginID+REST
 * @param {String} email
 * @return {Promise}
 */
function isEmailAvailable(email) {

  return gigyaClient.callApi('/accounts.isAvailableLoginID', {loginID: email});

}


/**
 * Searches for accounts using a custom query language
 *
 * @see http://developers.gigya.com/display/GD/accounts.search+REST
 * @param {String} SQL-like query as supported by the Gigya REST API
 */
function searchAccount(query) {

  const now = Date.now();
  const payload = {
    query: query
  };

  return gigyaClient.callApi('/accounts.search', payload);

}


/**
 * @see http://developers.gigya.com/display/GD/accounts.linkAccounts+REST
 * @param {Object} body
 * @param {String} regToken
 * @return {Promise}
 */
function linkAccounts(body, regToken) {

  if (!body) {
    return Promise.reject(new Error('"body" is required'));
  } else if ((!body.regToken) && !regToken) {
    return Promise.reject(new Error('"regToken" required'));
  }

  body.format = 'json';
  body.regToken = body.regToken || regToken;

  return gigyaClient.callApi('/accounts.linkAccounts', body);

}


/**
 * @see http://developers.gigya.com/display/GD/accounts.register+REST
 * @param {Object} body
 * @param {String} regToken
 * @return {Promise}
 */
function register(body, regToken) {

  if (!body) {
    return Promise.reject(new Error('"body" is required'));
  } else if ((!body.regToken) && !regToken) {
    return Promise.reject(new Error('"regToken" is required'));
  }

  // Fields profile+data are invalid during registration and are instead added
  // to the account in a separate call to "setAccountInfo", so we omit them.
  const _body = Object.assign({}, body, {
    finalizeRegistration: true,
    include: 'profile,data',
    format: 'json',
    regToken: body.regToken || regToken
  });

  return gigyaClient.callApi('/accounts.register', _body);

}


function resetPassword(payload) {
  return gigyaClient.callApi('/accounts.resetPassword', payload);
}


/**
 * Deletes the account with the given UID
 *
 * @see http://developers.gigya.com/display/GD/accounts.deleteAccount+REST
 * @param {String} UID
 * @return {Promise}
 */
function deleteAccount(uid) {

  return gigyaClient.callApi('/accounts.deleteAccount', {UID: uid});

}


/**
 * Returns the account schema
 * @see http://developers.gigya.com/display/GD/accounts.getSchema+REST
 * @return {Promise}
 */
function getAccountSchema() {

  return gigyaClient.callApi('/accounts.getSchema', {format: 'json'});

}

/**
 * Sets the accounts schema
 * @see http://developers.gigya.com/display/GD/accounts.setSchema+REST
 * @return {Promise}
 */
function setAccountSchema(accountSchema) {
  const _body = Object.assign({}, accountSchema, {
    format: 'json'
  });
  // Just redirect the call to Gigya.
  return gigyaClient.callApi('/accounts.setSchema', _body);
}

/**
 * Registers a new user in Gigya, with specified login credentials
 *
 * If a user with the specified UID (username? email?) already exists, his or
 * her account is linked to the login credentials.
 *
 * @param {Object} User data
 * @return {Promise}
 */
function registerUser(userData) {

  return initRegistration().then(initRes => {
    return register(userData, initRes.body.regToken);
  });

  /* (err, initRes) => {
    if (err) {
      return reject(err);
    }
    gigyaClient.register(userData, regToken, (err, regRes) => {
      if (err) {
        return reject(err);
      } else if (regRes && regRes.errorCode === VALIDATION_ERROR_GENERIC) {
        const errCodes = regRes.validationErrors.map(err => err.errorCode);
          const validationError = new Error('Validation failed');
          validationError.validationErrors = regRes.validationErrors;
          console.log(validationError);
          return reject(validationError);
        // }
      } else {
        return resolve(regRes);
      }
    })
  }); */
}
