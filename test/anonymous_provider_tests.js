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


  before(done => {
    MongoDB.reset().then(done);
  });

  after(done => {
    MongoDB.clear().then(done);
  });



  describe('a new anonymous user', () => {

    const app = test_data.applications.app_with_anonymous_scope;
    let anonymousUserTicket;

    it('getting ticket and gives new auid', (done) => {

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

    it('omitting app id only gives new auid', (done) => {

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

      it('getting user data fails if the anonymous scope is empty', (done) => {

        Bpc.request({ method: 'GET', url: '/permissions/' + known_auid + '/anonymous'}, appTicket)
        .then(response => {
          // console.log('response', response);
          expect(response.statusCode).to.equal(404);
        })
        .then(() => done())
        .catch(done);
      });


      it('setting new anonymous user data in the anonymous scope', (done) => {

        var payload = {
          buy_model: 'A'
        };

        Bpc.request({ method: 'POST', url: '/permissions/' + known_auid + '/anonymous', payload: payload}, appTicket)
        .then(response => {
          expect(response.statusCode).to.equal(200);
        })
        .then(() => done())
        // TODO: test for ttl in MongoDB collection
        .catch(done);
      });


      it('getting anonymous user permissions now returns data', (done) => {

        Bpc.request({ method: 'GET', url: '/permissions/' + known_auid + '/anonymous'}, appTicket)
        .then(response => {
          expect(response.statusCode).to.equal(200);
          expect(response.result.buy_model).to.equal('A');
        })
        .then(() => done())
        .catch(done);
      });
    });


    describe('using the auid in a cookie', () => {

      const app = test_data.applications.app_with_anonymous_scope;
      let anonymousUserTicket;

      it('getting anonymous ticket for existing auid', (done) => {

        const headers = {
          'cookie': 'auid=' + known_auid
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
          expect(anonymousUserTicket.user).to.be.equal(known_auid);
          expect(anonymousUserTicket.grant).to.startWith('agid**');
          expect(anonymousUserTicket.app).to.equal(app.id);
        })
        .then(() => done())
        .catch(done);
      });


      it('getting data using the anonymous ticket', (done) => {
        Bpc.request({ method: 'GET', url: '/au/audata'}, anonymousUserTicket)
        .then(response => {
          expect(response.statusCode).to.equal(200);
          expect(response.result.buy_model).to.equal('A');
        })
        .then(() => done())
        .catch(done);
      });


      it('using the anonymous ticket for unallowed scope', (done) => {
        Bpc.request({ method: 'GET', url: '/permissions/a_private_scope'}, anonymousUserTicket)
        .then(response => {
          expect(response.statusCode).to.equal(403);
        })
        .then(() => done())
        .catch(done);
      });

    });
  });


  describe('using anonymous users in a private scope', () => {

    const app = test_data.applications.app_with_anonymous_scope;
    let appTicket;
    let new_auid;
    let anonymousUserTicket;


    before(done => {
      Bpc.request({ method: 'POST', url: '/ticket/app' }, app)
      .then(response => {
        appTicket = response.result;
      })
      .then(() => done())
      .catch(done);
    });
  
    it('an unknown user getting ticket and gets new auid', (done) => {
  
      Bpc.request({
        method: 'GET',
        url: `/au/ticket?app=${app.id}`
      })
      .then(response => {
        expect(response.statusCode).to.be.equal(200);
        new_auid = response.result.user;
        expect(new_auid).to.startWith('auid**');
      })
      .then(() => done())
      .catch(done);
    });


    it('setting new user data in the private scope', (done) => {

      var payload = {
        some_user_data: 'this_is_some_data_in_the_private_scope'
      };

      Bpc.request(
      {
        method: 'POST',
        url: `/permissions/${new_auid}/a_private_scope`,
        payload: payload
      },
      appTicket)
      .then(response => {
        expect(response.statusCode).to.equal(200);
      })
      .then(() => done())
      .catch(done);
    });


    it('getting the user data from the private scope', (done) => {

      var payload = {
        some_user_data: 'this_is_some_data_in_the_private_scope'
      };

      Bpc.request({ url: `/permissions/${new_auid}/a_private_scope` }, appTicket)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        expect(response.result.some_user_data).to.equal('this_is_some_data_in_the_private_scope');
      })
      .then(() => done())
      .catch(done);
    });
  });
});
