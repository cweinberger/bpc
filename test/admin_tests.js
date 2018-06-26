/* jshint node: true */
'use strict';

const test_data = require('./data/test_data');
const Bpc = require('./helpers/bpc_helper');
const MongoDB = require('./helpers/mongodb_helper');

// Test shortcuts.
const { expect, describe, it, before, after } = exports.lab = require('lab').script();


describe('admin tests', () => {

  const consoleApp = test_data.applications.console;
  var consoleAppTicket;

  const consoleGrant = test_data.grants.console_google_user__console_grant;
  var consoleUserTicket;

  const consoleSuperAdminGrant = test_data.grants.console_superadmin_google_user__console_grant;
  var consoleSuperAdminUserTicket;



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
      done();
    })
    .catch(done);
  });


  // Getting the consoleUserTicket
  before(done => {
    Bpc.generateRsvp(consoleApp, consoleGrant)
    .then(rsvp => Bpc.request({ method: 'POST', url: '/ticket/user', payload: { rsvp: rsvp } }, consoleAppTicket))
    .then(response => {
      expect(response.statusCode).to.equal(200);
      consoleUserTicket = response.result;
      done();
    });
  });



  describe('making a simple user admin', () => {

    var simpleFirstUserTicket;

    it('create new app by console user', done => {

      const newApp = {
        id: 'new-app-to-simple-user',
        scope: [ ],
        delegate: false,
        algorithm: 'sha256'
      };

      Bpc.request({ url: '/applications', method: 'POST', payload: newApp }, consoleUserTicket)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        done();
      })
      .catch(done);
    });


    it('refresh console ticket to get new admin:app scope', done => {
      Bpc.generateRsvp(consoleApp, consoleGrant)
      .then(rsvp => Bpc.request({ method: 'POST', url: '/ticket/user', payload: { rsvp: rsvp } }, consoleAppTicket))
      .then(response => {
        expect(response.statusCode).to.equal(200);
        consoleUserTicket = response.result;
        expect(consoleUserTicket.scope).to.include('admin:new-app-to-simple-user');
        done();
      })
      .catch(done);
    });


    it('simple user is made admin', done => {
      const payload = {
        user: 'first_user@berlingskemedia.dk'
      };

      Bpc.request({ url: '/users?email=first_user@berlingskemedia.dk' }, consoleUserTicket)
      .then(response => {
        return Promise.resolve(response.result[0]);
      })
      .then(user => Bpc.request({ url: '/applications/new-app-to-simple-user/makeadmin', method: 'POST', payload: { user: user._id} }, consoleUserTicket))
      .then(response => {
        expect(response.statusCode).to.equal(200);
        done();
      })
      .catch(done);
    });


    it('simple user now has grant to console', done => {
      // Finding the new grant to be able to generate RSVP
      Bpc.request({ url: '/users?email=first_user@berlingskemedia.dk' }, consoleUserTicket)
      .then(response => {
        return Promise.resolve(response.result[0]);
      })
      .then(user => MongoDB.collection('grants').findOne({app: 'console', user: user._id }))
      .then(grant => Bpc.generateRsvp(consoleApp, grant))
      .then(rsvp => Bpc.request({ method: 'POST', url: '/ticket/user', payload: { rsvp: rsvp } }, consoleAppTicket))
      .then(response => {
        expect(response.statusCode).to.equal(200);
        simpleFirstUserTicket = response.result;
        done();
      })
      .catch(done);
    });

  });

});
