
const ENCRYPTIONPASSWORD = 'random_test_password_that_is_longer_than_32_characters';
process.env.ENCRYPTIONPASSWORD = ENCRYPTIONPASSWORD;

const Hawk = require('hawk');
const Oz = require('oz');
const crypto = require('crypto');
const bpc = require('../../server');
const MongoDB = require('../mocks/mongodb_mock');


module.exports.request = function (options, ticket, callback) {

  const req = {
    method: options.method,
    url: options.url,
    payload: options.payload,
    headers: Object.assign(options.headers || {},
      {
        host: 'testing.com'
      }
    )
  };

  if (ticket !== undefined && ticket !== null && ticket !== {}) {
    const hawkHeader = Hawk.client.header('http://'.concat(req.headers.host, options.url), options.method, ticket);
    if (!hawkHeader.field){
      callback(hawkHeader);
    }

    req.headers.authorization = hawkHeader.field;
  }

  bpc.inject(req, callback);
};


module.exports.generateRsvp = function(app, grant, callback) {
  Oz.ticket.rsvp(app, grant, ENCRYPTIONPASSWORD, {}, callback);
};


module.exports.start = function(done){
  return new Promise((resolve, reject) => {
    MongoDB.initate().then(() => bpc.start(function(err){
      if (typeof done === 'function') {
        done(err);
      }
      if (err) {
        reject();
      } else {
        resolve();
      }
    }));
  });
};
