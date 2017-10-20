
const ENCRYPTIONPASSWORD = 'random_test_password_that_is_longer_than_32_characters';
process.env.ENCRYPTIONPASSWORD = ENCRYPTIONPASSWORD;

const Hawk = require('hawk');
const Oz = require('oz');
const crypto = require('crypto');
const bpc = require('../../server');
const MongoDB = require('../mocks/mongodb_mock');

module.exports.request = function (options, ticket, callback) {

  return new Promise((resolve, reject) => {

    if (callback === undefined) {
      // callback = function(response) {
      //   if (response.statusCode >= 400 || response.err) {
      //     reject(response);
      //   } else {
      //     resolve(response);
      //   }
      // };
      // Actually, we don't need to reject anything. We only resolve and the tests should validate the response
      callback = resolve;
    }

    const req = {
      method: options.method ? options.method : 'GET',
      url: options.url,
      payload: options.payload,
      headers: Object.assign(options.headers || {},
        {
          host: 'testing.com'
        }
      )
    };

    if (ticket !== undefined && ticket !== null && ticket !== {}) {

      const hawkHeader = Hawk.client.header(
        'http://'.concat(req.headers.host, req.url),
        req.method, {
          credentials: ticket,
          app: ticket.app
        }
      );

      if (!hawkHeader.field){
        console.error('Error when generating Hawk field:', hawkHeader.err);
        callback(hawkHeader);
      }

      req.headers.authorization = hawkHeader.field;
    }

    bpc.inject(req, callback);
  });
};


module.exports.generateRsvp = function(app, grant, callback) {

  return new Promise((resolve, reject) => {
    // Generating the RSVP based on the grant
    Oz.ticket.rsvp(app, grant, ENCRYPTIONPASSWORD, {}, (err, rsvp) => {
      if(typeof callback === 'function'){
        callback(err, rsvp);
      }

      if (err) {
        return reject(err);
      } else {
        return resolve(rsvp);
      }
    });
  });
};


module.exports.start = function(){
  if(bpc.info.started > 0){
    return MongoDB.initate();
  } else {
    return new Promise((resolve, reject) => {
      MongoDB.initate().then(() => bpc.start(function(err){
        if (err) {
          reject();
        } else {
          resolve();
        }
      }));
    });
  }
};
