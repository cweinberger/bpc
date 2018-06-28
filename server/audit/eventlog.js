/* jshint node: true */
'use strict';

const Config = require('./../config');

const disableLog = Config.DISABLE_LOG;

const MongoDB = require('./../mongo/mongodb_client');


module.exports = {
  logUserEvent,
  logSystemEvent
};


/**
 * Logs a user event
 * 
 * @param {String} User id that the event relates to
 * @param {String} Event name
 * @param {String} Optional description
 * @param {Object} Optional event metadata
 * 
 * @return {Promise} Result of db insert
 */
function logUserEvent(id, name, description = '', meta = {}) {
  if (disableLog) {
    return Promise.resolve(false);
  }
  return MongoDB.collection('audit').insert(
    Object.assign(buildBasicEvent('USER', name, description, meta), {id})
  );
}


/**
 * Logs a system event
 * 
 * @param {String} Event name
 * @param {String} Event description 
 * @param {Object} Optional event metadata
 * 
 * @return {Promise} Result of db insert
 */
function logSystemEvent(name, description = '', meta = {}) {
  if (disableLog) {
    return Promise.resolve(false);
  }
  return MongoDB.collection('audit').insert(
    buildBasicEvent('SYSTEM', name, description, meta)
  );
}


/**
 * Builds a basic event object used in all levels of event logging
 * 
 * @param {String} Event logging level: USER|SYSTEM|etc.
 * @param {String} Event name 
 * @param {String} Event description (or meta)
 * @param {String} Event meta (can be provided instead of description as well)
 * 
 * @return {Object}
 */
function buildBasicEvent(level, name, description = '', meta = {}) {
  if (typeof description === 'object') {
    // Allow user to skip description and provide metadata instead.
    meta = description;
    description = '';
  }
  return {
    level,
    loggedAt: new Date(),
    name,
    description,
    meta
  };
}