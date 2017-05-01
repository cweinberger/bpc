/*jshint node: true */
'use strict';

const MongoDB = require('./../mongo/mongodb_client');


module.exports = {
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
function createApp(app) {

    // Ensure that the id is unique before creating the application.
    return convertToUniqueid(app.id).then(uniqueId => {
      app.id = uniqueId;
      return app;
    }).then(app => {
      return MongoDB
        .collection('applications')
        .insertOne(app).then(res => res.ops[0]);
    });

}


/**
 * Updates a single application by overwriting its fields with the provided ones
 *
 * @param {String} App id
 * @param {Object} App object
 * @return {Promise} Promise providing the updated app
 */
function updateApp(id, payload) {

  return MongoDB.collection('applications')
    .findOneAndUpdate({id}, {$set: payload}, {returnNewDocument: true})
      .then(res => res.value);

}


/**
 * Deletes an application and updates (ie. removes) scopes and grants
 *
 * This operation requires the user ticket.
 *
 * @param {String} App id
 * @param {Object} User ticket
 * @return void
 */
function deleteAppById(id, userTicket) {

  MongoDB.collection('applications').remove({ id: id });
  MongoDB.collection('grants').remove({ app: id } );

  const consoleScope = 'admin:'.concat(id);
  MongoDB.collection('applications').updateOne(
    { id: userTicket.app }, { $pull: { scope: consoleScope } }
  );
  MongoDB.collection('grants').update(
    { app: userTicket.app }, { $pull: { scope: consoleScope } }, { multi: true }
  );

}

/**
 * Assigns admin scope to an existing app
 *
 * @param {Object} Existing app to assign admin scope for
 * @param {Object} Ticket of user who is creating the application
 * @return void
 */
function assignAdminScope(app, ticket) {

  const consoleScope = 'admin:'.concat(app.id);

  // Adding the 'admin:' scope to console app, so that users can be admins.
  MongoDB.collection('applications').updateOne(
    { id: ticket.app }, { $addToSet: { scope: consoleScope } }
  );
  // Adding scope 'admin:' to the grant of user that created the application.
  MongoDB.collection('grants').update(
    { id: ticket.grant }, { $addToSet: { scope: consoleScope } }
  );

}


/**
 * Creates an application grant
 *
 * @param {String} App id
 * @param {Object} Grant to create
 * @return {Promise} Promise providing the created grant
 */
function createAppGrant(id, grant) {

  return findAppById(id).then(app => {

    // TODO: This could be moved to a "users" module. Then we'll have two lookup
    // functions (for app and user) that could neatly be done in parallel.
    return MongoDB.collection('users').findOne({id: grant.user})
        .then(user => {

      if (!user) {
        return; // Resolved, but empty promise.
      }

      // Keep only the scopes allowed in the app scope.
      grant.scope = grant.scope.filter(i => app.scope.indexOf(i) > -1);

      // TODO: Make sure the user does not already have a grant to that app.
      return MongoDB.collection('grants').insert(grant);

    });

  });

}


/**
 * Updates an app's grant
 *
 * @param {String} App id
 * @param {Object} Grant
 * @return {Promise} Promise providing the updated grant
 */
function updateAppGrant(id, grant) {

  return findAppById(id).then(app => {

    // Keep only the scopes allowed in the app scope.
    grant.scope = grant.scope.filter(i => app.scope.indexOf(i) > -1);

    return MongoDB.collection('grants').update({id: grant.id}, {$set: grant});

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

    return uniqueId;

  });

}
