/* jshint node: true */
'use strict';

// Bootstrap the testing harness.
const sinon = require('sinon');
const test_data = require('./data/test_data');
const MongoDB = require('./helpers/mongodb_helper');
const Bpc = require('./helpers/bpc_helper');
// const Permissions = require('./../server/permissions');

// Test shortcuts.
const { expect, describe, it, before, after } = exports.lab = require('lab').script();


describe('console - functional tests:', () => {

  const app = test_data.applications.console;
  var appTicket;


  before(done => {
    MongoDB.reset().then(done);
  });

  after(done => {
    MongoDB.clear().then(done);
  });

  // Getting the appTicket
  before(done => {
    Bpc.request({ method: 'POST', url: '/ticket/app' }, app)
    .then(response => {
      appTicket = response.result;
    })
    .then(() => done())
    .catch(done);
  });


  describe('regular console user', () => {

    const grant = test_data.grants.console_google_user__console_grant;
    var userTicket;

    it('getting user ticket', (done) => {
      Bpc.generateRsvp(app, grant)
      .then(rsvp => Bpc.request({ method: 'POST', url: '/ticket/user', payload: { rsvp: rsvp } }, appTicket))
      .then(response => {
        expect(response.statusCode).to.equal(200);
        userTicket = response.result;
        expect(userTicket.scope).to.be.an.array();
        expect(userTicket.scope).to.include('admin');
        expect(userTicket.scope).to.not.include('admin:*');
      })
      .then(() => done())
      .catch(done);
    });


    it('promote self to superadmin is forbidden', (done) => {

      const request = {
        method: 'POST',
        url: `/superadmin/${grant.id}`
      };

      Bpc.request(request, userTicket)
      .then((response) => {
        expect(response.statusCode).to.equal(403);
      })
      .then(() => done())
      .catch(done);
    });

    
    it('promote another user to superadmin is forbidden', (done) => {

      const grant_two = test_data.grants.console_google_user_two__console_grant;

      const request = {
        method: 'POST',
        url: `/superadmin/${grant_two.id}`
      };

      Bpc.request(request, userTicket)
      .then((response) => {
        expect(response.statusCode).to.equal(403);
      })
      .then(() => done())
      .catch(done);
    });
  });


  describe('superadmin', () => {

    const grant = test_data.grants.console_superadmin_google_user__console_grant;
    var userTicket;

    it('getting superadmin user ticket', (done) => {
      Bpc.generateRsvp(app, grant)
      .then(rsvp => Bpc.request({ method: 'POST', url: '/ticket/user', payload: { rsvp: rsvp } }, appTicket))
      .then(response => {
        expect(response.statusCode).to.equal(200);
        userTicket = response.result;
        expect(userTicket.scope).to.be.an.array();
        expect(userTicket.scope).to.include('admin');
        expect(userTicket.scope).to.include('admin:*');
      })
      .then(() => done())
      .catch(done);
    });


    it('demote self from superadmin fails', (done) => {
      const request = {
        method: 'DELETE',
        url: `/superadmin/${grant.id}`
      };

      Bpc.request(request, userTicket)
      .then((response) => {
        expect(response.statusCode).to.equal(403);
      })
      .then(() => done())
      .catch(done);
    });


    it('promote and demote another user to superadmin succeeds', (done) => {

      const another_grant = test_data.grants.console_google_user__console_grant;

      const promoteRequest = {
        method: 'POST',
        url: `/superadmin/${another_grant.id}`
      };

      const deomoteRequest = {
        method: 'POST',
        url: `/superadmin/${another_grant.id}`
      };

      Bpc.request(promoteRequest, userTicket)
      .then((response) => {
        expect(response.statusCode).to.equal(200);
      })
      .then(() => Bpc.request(deomoteRequest, userTicket))
      .then((response) => {
        expect(response.statusCode).to.equal(200);
      })
      .then(() => done())
      .catch(done);
    });
  });

});
