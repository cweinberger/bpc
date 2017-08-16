/* jshint node: true */
'use strict';

const Boom = require('boom');
const Gigya = require('./../gigya/gigya_client');
const MongoDB = require('./../mongo/mongodb_client');
const EventLog = require('./../audit/eventlog');


module.exports = {
  register,
  updateUserId,
  updateUserInDB,
  createUserId,
  deleteUserId
};


/**
 * Registers a new account with Gigya and stores the user in MongoDB
 *
 * @param {Object} user
 * @return {Promise} Receives the created user is the operation went well
 */
function register(user) {

  if (!user) {
    return Promise.reject(new Error('"user" is required'));
  }

  return Gigya.callApi('/accounts.initRegistration').then(initRes => {
    if (!initRes.body && !initRes.body.regToken) {
      return Promise.reject(new Error('"regToken" is required'));
    }

    const _body = Object.assign({}, user, {
      finalizeRegistration: true,
      include: 'profile,data',
      format: 'json',
      regToken: initRes.body.regToken
    });

    return Gigya.callApi('/accounts.register', _body).then(data => {

      EventLog.logUserEvent(data.body.UID, 'User registered');

      // const _user = assembleDbUser(data.body);
      // // Create user and provide the user object to the resolved promise.
      // return MongoDB.collection('users').insert(_user)
      //   .then(res => res.ops[0])
      //   .then(res => {
      //     EventLog.logUserEvent(res.id, 'User registered');
      //     return res;
      //   });
      return Promise.resolve(data);
    }, err => {
      EventLog.logUserEvent(null, 'User registration failed', {email: user.email});
      return Promise.reject(err);
    })

  });


  /**
   * Picks the data from a Gigya account that we have chosen to store in MongoDB
   */
  // function assembleDbUser(data) {
  //   return {
  //     email: data.profile.email,
  //     id: data.UID,
  //     provider: 'gigya',
  //     providerData: {
  //       loginProvider: data.loginProvider,
  //       isActive: data.isActive,
  //       isLockedOut: data.isLockedOut,
  //       isVerified: data.isVerified,
  //       profile: data.profile,
  //       data: data.data ? data.data : {},
  //       lastLogin: new Date(data.lastLoginTimestamp),
  //       lastUpdated: new Date(data.lastUpdatedTimestamp),
  //       registered: new Date(data.registedTimestamp),
  //     },
  //     lastUpdated: new Date(),
  //     lastLogin: new Date(),
  //     lastSynced: new Date(),
  //     dataScopes: {}
  //   };
  //
  // }

}


// Used by /rsvp (createRsvp)
// But should not be nessecary after going full webhooks
function updateUserInDB(data, callback) {
  if (callback === undefined) {
    callback = function(err, result) {
      if (err) {
        console.error(err);
      }
    };
  }

  const query = {
    $or: [
      {
        id: data.id
      },
      {
        provider: data.provider,
        email: data.email
      }
    ]
  };

  return new Promise((resolve, reject) => {

    MongoDB.collection('users').update(query, {
      $setOnInsert: {
        dataScopes: {}
      },
      // We want to update id, email and provider in case we're missing one of the parameters
      $set: data,
      $currentDate: {
        'lastLogin': { $type: "date" }
      }
    },
    { upsert: true },
    function(err, result) {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
      callback(err, result);
    });
  });
}


/**
 * Updates user Id if it doesn't exist
 * @param user
 * @return Promise
 */
 // Used by POST /users - but should be removed
function updateUserId({id, email}) {
  if (id !== undefined) {
    return Promise.resolve(id);
  }

  const payload = {
    query: 'select UID from accounts where loginIDs.emails = "' + email + '" '
  };

  return Gigya.callApi('/accounts.search', payload).then(data => {
    if (data.body.results === undefined || data.body.results.length === 0) {
      EventLog.logUserEvent(null, 'User not found', {email: email});
      return Promise.reject(err);
    }

    var id = data.body.results[0].UID;
    MongoDB.collection('users').update({email}, {
      $set: {id: id}
    });

    return id;
  });
}


function createUserId(data, callback){
  if (callback === undefined) {
    callback = function(err, result) {
      if (err) {
        console.error(err);
      }
    };
  }

  return new Promise((resolve, reject) => {

    data.dataScopes = {};
    data.createdAt = new Date();

    MongoDB.collection('users').insert(
      data,
      function(err, result) {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
        callback(err, result);
      }
    );
  });
}



// TODO: Set deletedAt timestamp enough? Or should we do more? Eg. expire grants?
function deleteUserId(id, callback){
  if (callback === undefined) {
    callback = function(err, result) {
      if (err) {
        console.error(err);
      }
    };
  }

  return new Promise((resolve, reject) => {
    MongoDB.collection('users').update(
      { id: id },
      { $set: { deletedAt: new Date() } },
      function(err, result) {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
        callback(err, result);
      }
    );
  });
}
