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

  let app = test_data.applications.app_with_admin_scope;
  let appTicket;

  before(done => {
    MongoDB.reset().then(done);
  });

  after(done => {
    MongoDB.clear().then(done);
  });

  
  describe('Getting Gigya user details using an appTicket', () => {

    const app = test_data.applications.app_with_admin_scope;
    let appTicket;

    // Getting the appTicket
    before(done => {
      Bpc.request({ method: 'POST', url: '/ticket/app' }, app)
      .then((response) => {
        expect(response.statusCode).to.equal(200);
        appTicket = response.result;
        done();
      });
    });

    before(done => {
      Gigya.callApi.reset();
      Gigya.callApi.onFirstCall().resolves({body: {regToken: 'randomRegToken1234'}});
      Gigya.callApi.onSecondCall().resolves({body: {UID: 'randomUID1234'}});
      done();
    });
  
    after(done => {
      Gigya.callApi.reset();
      done();
    });


    it('get Gigya email from UID', done => {
      Bpc.request({url: '/gigya?UID=3218736128736123215732'}, appTicket)
      .then((response) => {
        expect(response.statusCode).to.equal(200);
        expect(response.result.UID).to.equal('3218736128736123215732');
        expect(response.result.email).to.equal('first_user@berlingskemedia.dk');
      })
      .then(() => done())
      .catch(done);
    });


    it('get Gigya UID from email', done => {
      Bpc.request({url: '/gigya?email=first_user@berlingskemedia.dk'}, appTicket)
      .then((response) => {
        expect(response.statusCode).to.equal(200);
        expect(response.result.UID).to.equal('3218736128736123215732');
        expect(response.result.email).to.equal('first_user@berlingskemedia.dk');
      })
      .then(() => done())
      .catch(done);
    });


    it('invalid trying to GET /gigya with no query params', done => {
      Bpc.request({url: '/gigya'}, appTicket)
      .then((response) => {
        expect(response.statusCode).to.equal(400);
      })
      .then(() => done())
      .catch(done);
    });

    it('invalid trying to GET /gigya with too many query params', done => {
      Bpc.request({url: '/gigya?email=someemail&UID=someuid'}, appTicket)
      .then((response) => {
        expect(response.statusCode).to.equal(400);
      })
      .then(() => done())
      .catch(done);
    });
  });
});
