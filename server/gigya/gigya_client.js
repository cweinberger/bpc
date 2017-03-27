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
const GigyaError = require('./gigya_error');


module.exports = {
  callApi
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
function callApi(path, payload = null, api = 'accounts') {

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
        return reject(new GigyaError(
          _body.errorMessage, _body.errorCode, _body.validationErrors
        ));
      }

      return resolve({response, body: _body});
    });

  });
}
