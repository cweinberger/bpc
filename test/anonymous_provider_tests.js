/* jshint node: true */
'use strict';

// Bootstrap the testing harness.
const sinon = require('sinon');
const test_data = require('./data/test_data');
const Bpc = require('./helpers/bpc_helper');
const Gigya = require('./helpers/gigya_stub');
const MongoDB = require('./helpers/mongodb_helper');

// Test shortcuts.
const { expect, describe, it, before, after } = exports.lab = require('lab').script();

describe('anonymous users - integration tests', () => {

  var app = test_data.applications.app_with_anonymous_scope;
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


  describe('new anonymous ticket without fingerprint', () => {

    let anonymousUserTicket;

    it('getting ticket without fingerprint', (done) => {

      Bpc.request({
        method: 'GET',
        url: `/au/ticket?app=${app.id}`
      })
      .then(response => {
        expect(response.statusCode).to.be.equal(200);
        expect(response.headers).to.include('set-cookie');
        expect(response.headers['set-cookie'][0]).to.include('auid=auid**');

        anonymousUserTicket = response.result;

        expect(anonymousUserTicket.exp).to.not.be.null();
        expect(anonymousUserTicket.exp).to.be.above(0);
        expect(anonymousUserTicket.scope).to.be.an.array();
        expect(anonymousUserTicket.scope).to.have.length(1);
        expect(anonymousUserTicket.scope).to.only.include('anonymous');
        expect(anonymousUserTicket.user).to.startWith('auid**');
        expect(anonymousUserTicket.grant).to.startWith('agid**');
        expect(anonymousUserTicket.app).to.equal(app.id);
      })
      .then(() => done())
      .catch(done);
    });
  });


  describe('disallow anonymous ticket for apps without settings.allowAnonymousUsers', () => {

    it('getting ticket without fingerprint', (done) => {

      Bpc.request({
        method: 'GET',
        url: `/au/ticket?app=${test_data.applications.app_with_profile_scope.id}`
      }, null)
      .then(response => {
        expect(response.statusCode).to.be.equal(401);
      })
      .then(() => done())
      .catch(done);
    });
  });


  describe('a known fingerprint', () => {

    // A random, but valid UUID
    const fingerprint = 'auid**e64f340a-84c6-466f-ad72-b5f9966e36fa';

    it('getting anonymous user permissions without any there', (done) => {

      Bpc.request({ method: 'GET', url: '/permissions/' + fingerprint + '/anonymous'}, appTicket)
      .then(response => {
        // console.log('response', response);
        expect(response.statusCode).to.equal(404);
      })
      .then(() => done())
      .catch(done);
    });


    it('setting new anonymous user permissions', (done) => {

      var payload = {
        buy_model: 'A'
      };

      Bpc.request({ method: 'POST', url: '/permissions/' + fingerprint + '/anonymous', payload: payload}, appTicket)
      .then(response => {
        expect(response.statusCode).to.equal(200);
      })
      .then(() => done())
      // TODO: test for ttl in MongoDB collection
      .catch(done);
    });


    it('getting anonymous user permissions now there is data', (done) => {

      Bpc.request({ method: 'GET', url: '/permissions/' + fingerprint + '/anonymous'}, appTicket)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        expect(response.result.buy_model).to.equal('A');
      })
      .then(() => done())
      .catch(done);
    });



    describe('using the fingerprint', () => {

      let anonymousUserTicket;

      it('getting ticket from the fingerprint', (done) => {

        const headers = {
          'cookie': 'auid=' + fingerprint
        };

        Bpc.request({
          method: 'GET',
          url: `/au/ticket?app=${app.id}`,
          headers: headers
        })
        .then(response => {

          expect(response.statusCode).to.be.equal(200);
          expect(response.headers).to.not.include('set-cookie');

          anonymousUserTicket = response.result;

          expect(anonymousUserTicket.exp).to.not.be.null();
          expect(anonymousUserTicket.exp).to.be.above(0);
          expect(anonymousUserTicket.scope).to.be.an.array();
          expect(anonymousUserTicket.scope).to.have.length(1);
          expect(anonymousUserTicket.scope).to.only.include('anonymous');
          expect(anonymousUserTicket.user).to.startWith('auid**');
          expect(anonymousUserTicket.user).to.be.equal(fingerprint);
          expect(anonymousUserTicket.grant).to.startWith('agid**');
          expect(anonymousUserTicket.app).to.equal(app.id);
        })
        .then(() => done())
        .catch(done);
      });

      it('getting permissions using the anonymous ticket', (done) => {
        Bpc.request({ method: 'GET', url: '/au/audata'}, anonymousUserTicket)
        .then(response => {
          expect(response.statusCode).to.equal(200);
          expect(response.result.buy_model).to.equal('A');
        })
        .then(() => done())
        .catch(done);
      });

      it('using the anonymous ticket for unallowed scope', (done) => {
        Bpc.request({ method: 'GET', url: '/permissions/anothernotanonynmousscope'}, anonymousUserTicket)
        .then(response => {
          expect(response.statusCode).to.equal(403);
        })
        .then(() => done())
        .catch(done);
      });

    });
  });
});
