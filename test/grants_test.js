/* jshint node: true */
'use strict';

// Bootstrap the testing harness.
const sinon = require('sinon');
const crypto = require('crypto');
const Boom = require('boom');
const test_data = require('./data/test_data');
const Bpc = require('./helpers/bpc_helper');
const MongoDB = require('./helpers/mongodb_helper');

// Test shortcuts.
const { expect, describe, it, before, after } = exports.lab = require('lab').script();


describe('grants tests', () => {

  const consoleApp = test_data.applications.console;
  var consoleAppTicket;
  const consoleGrant = test_data.grants.console_google_user__console_grant;
  var consoleUserTicket;
  const consoleSuperAdminGrant = test_data.grants.console_superadmin_google_user__console_grant;
  var consoleSuperAdminUserTicket;
  var grantIdToUpdate;

  
  before(done => {
    MongoDB.reset().then(done);
  });


  after(done => {
    MongoDB.clear().then(done);
  });


  // Getting the consoleAppTicket
  before(done => {
    Bpc.request({ method: 'POST', url: '/ticket/app' }, consoleApp)
    .then(response => {
      expect(response.statusCode).to.equal(200);
      consoleAppTicket = response.result;
    })
    .then(() => done())
    .catch(done);
  });


  // Getting the consoleUserTicket
  before(done => {
    Bpc.generateRsvp(consoleApp, consoleGrant)
    .then(rsvp => Bpc.request({ method: 'POST', url: '/ticket/user', payload: { rsvp: rsvp } }, consoleAppTicket))
    .then(response => {
      expect(response.statusCode).to.equal(200);
      consoleUserTicket = response.result;
    })
    .then(() => done())
    .catch(done);
  });


  // Getting the consoleSuperAdminUserTicket
  before(done => {
    Bpc.generateRsvp(consoleApp, consoleSuperAdminGrant)
    .then(rsvp => Bpc.request({ method: 'POST', url: '/ticket/user', payload: { rsvp: rsvp } }, consoleAppTicket))
    .then(response => {
      expect(response.statusCode).to.equal(200);
      consoleSuperAdminUserTicket = response.result;
    })
    .then(() => done())
    .catch(done);
  });

  
  describe('create', () => {

    it('badRequest for nonexisting app id', done => {

      const grant = {
        user: '117880216634946654515',
        scope: [
          'business:all',
          'bt:all'
        ]
      };

      Bpc.request({ url: '/applications/invalid-app/grants', method: 'POST', payload: grant }, consoleSuperAdminUserTicket)
      .then(response => {
        expect(response.statusCode).to.equal(400);
      })
      .then(() => done())
      .catch(done);
    });


    it('succeeds for valid app', done => {

      const grant = {
        user: '117880216634946654515',
        scope: [
          'business:all',
          'bt:all',
          'aok:all' // This one is not in the app, hence should not be in grant.
        ]
      };

      Bpc.request({ url: '/applications/valid-app/grants', method: 'POST', payload: grant }, consoleSuperAdminUserTicket)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        expect(response.result.app).to.equal('valid-app');
        // expect(response.result.user).to.equal(grant.user);
        expect(response.result.scope).to.be.an.array();
        expect(response.result.scope).to.have.length(0);
        expect(response.result.scope).not.to.contain('aok:all');
        grantIdToUpdate = response.result.id;
      })
      .then(() => done())
      .catch(done);
    });
  });


  describe('update grant', () => {

    it('only keeps the app scopes', done => {

      const grant = {
        app: 'valid-app',
        user: '117880216634946654515',
        scope: [
          'business:all',
          'bt:all',
          'b:all', // This one is not in the app, hence should not be in grant.
          'aok:all' // This one is not in the app, hence should not be in grant.
        ]
      };

      Bpc.request({ url: '/applications/valid-app/grants/'.concat(grantIdToUpdate), method: 'POST', payload: grant }, consoleSuperAdminUserTicket)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        expect(response.result).to.be.an.object();
        expect(response.result.scope).to.be.an.array();
        expect(response.result.scope).to.have.length(0);
        expect(response.result.scope).not.to.contain('b:all');
        expect(response.result.scope).not.to.contain('aok:all');
      })
      .then(() => done())
      .catch(done);
    });
  });

});
