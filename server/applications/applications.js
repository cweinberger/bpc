/*jshint node: true */
'use strict';

const Boom = require('boom');
const Joi = require('joi');
const OzLoadFuncs = require('./../oz_loadfuncs');
const MongoDB = require('./../mongo/mongodb_client');
const ObjectID = require('mongodb').ObjectID;
const crypto = require('crypto');
const EventLog = require('./../audit/eventlog');

module.exports = {

  getApplications: function (request, reply) {
    MongoDB.collection('applications').find(
      {},
      {
        _id: 0,
        id: 1,
        scope: 1
      }
    ).sort({id: 1})
    .toArray()
    .then(res => reply(res), err => reply(err));
  },


  postApplication: function (request, reply) {

    let application = {
      id: request.payload.id,
      key: crypto.randomBytes(25).toString('hex'),
      algorithm: request.payload.algorithm,
      scope: makeArrayUnique(request.payload.scope),
      delegate: request.payload.delegate ? request.payload.delegate : false,
      settings: request.payload.settings || {}
    };

    if (!application.settings.provider){
      application.settings.provider = 'gigya';
    }

    // Ensure that the id is unique before creating the application.
    convertToUniqueid(application.id)
    .then(uniqueId => {
      application.id = uniqueId;
      return Promise.resolve();
    })
    .then(() => MongoDB.collection('applications').insertOne(application))
    .then(res => {

      if (res.result.ok === 1){
        reply(application);
        return Promise.resolve();
      } else {
        reply(Boom.badRequest('application could not be created'));
        return Promise.reject();
      }

    })
    .then(() => {

      const ticket = request.auth.credentials;

      const ops_phase2 = [
        // Adding the admin:{id} scope to the application of the ticket issuer
        MongoDB.collection('applications')
        .updateOne(
          { id: ticket.app },
          { $addToSet: { scope: 'admin:'.concat(application.id) } }
        ),
        // Adding the admin:{id} scope to the grant of the ticket owner
        MongoDB.collection('grants')
        .updateOne(
          { id: ticket.grant },
          { $addToSet: { scope: 'admin:'.concat(application.id) } }
        )
      ];

      return Promise.all(ops_phase2);

    })
    .catch(err => {
      console.error(err);
    });
  },


  getApplication: function (request, reply) {
    MongoDB.collection('applications').findOne({id: request.params.id})
    .then(app => reply(app ? app : Boom.notFound()))
    .catch(err => reply(Boom.wrap(err)));
  },


  putApplication: function (request, reply) {
    let application = request.payload;

    if (!application.settings) {
      application.settings = {};
    }

    if (!application.settings.provider){
      application.settings.provider = 'gigya';
    }

    MongoDB.collection('applications')
    .updateOne(
      { id: request.params.id },
      { $set: application }
    )
    .then(res => reply({'status':'ok'}))
    .catch(err => reply(Boom.wrap(err)));
  },


  deleteApplication: function (request, reply) {

    const ops = [
      // Remove the application
      MongoDB.collection('applications').remove({ id: request.params.id }),
      // Remove all grants to that application
      MongoDB.collection('grants').remove({ app: request.params.id } )
    ];

    return Promise.all(ops)
    .then(res => {
      // We reply "ok" if the command was successfull.
      if (res[0].result.n === 1) {
        reply({'status': 'ok'});
        return Promise.resolve();
      } else if (res[0].result.n === 0) {
        reply(Boom.notFound());
        return Promise.resolve();
      } else {
        reply(Boom.badRequest());
        return Promise.reject(res[0]);
      }

    })
    .then(() => {

      const ticket = request.auth.credentials;

      // At this point we have already deleted the app and told the user it went ok.
      // Now we are just cleaning up in the console/admin app and grants.

      const ops_phase2 = [
        // Removing  the admin:{id} scope from the application of the ticket issuer
        MongoDB.collection('applications')
        .updateOne(
          { id: ticket.app },
          { $pull: { scope: 'admin:'.concat(request.params.id) } }
        ),

        // Removing the admin:{id} scope from the grant of the ticket owner
        MongoDB.collection('grants')
        .update(
          { app: ticket.app },
          { $pull: { scope: 'admin:'.concat(request.params.id) } },
          { multi: true }
        )
      ];

      return Promise.all(ops_phase2);

    })
    .catch(err => {
      console.error(err);
    });
  },


  getApplicationGrants: function (request, reply) {
    const query = Object.assign(request.query, {
       app: request.params.id
    });

    MongoDB.collection('grants').find(
      query, {fields: {_id: 0}}
    ).toArray(reply);
  },


  postApplicationNewGrant: function (request, reply) {
    let grant = Object.assign(request.payload, {
      id: crypto.randomBytes(20).toString('hex'),
      app: request.params.id
    });

    let userQuery = {};
    if(ObjectID.isValid(grant.user)) {
      userQuery._id = new ObjectID(grant.user);
    } else {
      userQuery.id = grant.user;
    }

    const operations = [
      MongoDB.collection('applications')
      .findOne({ id: grant.app }),

      MongoDB.collection('users')
      .findOne(userQuery),

      MongoDB.collection('grants')
      .count({ user: grant.user, app: grant.app }, {limit:1})
    ];

    return Promise.all(operations)
    .then(results => {
      let app = results[0];
      let user = results[1];
      let existingGrant = results[2];

      if(existingGrant > 0){
        return Promise.reject(Boom.conflict());
      }

      if (!user){
        return Promise.reject(Boom.badRequest('invalid user'))
      }

      grant.user = user._id;

      if (!app){
        return Promise.reject(Boom.badRequest('invalid app'))
      }

      // Keep only the scopes allowed in the app scope.
      grant.scope = grant.scope.filter(i => app.scope.indexOf(i) > -1);
      grant.scope = makeArrayUnique(grant.scope);

      MongoDB.collection('grants').insertOne(grant)
      .then(res => reply(grant))
      .catch(err => {
        console.error(err);
        reply(Boom.badRequest());
      });

    })
    .catch(err => reply(err));
  },


  postApplicationGrant: function (request, reply) {
    const grant = Object.assign(request.payload, {
      id: request.params.grantId,
      app: request.params.id
    });

    MongoDB.collection('applications')
    .findOne({id: grant.app})
    .then(app => {

      if (!app) {
        return Promise.reject(Boom.badRequest('invalid app'))
      }

      grant.scope = makeArrayUnique(grant.scope);
      // Keep only the scopes allowed in the app scope.
      grant.scope = grant.scope.filter(i => app.scope.indexOf(i) > -1);

      MongoDB.collection('grants')
      .findOneAndUpdate(
        { id: grant.id },
        { $set: grant },
        { returnOriginal: false }
      )
      .then(result => reply(result.value))
      .catch(err => {
        console.error(err);
        reply(Boom.badRequest());
      });

    })
    .catch(err => reply(err));
  },


  deleteApplicationGrant: function (request, reply) {
    MongoDB.collection('grants').removeOne({
      id: request.params.grantId, app: request.params.id
    })
    .then(result => reply({'status':'ok'}))
    .catch(err => reply(err));
  },


  getApplicationAdmins: function (request, reply) {

    const ticket = request.auth.credentials;

    const query = {
       app: ticket.app,
       scope: 'admin:'.concat(request.params.id)
    };

    MongoDB.collection('grants').find(
      query, {fields: {_id: 0}}
    ).toArray(reply);
  },


  postApplicationMakeAdmin: function (request, reply) {

    if(!ObjectID.isValid(request.payload.user)) {
      return reply(Boom.badRequest());
    }

    const ticket = request.auth.credentials;

    const query = {
       app: ticket.app,
       user: new ObjectID(request.payload.user)
    };

    const newGrant = Object.assign(query, {
      id: crypto.randomBytes(20).toString('hex')
    });

    const update = {
      $addToSet: { scope: 'admin:'.concat(request.params.id) },
      $setOnInsert: newGrant
    };

    const options = {
      upsert: true
    };

    MongoDB.collection('grants')
    .updateOne(query, update, options)
    .then(res => {
      if(res.result.n === 1) {

        EventLog.logUserEvent(
          request.params.id,
          'Added Admin Scope to User',
          {app: request.params.id, byUser: ticket.user}
        );

        reply({'status': 'ok'});

      } else {

        reply(Boom.badRequest());

      }
    })
    .catch(err => {
      console.error(err);
      reply(Boom.badRequest());
    });
  },


  postApplicationRemoveAdmin: function (request, reply) {

    const ticket = request.auth.credentials;

    if (ticket.user === request.payload.user || ticket.user === new ObjectID(request.payload.user)){
      return Promise.reject(Boom.forbidden('You cannot remove yourself'));
    }

    let query = {
      app: ticket.app
    };

    if(ObjectID.isValid(request.payload.user)) {
      query.user = new ObjectID(request.payload.user);
    } else {
      query.user = request.payload.user;
    }

    const update = {
      $pull: { scope: 'admin:'.concat(request.params.id) }
    };

    MongoDB.collection('grants')
    .updateOne(query, update)
    .then(res => {
      console.log('res', res);
      if(res.result.n === 1) {

        EventLog.logUserEvent(
          request.params.id,
          'Pulled Admin Scope from User',
          {app: request.params.id, byUser: ticket.user}
        );

        reply({'status': 'ok'});

      } else {

        reply(Boom.badRequest());

      }
    })
    .catch(err => {
      console.error(err);
      reply(Boom.badRequest());
    });
  }
};



/**
 * Given an application id, this function simply returns the same id if that id
 * is already unique. If not, a unique id is created based on the original id
 * and returned.
 *
 * @param {String} id
 * @return {Promise} Promise providing a unique id
 */
function convertToUniqueid(id) {

  return MongoDB.collection('applications')
  .find(
    {id: {$regex: '^'.concat(id)}},
    {_id: 0, id: 1}
  )
  .toArray()
  .then((apps) => {

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
