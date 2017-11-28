/*jshint node: true */
'use strict';

const Boom = require('boom');
const Joi = require('joi');
const MongoDB = require('./../mongo/mongodb_client');
const crypto = require('crypto');


module.exports = {
  scopeValidation: Joi.array().items(
    // Scopes starting with 'admin' e.g. admin:app are not allowed because
    // they are reserved.
    Joi.string()
      .regex(/^(?!admin).*$/, { name: 'admin', invert: false })
      .invalid([])
  ),
  findAll,
  findAppById,
  createApp,
  updateApp,
  deleteAppById,
  assignAdminScope,
  createAppGrant,
  updateAppGrant
};



/**
 * Returns all applications, sorted by id
 *
 * @return {Promise}
 */
function findAll() {
  return MongoDB.collection('applications').find().sort({id: 1}).toArray();
}


/**
 * Returns a single application, located by its id
 *
 * @param {String} Id
 * @return {Promise} Promise providing the application, if found
 */
function findAppById(id) {
  return MongoDB.collection('applications').findOne({id: id});
}


/**
 * Creates a new application
 *
 * Since the creating user should probably have admin rights over his new
 * application, this function might be combined with assignAdminScope().
 *
 * @param {Object} Application object to create
 * @return {Promise} Promise providing the created app
 */
function createApp(input) {

  let app = {
    id: input.id,
    key: crypto.randomBytes(25).toString('hex'),
    algorithm: 'sha256',
    scope: makeArrayUnique(input.scope),
    delegate: input.delegate ? input.delegate : false,
    settings: input.settings || {}
  };

    // Ensure that the id is unique before creating the application.
    return convertToUniqueid(app.id).then(uniqueId => {
      app.id = uniqueId;
      return app;
    }).then(app => MongoDB.collection('applications').insertOne(app))
      .then(res => app);

}


/**
 * Updates a single application by overwriting its fields with the provided ones
 *
 * @param {String} App id
 * @param {Object} App object
 * @return {Promise} Promise providing the updated app
 */
function updateApp(id, input) {

  return MongoDB.collection('applications')
  .updateOne(
    {id:id},
    {$set: input},
    {returnNewDocument: true}
  );

}


/**
 * Deletes an application and updates (ie. removes) scopes and grants
 *
 * This operation requires the user ticket.
 *
 * @param {String} App id
 * @param {Object} User ticket
 * @return {Promise} Provides a bool True if app was deleted, False otherwise
 */
function deleteAppById(id, userTicket) {

  const consoleScope = 'admin:'.concat(id);
  const ops = [
    MongoDB.collection('applications').remove({ id: id }),
    MongoDB.collection('grants').remove({ app: id } ),
    MongoDB.collection('applications').update(
      { id: userTicket.app }, { $pull: { scope: consoleScope } }
    ),
    MongoDB.collection('grants')
    .update(
      { app: userTicket.app },
      { $pull: { scope: consoleScope } },
      { multi: true }
    )
  ];

  return Promise.all(ops)
    .then(res => Promise.resolve(res[0].result.n > 0))
    .catch(err => {
      console.error(err);
      return Promise.reject(err);
    });

}


/**
 * Assigns admin scope to an existing app
 *
 * @param {Object} Existing app to assign admin scope for
 * @param {Object} Ticket of user who is creating the application
 * @return {Promise} Provides a Boolean True if the operation succeeded,
 *   False otherwise
 */
function assignAdminScope(app, ticket) {

  const consoleScope = 'admin:'.concat(app.id);
  const ops = [
    // Adding the 'admin:' scope to console app, so that users can be admins.
    MongoDB.collection('applications')
    .update(
      { id: ticket.app },
      { $addToSet: { scope: consoleScope } }
    ),
    // Adding scope 'admin:' to the grant of user that created the application.
    MongoDB.collection('grants')
    .update(
      { id: ticket.grant },
      { $addToSet: { scope: consoleScope } }
    )
  ];

  return Promise.all(ops)
  .then(res => Promise.resolve(res[0].n === 1))
  .catch(err => {
    console.error(err);
    return Promise.reject(err);
  });

}


/**
 * Creates an application grant
 *
 * @param {String} App id
 * @param {Object} Grant to create
 * @return {Promise} Promise providing the created grant
 */
function createAppGrant(grant) {

  if(!grant.app || !grant.user){
    return Promise.reject(Boom.badRequest('attribute app or user missing'));
  }

  grant.id = crypto.randomBytes(20).toString('hex');
  grant.scope = makeArrayUnique(grant.scope);

  const operations = [
    MongoDB.collection('applications')
    .findOne({id: grant.app}),

    MongoDB.collection('grants')
    .count({user: grant.user, app: grant.app}, {limit:1})
  ];

  return Promise.all(operations)
  .then(results => {
    let app = results[0];
    let existingGrant = results[1];

    if(existingGrant > 0){
      return Promise.reject(Boom.conflict());
    }

    if (!app){
      return Promise.reject(Boom.badRequest('invalid app'))
    }

    // Keep only the scopes allowed in the app scope.
    grant.scope = grant.scope.filter(i => app.scope.indexOf(i) > -1);
    return MongoDB.collection('grants').insertOne(grant)
    .then(res => grant);

  });

}


/**
 * Updates an app's grant
 *
 * @param {String} App id
 * @param {Object} Grant
 * @return {Promise} Promise providing the updated grant
 */
function updateAppGrant( grant) {

  return MongoDB.collection('applications')
  .findOne({id: grant.app})
  .then(app => {

    if (!app) {
      return Promise.reject(Boom.badRequest('invalid app'))
    }

    grant.scope = makeArrayUnique(grant.scope);
    // Keep only the scopes allowed in the app scope.
    grant.scope = grant.scope.filter(i => app.scope.indexOf(i) > -1);

    return MongoDB.collection('grants')
    .update(
      {id: grant.id},
      {$set: grant}
    );

  });

}

/**
 * Given an application id, this function simply returns the same id if that id
 * is already unique. If not, a unique id is created based on the original id
 * and returned.
 *
 * @param {String} id
 * @return {Promise} Promise providing a unique id
 */
function convertToUniqueid(id) {

  return MongoDB.collection('applications').find({id: {$regex: '^'.concat(id)}},
      {_id: 0, id: 1}).toArray().then((apps) => {

    const ids = apps.map(app => app.id);
    let uniqueId = id,
      isUniqueId = ids.indexOf(uniqueId) === -1,
      postfixNumber = 0;

    while (!isUniqueId) {
      uniqueId = id.concat('-', ++postfixNumber);
      isUniqueId = !ids.includes(uniqueId);
    }

    return uniqueId.replace(' ', '_');

  });

}


/**
 * Removes duplicate values from the given array
 *
 * Notice that non-array values simply returns an empty array.
 *
 * @param {Array} input
 * @return {Array} Array with unique values only
 */
function makeArrayUnique(input) {
  return Array.isArray(input) ? [ ...new Set(input) ] : [ ]; // The ES6-way :-)
}
