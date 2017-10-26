/* jshint node: true */
'use strict';

// Bootstrap the testing harness.
const sinon = require('sinon');
const test_data = require('./data/test_data');
const bpc_helper = require('./helpers/bpc_helper');
const Gigya = require('./mocks/gigya_mock');
const MongoDB = require('./mocks/mongodb_mock');

// Test shortcuts.
const { expect, describe, it, before, after } = exports.lab = require('lab').script();

describe('anonymous users - integration tests', () => {

  var app = test_data.applications.app_with_ad_model_scope;
  var appTicket;

  before(done => {
    bpc_helper.start().then(done);
  });

  // Getting the appTicket
  before(done => {
    bpc_helper.request({ method: 'POST', url: '/ticket/app' }, app)
    .then(response => {
      appTicket = response.result;
    })
    .then(done)
    .catch(done);
  });

  describe('a new fingerprint', () => {

    const fingerprint = 'somerandomnumbergeneratedasamachinefingerprint';

    it('getting anonymous user permissions without any there', (done) => {

      bpc_helper.request({ method: 'GET', url: '/permissions/' + fingerprint + '/ad_model'}, appTicket)
      .then(response => {
        expect(response.statusCode).to.equal(404);
        done();
      })
      .catch(done);
    });


    it('setting anonymous user permissions', (done) => {

      var payload = {
        buy_model: 'A'
      };

      bpc_helper.request({ method: 'POST', url: '/permissions/' + fingerprint + '/ad_model', payload: payload}, appTicket)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        done();
      })
      // TODO: test for ttl
      .catch(done);
    });

  });

});
