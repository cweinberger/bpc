/* jshint node: true */
'use strict';

// Bootstrap the testing harness.
const sinon = require('sinon');
const test_data = require('./data/test_data');
const bpc_helper = require('./helpers/bpc_helper');
const Gigya = require('./helpers/gigya_stub');
const MongoDB = require('./helpers/mongodb_mock');

// Test shortcuts.
const { expect, describe, it, before, after } = exports.lab = require('lab').script();


describe('users - functional tests', () => {

  before(done => {
    MongoDB.reset().then(done);
  });

  after(done => {
    MongoDB.clear().then(done);
  });

  describe('getting user with an app ticket', () => {

    var appTicket;
    var bt = test_data.applications.bt;
    var first = test_data.users.simple_first_user;

    // Getting the appTicket
    before(done => {
      bpc_helper.request({ method: 'POST', url: '/ticket/app' }, bt)
      .then(response => {
        appTicket = response.result;
      })
      .then(() => done())
      .catch(done);
    });

    it('getting first user bt permissions', (done) => {
      bpc_helper.request({ method: 'GET', url: '/permissions/' + first.id + '/bt'}, appTicket, (response) => {
        expect(response.statusCode).to.equal(200);
        expect(response.result.bt_paywall).to.true();
        done();
      });
    });

  });

});


describe('users - integration tests', () => {

  let app = test_data.applications.app_with_admin_scope;
  let appTicket;

  before(done => {
    MongoDB.reset().then(done);
  });

  after(done => {
    MongoDB.clear().then(done);
  });

  // Getting the appTicket
  before(done => {
    bpc_helper.request({ method: 'POST', url: '/ticket/app' }, app, (response) => {
      expect(response.statusCode).to.equal(200);
      appTicket = response.result;
      done();
    });
  });

  before(done => {
    // Gigya.callApi.withArgs('/accounts.initRegistration').resolves({body: {regToken: 'randomRegToken1234'}});
    // Gigya.callApi.withArgs('/accounts.register', {
    //   email: 'newuser@notyetcreated.nl',
    //   password: 'justsomerandomtext',
    //   finalizeRegistration: true,
    //   include: 'profile,data',
    //   format: 'json',
    //   regToken: 'randomRegToken1234'
    // }).resolves({body: {UID: 'randomUID1234'}});
    Gigya.callApi.reset();
    Gigya.callApi.onFirstCall().resolves({body: {regToken: 'randomRegToken1234'}});
    Gigya.callApi.onSecondCall().resolves({body: {UID: 'randomUID1234'}});
    done();
  });

  after(done => {
    Gigya.callApi.reset();
    done();
  });


  it('delete user', done => {
    let options = {
      method: 'DELETE',
      url: '/users/5347895384975934842757'
    };

    bpc_helper.request(options, appTicket, (response) => {
      expect(response.statusCode).to.equal(200);

      MongoDB.collection('users').find({id: '5347895384975934842757'}).toArray(function(err, result){
        expect(result.length).to.equal(0);

        done();
      });
    });
  });


  it('get Gigya email from UID', done => {
    bpc_helper.request({url: '/gigya?UID=3218736128736123215732'}, appTicket)
    .then((response) => {
      expect(response.statusCode).to.equal(200);
      expect(response.result.UID).to.equal('3218736128736123215732');
      expect(response.result.email).to.equal('first_user@berlingskemedia.dk');
      done();
    })
    .catch(done);
  });


  it('get Gigya UID from email', done => {
    bpc_helper.request({url: '/gigya?email=first_user@berlingskemedia.dk'}, appTicket)
    .then((response) => {
      expect(response.statusCode).to.equal(200);
      expect(response.result.UID).to.equal('3218736128736123215732');
      expect(response.result.email).to.equal('first_user@berlingskemedia.dk');
      done();
    })
    .catch(done);
  });


  it('invalid trying to GET /gigya with no query params', done => {
    bpc_helper.request({url: '/gigya'}, appTicket)
    .then((response) => {
      expect(response.statusCode).to.equal(400);
      done();
    })
    .catch(done);
  });

  it('invalid trying to GET /gigya with too many query params', done => {
    bpc_helper.request({url: '/gigya?email=someemail&UID=someuid'}, appTicket)
    .then((response) => {
      expect(response.statusCode).to.equal(400);
      done();
    })
    .catch(done);
  });

});
