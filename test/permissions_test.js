/* jshint node: true */
'use strict';

// Bootstrap the testing harness.
const sinon = require('sinon');
const test_data = require('./data/test_data');
const bpc_helper = require('./helpers/bpc_helper');
// const Permissions = require('./../server/permissions');

// Test shortcuts.
const { describe, it, before, after } = exports.lab = require('lab').script();
// Assertion library
const { expect, fail } = require('code');


describe('permissions - functional tests', () => {

  before(done => {
    bpc_helper.start().then(done);
  });

  describe('getting user permissions with an app ticket', () => {

    var appTicket;
    var bt = test_data.applications.bt;
    var first = test_data.users.simple_first_user;

    // Getting the appTicket
    before(done => {
      bpc_helper.getAppTicket(bt)
      .then(result => {
        appTicket = result;
      })
      .then(done)
      .catch(done);
    });


    it('getting first user bt permissions', (done) => {
      bpc_helper.request({ method: 'GET', url: '/permissions/' + first.id + '/bt'}, appTicket, (response) => {
        expect(response.statusCode).to.equal(200);
        var payload = JSON.parse(response.payload);
        expect(payload.bt_paywall).to.true();
        done();
      });
    });

    it('getting first user bt permissions by provider and uppercase email', (done) => {
      bpc_helper.request({ method: 'GET', url: '/permissions/gigya/FIRST_USER@berlingskemedia.dk/bt'}, appTicket, (response) => {
        expect(response.statusCode).to.equal(200);
        var payload = JSON.parse(response.payload);
        expect(payload.bt_subscription_tier).to.equal('free');
        done();
      });
    });

    it('denied first user berlingske permissions', (done) => {
      bpc_helper.request({ method: 'GET', url: '/permissions/' + first.id + '/berlingske'}, appTicket, (response) => {
        expect(response.statusCode).to.equal(403);
        done();
      });
    });
  });

});
