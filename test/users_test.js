/* jshint node: true */
'use strict';

// Bootstrap the testing harness.
const Code = require('code');   // assertion library
const Lab = require('lab');
const lab = exports.lab = Lab.script();
const rewire = require('rewire');
const sinon = require('sinon');
const bpc_helper = require('./bpc_helper');
// const Permissions = require('./../server/permissions');

// Test shortcuts.
const describe = lab.describe;
const it = lab.it;
const expect = Code.expect;
const before = lab.before;
const after = lab.after;


describe('users - functional tests', () => {

  before(done => {
    bpc_helper.initate(function(){
      done();
    });
  });


  describe('getting user with an app ticket', () => {

    var appTicket;
    var bt = bpc_helper.apps.bt;
    var first = bpc_helper.users.simple_first_user;

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
