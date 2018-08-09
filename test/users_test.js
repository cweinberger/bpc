/* jshint node: true */
'use strict';

// Bootstrap the testing harness.
const test_data = require('./data/test_data');
const Bpc = require('./helpers/bpc_helper');
const Gigya = require('./helpers/gigya_stub');
const MongoDB = require('./helpers/mongodb_helper');

// Test shortcuts.
const { expect, describe, it, before, after } = exports.lab = require('lab').script();



describe('users - integration tests', () => {

  before(done => {
    MongoDB.reset().then(done);
  });

  after(done => {
    MongoDB.clear().then(done);
  });

  describe('creating a user with an app ticket', () => {

  });


  describe('getting user with an app ticket', () => {

    const bt = test_data.applications.bt;
    var appTicket;
    const simple_first_user = test_data.users.simple_first_user;

    // Getting the appTicket
    before(done => {
      Bpc.request({ method: 'POST', url: '/ticket/app' }, bt)
      .then((response) => {
        appTicket = response.result;
      })
      .then(() => done())
      .catch(done);
    });


    it('getting first user bt permissions', (done) => {
      Bpc.request({ method: 'GET', url: '/permissions/' + simple_first_user.id + '/bt'}, appTicket)
      .then((response) => {
        expect(response.statusCode).to.equal(200);
        expect(response.result.bt_paywall).to.true();
      })
      .then(() => done())
      .catch(done);
    });
  });


  describe('deleting user using an application with admin scope', () => {

    const app = test_data.applications.app_with_admin_scope;
    let appTicket;

    // Getting the appTicket
    before(done => {
      Bpc.request({ method: 'POST', url: '/ticket/app' }, app)
      .then((response) => {
        expect(response.statusCode).to.equal(200);
        appTicket = response.result;
      })
      .then(() => done())
      .catch(done);
    });


    it('delete user fails', done => {

      const simple_second_user = test_data.users.simple_second_user;

      const request = {
        method: 'DELETE',
        url: `/users/${simple_second_user._id}`
      };

      Bpc.request(request, appTicket)
      .then((response) => {
        expect(response.statusCode).to.equal(403);
      })
      .then(() => done())
      .catch(done);
    });
  });


  describe('deleting user using an application with superadmin scope', () => {

    const app = test_data.applications.console;
    let appTicket;
    const simple_second_user = test_data.users.simple_second_user;
    const deleteUserRequest = {
      method: 'DELETE',
      url: `/users/${simple_second_user._id}`
    };

    // Getting the appTicket
    before(done => {
      Bpc.request({ method: 'POST', url: '/ticket/app' }, app)
      .then((response) => {
        expect(response.statusCode).to.equal(200);
        appTicket = response.result;
      })
      .then(() => done())
      .catch(done);
    });


    it('delete user with appTicket fails', done => {
      Bpc.request(deleteUserRequest, appTicket)
      .then((response) => {
        expect(response.statusCode).to.equal(403);
      })
      .then(() => done())
      .catch(done);
    });


    it('delete user with userTicket succeeds', done => {

      const grant = test_data.grants.console_superadmin_google_user__console_grant;
      var userTicket;

      Bpc.generateRsvp(app, grant)
      .then(rsvp => Bpc.request({ method: 'POST', url: '/ticket/user', payload: { rsvp: rsvp } }, appTicket))
      .then(response => {
        expect(response.statusCode).to.equal(200);
        userTicket = response.result;
      })
      .then(() => Bpc.request(deleteUserRequest, userTicket))
      .then((response) => {
        expect(response.statusCode).to.equal(200);
      })
      .then(() => MongoDB.collection('users').find({ id: simple_second_user.id }).toArray())
      .then(result => {
        expect(result.length).to.equal(0);
      })
      .then(() => MongoDB.collection('grants').find({ user: simple_second_user._id }).toArray())
      .then(result => {
        expect(result.length).to.equal(0);
      })
      .then(() => MongoDB.collection('deleted_users').find({ id: simple_second_user.id }).toArray())
      .then(result => {
        expect(result.length).to.equal(1);
      })
      .then(() => done())
      .catch(done);
    });
  });
});
