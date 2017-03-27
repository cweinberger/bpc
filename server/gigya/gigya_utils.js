/* jshint node: true */
'use strict';


const Boom = require('boom');
const GigyaError = require('./gigya_error');

module.exports = {
  isError,
  errorToResponse,
  stringify
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
 * Certain data fields needs to be in string format when sent to Gigya - this
 * function does just that
 * 
 * @param {Mixed} Data to stringify
 * @return {String} Stringified data
 */
function stringify(data) {
  return data && typeof data !== 'string' ? JSON.stringify(data) : data;
}
