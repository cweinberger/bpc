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


describe('console - functional tests:', () => {

  var console_app = test_data.applications.console;
  var console_app_ticket;


  before(done => {
    bpc_helper.start().then(done);
  });

  // Getting the console_app_ticket
  before(done => {
    bpc_helper.getAppTicket(console_app)
    .then(result => {
      console_app_ticket = result;
    })
    .then(done)
    .catch(done);
  });



  describe('superadmin', () => {

    var console_superadmin_google_user = test_data.users.console_superadmin_google_user;
    var console_superadmin_google_user__console_grant = test_data.grants.console_superadmin_google_user__console_grant;
    var console_superadmin_google_user__console_rsvp;
    var console_superadmin_google_user__console_ticket;

    // User Getting the rsvp
    before((done) => {
      bpc_helper.generateRsvp(console_app, console_superadmin_google_user__console_grant, function(err, rsvp) {
        console_superadmin_google_user__console_rsvp = rsvp;
        done();
      });
    });

    it('getting superadmin user ticket', (done) => {
      bpc_helper.request({ method: 'POST', url: '/ticket/user', payload: { rsvp: console_superadmin_google_user__console_rsvp } }, console_app_ticket, (response) => {
        expect(response.statusCode).to.equal(200);
        console_superadmin_google_user__console_ticket = JSON.parse(response.payload);
        var scope = console_superadmin_google_user__console_ticket.scope;
        expect(scope).to.be.an.array();
        expect(scope).to.include('admin');
        expect(scope).to.include('admin:*');
        done();
      });
    });


    it('demote superadmin', (done) => {
      // TODO
      done();
    });
  });



  describe('non superadmin', () => {
    var console_google_user = test_data.users.console_google_user;
    var console_google_user__console_grant = test_data.grants.console_google_user__console_grant;
    var console_google_user_rsvp;
    var console_google_user_ticket;

    // User Getting the rsvp
    before((done) => {
      bpc_helper.generateRsvp(console_app, console_google_user__console_grant, function(err, rsvp) {
        console_google_user_rsvp = rsvp;
        done();
      });
    });

    it('getting user ticket', (done) => {
      bpc_helper.request({ method: 'POST', url: '/ticket/user', payload: { rsvp: console_google_user_rsvp } }, console_app_ticket, (response) => {
        expect(response.statusCode).to.equal(200);
        console_google_user_ticket = JSON.parse(response.payload);
        var scope = console_google_user_ticket.scope;
        expect(scope).to.be.an.array();
        expect(scope).to.include('admin');
        expect(scope).to.not.include('admin:*');
        done();
      });
    });


    it('promote superadmin', (done) => {
      // TODO
      done();
    });
  });

});
