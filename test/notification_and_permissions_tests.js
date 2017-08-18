/* jshint node: true */
'use strict';

// Bootstrap the testing harness.
const sinon = require('sinon');
const test_data = require('./data/test_data');
const bpc_helper = require('./helpers/bpc_helper');
const MongoDB = require('./mocks/mongodb_mock');
const Gigya = require('./mocks/gigya_mock');
const gigya_helper = require('./helpers/gigya_helper');


// Test shortcuts.
const { describe, it, before, after } = exports.lab = require('lab').script();
// Assertion library
const { expect } = require('code');


describe('gigya notifications after permissions - integration tests', () => {

  var appTicket;
  var app = test_data.applications.app_with_profile_scope;

  before(done => {
    bpc_helper.start().then(done);
  });

  before((done) => {
    bpc_helper.request({ method: 'POST', url: '/ticket/app' }, {credentials: app}, (response) => {
      expect(response.statusCode).to.equal(200);
      appTicket = {credentials: JSON.parse(response.payload), app: app.id};
      done();
    });
  });

  before(done => {
    Gigya.callApi.withArgs('/accounts.getAccountInfo', {UID: '4'})
    .resolves({body: {UID: '4', profile: { email: '4@test.nl'}}});

    done();
  });

  after(done => {
    Gigya.callApi.reset();
    done();
  });

  it('setting permissions', done => {
    const permissions_request = {
      method: 'POST',
      url: '/permissions/gigya/4@test.nl/profile',
      headers: {},
      payload: {
        "sso-id": "12345"
      }
    };

    bpc_helper.request(permissions_request, appTicket, (response) => {
      expect(response.statusCode).to.equal(200);
      // expect(response.payload.status).to.equal('ok');

      MongoDB.collection('users').find({email: '4@test.nl', provider: 'gigya'}).toArray((err, result) => {
        expect(result).not.to.be.null();
        expect(result.length).to.equal(1);
        expect(result[0].id).to.be.undefined();
        expect(result[0].createdAt).to.be.a.date();
        // expect(result[0].lastUpdated).to.be.a.date();

        done();
      });
    });
  });

  it('getting accountRegistered', (done) => {

    const notifications_request = {
      method: 'POST',
      url: '/gigya/notifications',
      headers: {
      },
      payload: {
        "events": [
          {
            "type": "accountRegistered",
            "id": "b3e95b42-5788-49a7-842a-90c0f183d656",
            "timestamp": 1450011477,
            "data": {
              "uid": "4"
            }
          }
        ]
      },
      "nonce": "8693aa10-9c75-48c9-a959-6ef1ae2b6b54",
      "timestamp": 1450011479
    };

    notifications_request.headers['x-gigya-sig-hmac-sha1'] = gigya_helper.generateGigyaSigHmax(notifications_request);

    bpc_helper.request(notifications_request, null, (response) => {
      expect(response.statusCode).to.equal(200);

      MongoDB.collection('users').find({email: '4@test.nl', provider: 'gigya'}).toArray((err, result) => {
        expect(result).not.to.be.null();
        expect(result.length).to.equal(1);
        expect(result[0].id).to.be.equal('4');
        expect(result[0].email).to.equal('4@test.nl');
        expect(result[0].provider).to.equal('gigya');
        expect(result[0].createdAt).to.be.a.date();
        // Testing the data scope using this key, since mongo-mock does not support sub-documents
        // https://github.com/williamkapke/mongo-mock/issues/26
        expect(result[0]['dataScopes.profile.sso-id']).to.be.equal('12345');

        done();
      });
    });
  });
});
