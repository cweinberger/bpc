/* jshint node: true */
'use strict';

// Bootstrap the testing harness.
const sinon = require('sinon');
const crypto = require('crypto');
const Boom = require('boom');
const test_data = require('./data/test_data');
const Bpc = require('./helpers/bpc_helper');
const MongoDB = require('./helpers/mongodb_helper');
const Gigya = require('./helpers/gigya_stub');
const ObjectID = require('mongodb').ObjectID;

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

      Bpc.request({ url: '/applications/invalid_app/grants', method: 'POST', payload: grant }, consoleSuperAdminUserTicket)
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

      Bpc.request({ url: '/applications/valid_app/grants', method: 'POST', payload: grant }, consoleSuperAdminUserTicket)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        expect(response.result.app).to.equal('valid_app');
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
        app: 'valid_app',
        user: '117880216634946654515',
        scope: [
          'business:all',
          'bt:all',
          'b:all', // This one is not in the app, hence should not be in grant.
          'aok:all' // This one is not in the app, hence should not be in grant.
        ]
      };

      Bpc.request({ url: '/applications/valid_app/grants/'.concat(grantIdToUpdate), method: 'POST', payload: grant }, consoleSuperAdminUserTicket)
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


  describe('convert old grant type to new', () => {

    const old_type_grant = {
      id: 'kfjhsdkjfhsdklh234789jkhsdfs8',
      app: 'bt',
      user: 'xyx@berlingskemedia.dk',
      scope: [],
      exp: null
    };

    before(done => {
      MongoDB.collection('grants')
      .insert(old_type_grant)
      .then(() => done());
    });

    before(done => {
      Gigya.callApi.resolves({body: {UID: '137802111134346654517', profile: {email: 'xyx@berlingskemedia.dk'}}});
      done();
    });

    it('get RSVP converts the grant.user to ObjectID', done => {
      const rsvp_request = {
        method: 'POST',
        url: '/rsvp',
        payload: {
          UID: '137802111134346654517',
          UIDSignature:'UIDSignature_random',
          signatureTimestamp:'signatureTimestamp_random',
          app: 'bt'
        }
      };
     
      Bpc.request(rsvp_request)
      .then(response => {
        expect(response.statusCode).to.be.equal(200);
        expect(response.result.rsvp).to.be.a.string();
      })
      .then(() => {
        // Wating a second to make sure the grant is saved to MongoDB
        return new Promise(resolve => setTimeout(resolve, 1000));
      })
      .then(() => MongoDB.collection('grants').findOne({ id: old_type_grant.id }))
      .then(grant => {
        expect(grant).to.not.be.null();
        expect(grant.user).to.not.be.equal('xyx@berlingskemedia.dk');
        expect(grant.user).to.be.equal(new ObjectID("5b32129f4e094108d0e8a786"));
        expect(grant.app).to.be.equal('bt');
      })
      .then(() => done())
      .catch(done);
    })
  });

});
