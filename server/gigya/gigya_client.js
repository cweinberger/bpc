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
const EventLog = require('./../audit/eventlog');


/**
 * Performs a (POST) request against the Gigya REST API and returns the parsed
 * response as JSON
 *
 * @param {String} Relative path of HTTP URL
 * @param {Object} Payload for POST request, if any
 * @param {String} API accounts|audit|comments|ds|fidm|gm|ids|reports|socialize
 * @return {Promise} Promise which is resolved when a response is received
 */
module.exports.callApi = function(path, payload = null, api = 'accounts') {

  let form = null;
  if (payload) {
    form = payloadToForm(payload);
  }

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
    form: form
  };

  // Request logging is for auditing purposes.
  console.log(`HTTP/${options.method} ${options.url}`);
  // console.log(`  Payload: ${JSON.stringify(payload)}`);

  return new Promise((resolve, reject) => {

    return request(options, (err, response, body) => {

      let _body = {};

      if (err) {
        // Log errors in the auditing system before returning an error.
        EventLog.logSystemEvent(
          'Gigya Request Failed',
          `Request failed: HTTP/${options.method} ${options.url} Response: ${err.message}`,
          options.form
        );
        return reject(err);
      }

      try {
        _body = JSON.parse(body);
      } catch (exception) {
        console.error(`  Unable to parse response as JSON: ${body}`);
        return reject(exception);
      }

      if(_body && (_body.errorCode > 0 || _body.statusCode > 300)) {
        console.error(`  Gigya Error: ${_body.statusCode}, ${_body.errorCode} ${_body.errorMessage}\n  Details: ${_body.errorDetails}`);
        // Check if there are details present in a response.
        if (_body.validationErrors) {
          const errors = _body.validationErrors.map(
            error => `${error.fieldName} -> ${error.errorCode} ${error.message}; `
          );
          console.log(`  Validation errors: ${errors}`);
        }

        // Add some error details.
        let details = {};
        if (_body.errorDetails) {
          details.error = _body.errorDetails;
        }
        if (_body.validationErrors) {
          details.validationErrors = _body.validationErrors;
        }

        return reject(new GigyaError(
          _body.errorMessage, _body.statusCode, _body.errorCode, details
        ));
      }

      return resolve({response, body: _body});
    });

  });
}



/**
 * Certain data fields needs to be in string format when sent to Gigya - this
 * function does just that
 *
 * @param {object} payload
 *   Data to check if elements need to be stringified.
 */
function payloadToForm(payload) {
  var form = Object.assign({}, payload);
  Object.keys(form).forEach(key => {
    if (typeof form[key] === 'object') {
      form[key] = JSON.stringify(form[key]);
    }
  });
  return form;
}
