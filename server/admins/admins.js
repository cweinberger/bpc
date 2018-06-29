/*jshint node: true */
'use strict';

const Boom = require('boom');
const MongoDB = require('./../mongo/mongodb_client');
const ObjectID = require('mongodb').ObjectID;
const crypto = require('crypto');
const EventLog = require('./../audit/eventlog');

module.exports = {


  postSuperadmin: function (request, reply) {

    const ticket = request.auth.credentials;

    if (ticket.grant === request.params.id){
      return reply('No need to promote yourself');
    }

    let query = {
      app: ticket.app
    };

    if(ObjectID.isValid(request.params.id)) {
      query._id = new ObjectID(request.params.id);
    } else {
      query.id = request.params.id;
    }

    const update = {
      $addToSet: { scope: 'admin:*' }
    };

    const options = {
      returnNewDocument: true, // MongoDB
      returnOriginal: false // Node-driver
    };

    MongoDB.collection('grants')
    .findOneAndUpdate(query, update, options)
    .then(result => {
      if(result.lastErrorObject.n === 1) {

        EventLog.logUserEvent(
          request.params.id,
          'Add Scope to User',
          {scope: 'admin:*', byUser: ticket.user}
        );

        reply(result.value);

      } else {

        reply(Boom.badRequest());

      }
    })
    .catch(err => {

      console.error(err);
      EventLog.logUserEvent(
        request.params.id,
        'Scope Change Failed',
        {scope: 'admin:*', byUser: ticket.user}
      );

      return reply(err);
    });
  },


  deleteSuperadmin: function(request, reply) {

    const ticket = request.auth.credentials;

    if (ticket.grant === request.params.id){
      return reply(Boom.forbidden('You cannot demote yourself'));
    }

    const filter = {
      id: request.params.id,
      app: ticket.app
    };

    const update = {
      $pull: { scope: 'admin:*' }
    };

    const options = {
      returnNewDocument: true, // MongoDB
      returnOriginal: false // Node-driver
    };

    MongoDB.collection('grants')
    .findOneAndUpdate(filter, update, options)
    .then(result => {
      if(result.lastErrorObject.n === 1) {

        EventLog.logUserEvent(
          request.params.id,
          'Remove Scope from User',
          {scope: 'admin:*', byUser: ticket.user}
        );

        reply(result.value);
      } else {

        reply(Boom.badRequest());

      }
    })
    .catch(err => {

      EventLog.logUserEvent(
        request.params.id,
        'Scope Change Failed',
        {scope: 'admin:*', byUser: ticket.user}
      );

      return reply(err);

    });
  },


  getApplicationAdmins: function (request, reply) {

    const ticket = request.auth.credentials;

    const query = {
       app: ticket.app,
       scope: 'admin:'.concat(request.params.id)
    };

    MongoDB.collection('grants')
    .find(query)
    .project({
      _id: 0,
      id: 1,
      app: 1,
      user: 1,
      exp: 1
    })
    .toArray(reply);
  },


  postApplicationAdmin: function (request, reply) {

    if(!ObjectID.isValid(request.payload.user)) {
      return reply(Boom.badRequest());
    }

    const ticket = request.auth.credentials;

    const query = {
      app: ticket.app,
      user: new ObjectID(request.payload.user)
    };

    const newGrant = {
      id: crypto.randomBytes(20).toString('hex'),
      app: ticket.app,
      user: new ObjectID(request.payload.user),
      exp: null
    };

    const update = {
      $addToSet: { scope: 'admin:'.concat(request.params.id) },
      $setOnInsert: newGrant
    };

    const options = {
      upsert: true,
      returnNewDocument: true, // MongoDB
      returnOriginal: false // Node-driver
    };

    MongoDB.collection('grants')
    .findOneAndUpdate(query, update, options)
    .then(result => {
      if(result.lastErrorObject.n === 1) {

        EventLog.logUserEvent(
          request.params.id,
          'Added Admin Scope to User',
          {app: request.params.id, byUser: ticket.user}
        );

        reply(result.value);

      } else {

        reply(Boom.badRequest());

      }
    })
    .catch(err => {
      console.error(err);
      reply(Boom.badRequest());
    });
  },


  deleteApplicationAdmin: function (request, reply) {

    const ticket = request.auth.credentials;

    // You cannot remove yourself, unless you are superadmin
    if (ticket.user === request.payload.user && ticket.scope.indexOf('admin:*') === -1){
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
