/* jshint node: true */
'use strict';

// Bootstrap the testing harness.
const test_data = require('./data/test_data');
const Bpc = require('./helpers/bpc_helper');
const Gigya = require('./helpers/gigya_stub');
const MongoDB = require('./helpers/mongodb_helper');

// Test shortcuts.
const { expect, describe, it, before, after } = exports.lab = require('lab').script();



describe('validate - integration tests', () => {

  before(done => {
    MongoDB.reset().then(done);
  });

  after(done => {
    MongoDB.clear().then(done);
  });

  describe('validating an app ticket', () => {

    const app = test_data.applications.bt;
    var appTicket;

    // Getting the appTicket
    before(done => {
      Bpc.request({ method: 'POST', url: '/ticket/app' }, app)
      .then((response) => {
        appTicket = response.result;
      })
      .then(() => done())
      .catch(done);
    });


    it('validate fails when missing ticket', (done) => {
      Bpc.request({ method: 'GET', url: '/validate'})
      .then((response) => {
        expect(response.statusCode).to.equal(401);
      })
      .then(() => done())
      .catch(done);
    });


    it('validate succees when correct ticket', (done) => {
        Bpc.request({ method: 'GET', url: '/validate'}, appTicket)
        .then((response) => {
          expect(response.statusCode).to.equal(200);
        })
        .then(() => done())
        .catch(done);
      });


      it('validate fails when incorrect ticket app id', (done) => {
        const incorrectTicket = Object.assign({}, appTicket, { app: 'fake_app'});
        Bpc.request({ method: 'GET', url: '/validate'}, incorrectTicket)
        .then((response) => {
          expect(response.statusCode).to.equal(401);
        })
        .then(() => done())
        .catch(done);
      });


      it('validate fails when incorrect ticket key', (done) => {
        const incorrectTicket = Object.assign({}, appTicket, { key: 'djfhskldjhflksdjhfkljsdh'});
        Bpc.request({ method: 'GET', url: '/validate'}, incorrectTicket)
        .then((response) => {
          expect(response.statusCode).to.equal(401);
        })
        .then(() => done())
        .catch(done);
      });


      it('validate fails when incorrect scope', (done) => {
        Bpc.request({ method: 'GET', url: '/validate/berlingske'}, appTicket)
        .then((response) => {
          expect(response.statusCode).to.equal(403);
        })
        .then(() => done())
        .catch(done);
      });


      it('validate succeeds when correct scope', (done) => {
        Bpc.request({ method: 'GET', url: '/validate/bt'}, appTicket)
        .then((response) => {
          expect(response.statusCode).to.equal(200);
        })
        .then(() => done())
        .catch(done);
      });
  });


  describe('validating a user ticket', () => {

    const app = test_data.applications.bt;
    var appTicket;
    const simple_first_user = test_data.users.simple_first_user;
    const grant = test_data.grants.simple_first_user_bt_grant;
    var userTicket;

    // Getting the appTicket
    before(done => {
      Bpc.request({ method: 'POST', url: '/ticket/app' }, app)
      .then((response) => {
        appTicket = response.result;
      })
      .then(() => Bpc.generateRsvp(app, grant))
      .then(rsvp => Bpc.request({ method: 'POST', url: '/ticket/user', payload: { rsvp: rsvp } }, appTicket))
      .then(response => {
        userTicket = response.result;
      })
      .then(() => done())
      .catch(done);
    });


    it('validate succees when correct ticket', (done) => {
      Bpc.request({ method: 'GET', url: '/validate'}, userTicket)
      .then((response) => {
        expect(response.statusCode).to.equal(200);
      })
      .then(() => done())
      .catch(done);
    });


    it('validate fails when incorrect ticket key', (done) => {
      const incorrectTicket = Object.assign({}, userTicket, { key: 'kdjghdkfljghdf'});
      Bpc.request({ method: 'GET', url: '/validate'}, incorrectTicket)
      .then((response) => {
        expect(response.statusCode).to.equal(401);
      })
      .then(() => done())
      .catch(done);
    });


    it('validate succeeds when correct scope', (done) => {
      Bpc.request({ method: 'GET', url: '/validate/bt'}, userTicket)
      .then((response) => {
        expect(response.statusCode).to.equal(200);
      })
      .then(() => done())
      .catch(done);
    });


    it('validate fails when incorrect ticket scope', (done) => {
      Bpc.request({ method: 'GET', url: '/validate/berlingske'}, userTicket)
      .then((response) => {
        expect(response.statusCode).to.equal(403);
      })
      .then(() => done())
      .catch(done);
    });
  });
});
