/* jshint node: true */
'use strict';


const Boom = require('boom');


module.exports = {
  isError,
  toError,
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
 * @param {Mixed} data 
 * @param {Object} extra (optional)
 * @return {Object} Boom-wrapped error object
 */
function toError(data, extra) {

  const error = data instanceof Error ? Boom.wrap(data) : Boom.wrap(
    new Error(data.errorDetails), data.statusCode, data.errorMessage
  );
  if (extra) {
    error.output.payload = extra;
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
