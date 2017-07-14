/* jshint node: true */
'use strict';


const Boom = require('boom');
const Crypto = require('crypto');
const GigyaError = require('./gigya_error');

const GIGYA_SECRET_KEY = process.env.GIGYA_SECRET_KEY || '';

module.exports = {
  isError,
  errorToResponse,
  exposeError,
  payloadToForm,
  validNotificationRequest
}


/**
 * Checks if the given Gigya response payload contains error information
 *
 * @param {Mixed} data
 */
function isError(data) {

  return data && (data.errorCode > 0 || data.statusCode > 300);

}


/**
 * Wraps existing errors or response data with the expected error fields into
 * an error object wrapped by Boom.js
 *
 * @param {Mixed} GigyaError|Error|Gigya response
 * @param {Object} extra (optional)
 * @return {Object} Boom-wrapped error object
 */
function errorToResponse(data, extra) {

  let error;

  if (data instanceof GigyaError) {
    error = Boom.wrap(data);
    error.output.payload = data.details;
  } else if (data instanceof Error) {
    error = Boom.wrap(data);
  } else {
    error = Boom.wrap(
      new Error(data.errorDetails), data.statusCode, data.errorMessage
    );
  }

  return error;

}


/**
 * Given a reply (from Hapi.js) and a GigyaError object, calls reply with the
 * proper error code and containing a close resemblance of the original error
 *
 * @param {function} reply
 * @param {GigyaError} err
 * @return {mixed} Whatever reply() returns
 */
function exposeError(reply, err, code = 500) {

    if (err instanceof GigyaError) {
      return reply({
        message: err.message, details: err.details
      }).code(err.statusCode || code);
    } else {
      return reply({message: err.message}).code(code);
    }

}


/**
 * Certain data fields needs to be in string format when sent to Gigya - this
 * function does just that
 *
 * @param {object} payload
 *   Data to check if elements need to be stringified.
 */
function payloadToForm(payload) {
  const form = {};
  for(let param in payload) {
    if (payload.hasOwnProperty(param)) {
      if (typeof(payload[param]) == 'object') {
        form[param] = JSON.stringify(payload[param]);
      }
      else {
        form[param] = payload[param];
      }
    }
  }
  return form;
}

const secretBuffer = new Buffer(GIGYA_SECRET_KEY, 'base64');
const algorithm = 'sha1'; // sha256

function validNotificationRequest(request) {
  const _message = new Buffer.from(JSON.stringify(request.payload));
  const hmac = Crypto.createHmac(algorithm, secretBuffer).update(_message);
  const digest = hmac.digest('base64');
  const signature = request.headers['x-gigya-sig-hmac-sha1'];
  return digest === signature;
}
