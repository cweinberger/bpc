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
const { expect } = require('code');


describe('users - functional tests', () => {

  before(done => {
    bpc_helper.start().then(done);
  });


  describe('getting user with an app ticket', () => {

    var appTicket;
    var bt = test_data.applications.bt;
    var first = test_data.users.simple_first_user;

    // Getting the appTicket
    before((done) => {
      bpc_helper.request({ method: 'POST', url: '/ticket/app' }, {credentials: bt}, (response) => {
        expect(response.statusCode).to.equal(200);
        appTicket = {credentials: JSON.parse(response.payload), app: bt.id};
        done();
      });
    });

    it('getting first user bt permissions', (done) => {
      bpc_helper.request({ method: 'GET', url: '/permissions/' + first.id + '/bt'}, appTicket, (response) => {
        expect(response.statusCode).to.equal(200);
        var payload = JSON.parse(response.payload);
        expect(payload.bt_paywall).to.true();
        done();
      });
    });

  });

});
