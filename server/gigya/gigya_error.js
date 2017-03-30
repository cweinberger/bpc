/* jshint node: true */
'use strict';


/**
 * Create a class that extends Error that contains error details from Gigya
 */
class GigyaError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    } else { 
      this.stack = (new Error(message)).stack; 
    }
  }
}


module.exports = GigyaError;