/* jshint node: true */
'use strict';


// Gigya configuration.
const GIGYA_DC = 'eu1';
const GIGYA_HOSTNAME = 'gigya.com';
const GIGYA_PROTOCOL = 'https://';
const GIGYA_APP_KEY = process.env.GIGYA_APP_KEY;
const GIGYA_USER_KEY = process.env.GIGYA_USER_KEY;
const GIGYA_SECRET_KEY = process.env.GIGYA_SECRET_KEY;


// Dependencies.
const qs = require('qs');
const request = require('request');
const GigyaUtils = require('./gigya_utils');


// Definitions.
const VALIDATION_ERROR_GENERIC = 400009;


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
  registerUser
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
    // UIDSignature: request.payload.UIDSignature,
    // signatureTimestamp: request.payload.signatureTimestamp
  };
  return callGigyaRestApi('/ids.getAccountInfo', parameters);

}


/**
 * Updates account information for a single account
 * 
 * @see https://developers.gigya.com/display/GD/accounts.setAccountInfo+REST
 * @param {Object} Account information to set/update
 * @return {Promise}
 */
function setAccountInfo(payload) {

  return callGigyaRestApi('/ids.setAccountInfo', payload);

}


/**
 * ???
 * 
 * @see https://developers.gigya.com/display/GD/accounts.exchangeUIDSignature+REST
 * @param {Object}
 * @return {Promise}
 */

function exchangeUIDSignature(payload) {

  return callGigyaRestApi('/accounts.exchangeUIDSignature', payload);

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

  return callGigyaRestApi('/accounts.initRegistration');

}


/**
 * Checks if the given email address is available for account registration
 * 
 * @see http://developers.gigya.com/display/GD/accounts.isAvailableLoginID+REST
 * @param {String} email 
 * @return {Promise}
 */
function isEmailAvailable(email) {

  return callGigyaRestApi('/accounts.isAvailableLoginID', {loginID: email});

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

  return callGigyaRestApi('/accounts.search', payload);

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

  return callGigyaRestApi('/accounts.linkAccounts', body);

}


/**
 * @see http://developers.gigya.com/display/GD/accounts.register+REST
 * @param {Objec6} body 
 * @param {String} regToken 
 * @return {Promise}
 */
function register(body, regToken) {

  if (!body) {
    return Promise.reject(new Error('"body" is required'));
  } else if ((!body.regToken) && !regToken) {
    return Promise.reject(new Error('"regToken" required'));
  }

  // Fields profile+data are invalid during registration and are instead added
  // to the account in a separate call to "setAccountInfo", so we omit them.
  const _body = Object.assign({}, body, {
    finalizeRegistration: true,
    format: 'json',
    regToken: body.regToken || regToken
  });
  _body.profile = stringify(_body.profile);
  _body.data = stringify(_body.data); // Untested - might not be necessary.

  return callGigyaRestApi('/accounts.register', _body);

}


/**
 * Deletes the account with the given UID
 * 
 * @see http://developers.gigya.com/display/GD/accounts.deleteAccount+REST
 * @param {String} UID
 * @return {Promise}
 */
function deleteAccount(uid) {

  return callGigyaRestApi('/accounts.deleteAccount', {UID: uid});

}


/**
 * Returns the account schema
 * @see http://developers.gigya.com/display/GD/accounts.getSchema+REST
 * @return {Promise}
 */
function getAccountSchema() {

  return callGigyaRestApi('/accounts.getSchema', {format: 'json'});

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


/**
 * Performs a (POST) request against the Gigya REST API and returns the parsed
 * response as JSON
 * 
 * @param {String} Relative path of HTTP URL
 * @param {Object} Payload for POST request, if any
 * @param {String} API accounts|audit|comments|ds|fidm|gm|ids|reports|socialize
 * @return {Promise} Promise which is resolved when a response is received
 */
function callGigyaRestApi(path, payload = null, api = 'accounts') {

  const options = {
    url: `${GIGYA_PROTOCOL}${api}.${GIGYA_DC}.${GIGYA_HOSTNAME}${path}`,
    qs: {
      apiKey: GIGYA_APP_KEY,
      userKey: GIGYA_USER_KEY,
      secret: GIGYA_SECRET_KEY,
    },
    method: 'POST',
    headers: {
      'Cache-Control': 'no-cache',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    form: payload
  };

  // Request logging is for auditing purposes.
  console.log(`HTTP/${options.method} ${options.url}`);
  console.log(`  Payload: ${JSON.stringify(payload)}`);

  return new Promise((resolve, reject) => {

    return request(options, (err, response, body) => {

      let _body = {};

      if (err) {
        return reject(err);
      }

      try {
        _body = JSON.parse(body);
      } catch (exception) {
        console.error(`  Unable to parse response as JSON: ${body}`);
        return reject(exception);
      }

      if (GigyaUtils.isError(_body)) {
        console.error(`  Gigya Error: ${_body.errorCode} ${_body.errorMessage}`);
        if (_body.validationErrors) {
          const errors = _body.validationErrors.map(
            error => ` -> ${error.errorCode} ${error.message}`
          );
          console.log(`  Validation errors:${errors}`);
        }
        return reject(GigyaUtils.toError(_body, _body.validationErrors));
      }

      return resolve({response, body: _body});
    });

  });
}


/**
 * Certain data fields needs to be in string format when sent to Gigya - this
 * function does just that
 * 
 * @param {Mixed} Data to stringify
 * @return {String} Stringified data
 */
function stringify(data) {
  return data && typeof data !== 'string' ? JSON.stringify(data) : data;
}
