/* jshint node: true */
'use strict';

if (process.env.NODE_ENV !== 'test') {
  console.error('NODE_ENV is not set to test')
  process.exit(1);
}

const Hawk = require('hawk');
const Oz = require('oz');
const crypto = require('crypto');
const bpc = require('../../server');
const Config = require('./../../server/config');


module.exports.request = function (options, ticket) {

  return new Promise((resolve, reject) => {
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
        reject(hawkHeader);
      }
      
      req.headers.authorization = hawkHeader.field;
    }
    
    // We don't need to reject anything. We only resolve and the tests should validate the response
    bpc.inject(req, resolve);
  });
};


module.exports.generateRsvp = function(app, grant) {
  return new Promise((resolve, reject) => {
    // Generating the RSVP based on the grant
    Oz.ticket.rsvp(app, grant, Config.ENCRYPTIONPASSWORD, {}, (err, rsvp) => {
      if (err) {
        return reject(err);
      } else {
        return resolve(rsvp);
      }
    });
  });
};
