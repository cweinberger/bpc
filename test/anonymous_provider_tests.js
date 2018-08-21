/* jshint node: true */
'use strict';

// Bootstrap the testing harness.
const sinon = require('sinon');
const test_data = require('./data/test_data');
const Bpc = require('./helpers/bpc_helper');
const MongoDB = require('./helpers/mongodb_helper');

// Test shortcuts.
const { expect, describe, it, before, after } = exports.lab = require('lab').script();

describe('anonymous users - integration tests', () => {


  before(done => {
    MongoDB.reset().then(done);
  });

  after(done => {
    MongoDB.clear().then(done);
  });



  describe('a new anonymous user getting ticket', () => {

    const app = test_data.applications.app_with_anonymous_scope;
    let anonymousUserTicket;

    it('with app id succeeds', (done) => {

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
      .then(() => MongoDB.collection('users').find({ id: anonymousUserTicket.user }).toArray())
      .then(result => {
        expect(result).not.to.be.null();
        expect(result.length).to.equal(1);
      })
      .then(() => done())
      .catch(done);
    });


    it('omitting app id only gives new auid and no ticket', (done) => {

      Bpc.request({
        method: 'GET',
        url: `/au/ticket`
      })
      .then(response => {
        expect(response.statusCode).to.be.equal(200);
        expect(response.headers).to.include('set-cookie');
        expect(response.headers['set-cookie'][0]).to.include('auid=auid**');

        expect(response.result.user).to.not.be.null();
        expect(response.result.user).to.startWith('auid**');
        expect(response.result.app).to.not.exist();
        expect(response.result.grant).to.not.exist();
        expect(response.result.scope).to.not.exist();
      })
      .then(() => done())
      .catch(done);
    });
  });


  describe('disallow anonymous ticket for apps without settings.allowAnonymousUsers', () => {

    it('getting ticket fails', (done) => {

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


  describe('getting data for a known auid', () => {

    // A random, but valid UUID
    const known_auid = 'auid**e64f340a-84c6-466f-ad72-b5f9966e36fa';
    let anonymousUserTicket;

    describe('using the auid in a cookie', () => {

      const app = test_data.applications.app_with_anonymous_scope;

      it('getting anonymous ticket for existing auid in custom header', (done) => {

        Bpc.request({
          method: 'GET',
          url: `/au/ticket?app=${app.id}`,
          headers: {
            'X-BPC-AUID': known_auid
          }
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
          expect(anonymousUserTicket.user).to.be.equal(known_auid);
          expect(anonymousUserTicket.grant).to.startWith('agid**');
          expect(anonymousUserTicket.app).to.equal(app.id);
        })
        .then(() => MongoDB.collection('users').find({ id: known_auid }).toArray())
        .then(result => {
          expect(result.length).to.equal(1);
          expect(result[0].lastLogin).to.be.a.date();
          expect(result[0].expiresAt).to.be.a.date();
          expect(result[0].dataUser).to.be.an.object();
        })
        .then(() => done())
        .catch(done);
      });


      it('getting anonymous ticket for existing auid in cookie', (done) => {

        Bpc.request({
          method: 'GET',
          url: `/au/ticket?app=${app.id}`,
          headers: {
            'cookie': 'auid=' + known_auid
          }
        })
        .then(response => {

          expect(response.statusCode).to.be.equal(200);
          expect(response.headers).to.not.include('set-cookie');
          expect(response.result.exp).to.not.be.null();
          expect(response.result.exp).to.be.above(0);
          expect(response.result.scope).to.be.an.array();
          expect(response.result.scope).to.have.length(1);
          expect(response.result.scope).to.only.include('anonymous');
          expect(response.result.user).to.startWith('auid**');
          expect(response.result.user).to.be.equal(known_auid);
          expect(response.result.grant).to.startWith('agid**');
          expect(response.result.app).to.equal(app.id);
        })
        .then(() => MongoDB.collection('users').find({ id: known_auid }).toArray())
        .then(result => {
          expect(result.length).to.equal(1);
          expect(result[0].lastLogin).to.be.a.date();
          expect(result[0].expiresAt).to.be.a.date();
        })
        .then(() => done())
        .catch(done);
      });


      it('getting data using the anonymous ticket creates user in MongoDB', (done) => {

        Bpc.request({
          method: 'GET',
          url: '/au/data'
        },
        anonymousUserTicket)
        .then(response => {
          expect(response.statusCode).to.equal(200);
        })
        .then(() => MongoDB.collection('users').find({ id: known_auid }).toArray())
        .then(result => {
          expect(result.length).to.equal(1);
          expect(result[0].lastFetched).to.be.a.date();
          expect(result[0].expiresAt).to.be.a.date();
        })
        .then(() => done())
        .catch(done);
      });


      it('setting anonymous user permissions with anonymous ticket', (done) => {

        Bpc.request({
          method: 'POST',
          url: '/au/data',
          payload: {
            some_user_data: 'ABCD'
          }
        },
        anonymousUserTicket)
        .then(response => {
          expect(response.statusCode).to.equal(200);
        })
        .then(() => MongoDB.collection('users').find({ id: known_auid }).toArray())
        .then(result => {
          expect(result.length).to.equal(1);
          expect(result[0].dataUser).to.be.an.object();
          expect(result[0].dataUser.anonymous.some_user_data).to.be.equal('ABCD');
        })
        .then(() => done())
        .catch(done);
      });


      it('using the anonymous ticket for allowed anonymous scope - but is empty', (done) => {

        Bpc.request({
          method: 'GET',
          url: '/permissions/anonymous'
        },
        anonymousUserTicket)
        .then(response => {
          expect(response.statusCode).to.equal(200);
          expect(response.result).to.equal({});
        })
        .then(() => done())
        .catch(done);
      });


      it('using the anonymous ticket for unallowed scope', (done) => {

        Bpc.request({
          method: 'GET',
          url: '/permissions/a_private_scope'
        },
        anonymousUserTicket)
        .then(response => {
          expect(response.statusCode).to.equal(403);
        })
        .then(() => done())
        .catch(done);
      });

    });


    describe('getting data with an app ticket for a known anonymous user', () => {

      const app = test_data.applications.app_with_anonymous_scope;
      var appTicket;

      // Getting the appTicket
      before(done => {
        Bpc.request({ method: 'POST', url: '/ticket/app' }, app)
        .then(response => {
          appTicket = response.result;
        })
        .then(() => done())
        .catch(done);
      });


      it('getting user data even if the anonymous scope is empty', (done) => {

        Bpc.request({
          method: 'GET',
          url: '/permissions/' + known_auid + '/anonymous'
        },
        appTicket)
        .then(response => {
          expect(response.statusCode).to.equal(200);
        })
        .then(() => done())
        .catch(done);
      });


      it('setting new anonymous user data in the anonymous scope', (done) => {

        Bpc.request({
          method: 'POST',
          url: '/permissions/' + known_auid + '/anonymous',
          payload: {
            buy_model: 'A'
          }
        },
        appTicket)
        .then(response => {
          expect(response.statusCode).to.equal(200);
        })
        .then(() => MongoDB.collection('users').find({ id: known_auid }).toArray())
        .then(result => {
          expect(result.length).to.equal(1);
          expect(result[0].dataScopes.anonymous).to.be.an.object();
          expect(result[0].dataScopes.anonymous.buy_model).to.be.equal('A');
        })
        .then(() => done())
        // TODO: test for ttl in MongoDB collection
        .catch(done);
      });


      it('getting anonymous user permissions with app ticket', (done) => {

        Bpc.request({
          method: 'GET',
          url: '/permissions/' + known_auid + '/anonymous'
        },
        appTicket)
        .then(response => {
          expect(response.statusCode).to.equal(200);
          expect(response.result.buy_model).to.equal('A');
        })
        .then(() => done())
        .catch(done);
      });


      it('setting new user data in the private scope', (done) => {

        Bpc.request({
          method: 'POST',
          url: `/permissions/${known_auid}/a_private_scope`,
          payload: {
            sell_model: 'C'
          }
        },
        appTicket)
        .then(response => {
          expect(response.statusCode).to.equal(200);
        })
        .then(() => MongoDB.collection('users').find({ id: known_auid }).toArray())
        .then(result => {
          expect(result.length).to.equal(1);
          expect(result[0].dataScopes.a_private_scope).to.be.an.object();
          expect(result[0].dataScopes.a_private_scope.sell_model).to.be.equal('C');
        })
        .then(() => done())
        .catch(done);
      });
  
  
      it('getting the user data from the private scope', (done) => {

        Bpc.request({
          method: 'GET',
          url: `/permissions/${known_auid}/a_private_scope`
        },
        appTicket)
        .then(response => {
          expect(response.statusCode).to.equal(200);
          expect(response.result.sell_model).to.equal('C');
        })
        .then(() => done())
        .catch(done);
      });
    });
  });
});
