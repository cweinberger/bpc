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
const { expect, describe, it, before, after } = exports.lab = require('lab').script();


describe('gigya notifications - functional tests', () => {

  before(done => {
    MongoDB.reset().then(done);
  });

  after(done => {
    MongoDB.clear().then(done);
  });

  before(done => {
    Gigya.callApi.withArgs('/accounts.getAccountInfo', {UID: '1'})
    .resolves({body: {UID: '1', profile: { email: '1@test.nl'}}});

    Gigya.callApi.withArgs('/accounts.getAccountInfo', {UID: '2'})
    .resolves({body: {UID: '2', profile: { email: '2@test.nl'}}});

    Gigya.callApi.withArgs('/accounts.getAccountInfo', {UID: '3'})
    .resolves({body: {UID: '3', profile: { email: '3@test.nl'}}});

    done();
  });

  after(done => {
    Gigya.callApi.reset();
    done();
  });

  describe('accountRegisteredEventHandler', () => {

    it('getting accountRegistered test 1', (done) => {

      const notifications_request = {
        method: 'POST',
        url: '/gigya/notifications',
        headers: {
        },
        payload: {
          "events": [
            {
              "type": "accountRegistered",
              "id": "b3e95b42-5788-49a7-842a-90c0f183d653",
              "timestamp": 1450011476,
              "data": {
                "uid": "1"
              }
            },
            {
              "type": "accountRegistered",
              "id": "c3e95b42-5788-49a7-842a-90c0f183d664",
              "timestamp": 1450011477,
              "data": {
                "uid": "2"
              }
            }
          ]
        },
        "nonce": "8693aa10-9c75-48c9-a959-6ef1ae2b6b54",
        "timestamp": 1450011477
      };

      notifications_request.headers['x-gigya-sig-hmac-sha1'] = gigya_helper.generateGigyaSigHmax(notifications_request);

      bpc_helper.request(notifications_request, null)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        return Promise.resolve();
      })
      .then(() => {
        return new Promise(resolve => setTimeout(resolve, 1000));
      })
      .then(() => MongoDB.collection('users').find({id: '1@test.nl'}).toArray())
      .then(result => {
        expect(result.length).to.equal(1);
        expect(result[0]).not.to.be.null();
        expect(result[0].email).to.equal('1@test.nl');
        expect(result[0].createdAt).to.be.a.date();
        return Promise.resolve();
      })
      .then(() => MongoDB.collection('users').find({id: '2@test.nl'}).toArray())
      .then(result => {
        expect(result.length).to.equal(1);
        expect(result[0]).not.to.be.null();
        expect(result[0].email).to.equal('2@test.nl');
        expect(result[0].createdAt).to.be.a.date();

        done();
      })
      .catch(done);
    });


    it('getting accountDeleted test 1', (done) => {

      if(MongoDB.isMock){
        // mongo-mock does not support selection from subdocuments and other stuff
        return done();
      }

      const notifications_request = {
        method: 'POST',
        url: '/gigya/notifications',
        headers: {
        },
        payload: {
          "events": [
            {
              "type": "accountDeleted",
              "id": "b3e95b42-5788-49a7-842a-90c0f183d653",
              "timestamp": 1450011478,
              "data": {
                "uid": "1"
              }
            // },
            // {
            //   "type": "accountDeleted",
            //   "id": "c3e95b42-5788-49a7-842a-90c0f183d664",
            //   "timestamp": 1450011479,
            //   "data": {
            //     "uid": "5347895384975934842757"
            //   }
            }
          ]
        },
        "nonce": "8693aa10-9c75-48c9-a959-6ef1ae2b6b54",
        "timestamp": 1450011477
      };

      notifications_request.headers['x-gigya-sig-hmac-sha1'] = gigya_helper.generateGigyaSigHmax(notifications_request);

      bpc_helper.request(notifications_request, null)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        return Promise.resolve();
      })
      .then(() => {
        return new Promise(resolve => setTimeout(resolve, 1000));
      })
      .then(() => MongoDB.collection('users').find({id: '1@test.nl'}).toArray())
      .then(result => {
        expect(result.length).to.equal(0);
        return Promise.resolve();
      })
      .then(() => MongoDB.collection('deleted_users').find({id: '1@test.nl'}).toArray())
      .then(result => {
        expect(result.length).to.equal(1);
        expect(result[0].deletedAt).to.be.a.date();

        done();
      })
      .catch(done);
    });


    it('getting multiple identical accountRegistered events', (done) => {

      const notifications_request = {
        method: 'POST',
        url: '/gigya/notifications',
        headers: {
        },
        payload: {
          "events": [
            {
              "type": "accountRegistered",
              "id": "b3e95b42-5788-49a7-842a-90c0f183d655",
              "timestamp": 1450011476,
              "data": {
                "uid": "3"
              }
            },
            {
              "type": "accountRegistered",
              "id": "c3e95b42-5788-49a7-842a-90c0f183d666",
              "timestamp": 1450011477,
              "data": {
                "uid": "3"
              }
            }
          ]
        },
        "nonce": "8693aa10-9c75-48c9-a959-6ef1ae2b6b54",
        "timestamp": 1450011477
      };

      notifications_request.headers['x-gigya-sig-hmac-sha1'] = gigya_helper.generateGigyaSigHmax(notifications_request);

      bpc_helper.request(notifications_request, null)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        return Promise.resolve();
      })
      .then(() => {
        return new Promise(resolve => setTimeout(resolve, 1000));
      })
      .then(() => MongoDB.collection('users').find({id: '3@test.nl'}).toArray())
      .then(result => {
        expect(result.length).to.equal(1);
        expect(result[0].email).to.equal('3@test.nl');
        expect(result[0].gigya.UID).to.equal('3');
        expect(result[0].gigya.email).to.equal('3@test.nl');

        done();
      })
      .catch(done);
    });

  });
});
