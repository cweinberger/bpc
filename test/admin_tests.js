/* jshint node: true */
'use strict';

const test_data = require('./data/test_data');
const bpc_helper = require('./helpers/bpc_helper');
const MongoDB = require('./helpers/mongodb_mock');

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
    bpc_helper.request({ method: 'POST', url: '/ticket/app' }, consoleApp)
    .then(response => {
      expect(response.statusCode).to.equal(200);
      consoleAppTicket = response.result;
      done();
    })
    .catch(done);
  });


  // Getting the consoleUserTicket
  before(done => {
    bpc_helper.generateRsvp(consoleApp, consoleGrant)
    .then(rsvp => bpc_helper.request({ method: 'POST', url: '/ticket/user', payload: { rsvp: rsvp } }, consoleAppTicket))
    .then(response => {
      expect(response.statusCode).to.equal(200);
      consoleUserTicket = response.result;
      done();
    });
  });



  // I know these tests do NOT test the actual code.These are just examples.
  describe('the scope containing', () => {

    it('only admin not allowed', (done) => {
      // const result = Joi.validate(['admin'], Applications.scopeValidation);
      // expect(result.error).to.exist();
      done();
    });

    it('only admin: not allowed', (done) => {
      // const result = Joi.validate(['admin:'], Applications.scopeValidation);
      // expect(result.error).to.exist();
      done();
    });

    it('only sadmin allowed', (done) => {
      // const result = Joi.validate(['sadmin'], Applications.scopeValidation);
      // expect(result.error).to.not.exist();
      done();
    });

    it('only sdmin allowed', (done) => {
      // const result = Joi.validate(['sdmin'], Applications.scopeValidation);
      // expect(result.error).to.not.exist();
      done();
    });

    it('only a allowed', (done) => {
      // const result = Joi.validate(['a'], Applications.scopeValidation);
      // expect(result.error).to.not.exist();
      done();
    });

    it('both a and b allowed', (done) => {
      // const result = Joi.validate(['a', 'b'], Applications.scopeValidation);
      // expect(result.error).to.not.exist();
      done();
    });

    it('both admin and b not allowed', (done) => {
      // const result = Joi.validate(['admin', 'b'], Applications.scopeValidation);
      // expect(result.error).to.exist();
      done();
    });

    it('both a and admin not allowed', (done) => {
      // const result = Joi.validate(['a', 'admin'], Applications.scopeValidation);
      // expect(result.error).to.exist();
      done();
    });

  });



  describe('making a simple user admin', () => {

    if(MongoDB.isMock){
      return;
    }

    var simpleFirstUserTicket;

    it('create new app by console user', done => {

      const newApp = {
        id: 'new-app-to-simple-user',
        scope: [ ],
        delegate: false,
        algorithm: 'sha256'
      };

      bpc_helper.request({ url: '/applications', method: 'POST', payload: newApp }, consoleUserTicket)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        done();
      })
      .catch(done);
    });


    it('refresh console ticket to get new admin:app scope', done => {
      bpc_helper.generateRsvp(consoleApp, consoleGrant)
      .then(rsvp => bpc_helper.request({ method: 'POST', url: '/ticket/user', payload: { rsvp: rsvp } }, consoleAppTicket))
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

      bpc_helper.request({ url: '/users?email=first_user@berlingskemedia.dk' }, consoleUserTicket)
      .then(response => {
        return Promise.resolve(response.result[0]);
      })
      .then(user => bpc_helper.request({ url: '/applications/new-app-to-simple-user/makeadmin', method: 'POST', payload: { user: user._id} }, consoleUserTicket))
      .then(response => {
        expect(response.statusCode).to.equal(200);
        done();
      })
      .catch(done);
    });


    it('simple user now has grant to console', done => {
      // Finding the new grant to be able to generate RSVP
      bpc_helper.request({ url: '/users?email=first_user@berlingskemedia.dk' }, consoleUserTicket)
      .then(response => {
        return Promise.resolve(response.result[0]);
      })
      .then(user => MongoDB.collection('grants').findOne({app: 'console', user: user._id }))
      .then(grant => bpc_helper.generateRsvp(consoleApp, grant))
      .then(rsvp => bpc_helper.request({ method: 'POST', url: '/ticket/user', payload: { rsvp: rsvp } }, consoleAppTicket))
      .then(response => {
        expect(response.statusCode).to.equal(200);
        simpleFirstUserTicket = response.result;
        done();
      })
      .catch(done);
    });

  });

});
