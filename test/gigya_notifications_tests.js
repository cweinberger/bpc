/* jshint node: true */
'use strict';

// Bootstrap the testing harness.
const sinon = require('sinon');
const test_data = require('./data/test_data');
const Bpc = require('./helpers/bpc_helper');
const MongoDB = require('./helpers/mongodb_helper');
const Gigya = require('./helpers/gigya_stub');
const gigya_helper = require('./helpers/gigya_helper');


// Test shortcuts.
const { expect, describe, it, before, after } = exports.lab = require('lab').script();


describe('gigya notifications', () => {

  before(done => {
    MongoDB.reset().then(done);
  });

  after(done => {
    MongoDB.clear().then(done);
  });

  before(done => {
    Gigya.callApi.withArgs('/accounts.getAccountInfo', {UID: '1', include: 'profile,emails'})
    .resolves({body: {UID: '1', profile: { email: '1@test.nl'}}});

    Gigya.callApi.withArgs('/accounts.getAccountInfo', {UID: '2', include: 'profile,emails'})
    .resolves({body: {UID: '2', profile: { email: '2@test.nl'}}});

    Gigya.callApi.withArgs('/accounts.getAccountInfo', {UID: '3', include: 'profile,emails'})
    .resolves({body: {UID: '3', profile: { email: '3@test.nl'}}});

    done();
  });

  after(done => {
    Gigya.callApi.reset();
    done();
  });

  describe('accountRegisteredEventHandler', () => {

    it('getting accountRegistered test 1', (done) => {

      var notifications_request = {
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

      notifications_request = gigya_helper.setGigyaSigHmax(notifications_request);

      Bpc.request(notifications_request)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        return Promise.resolve();
      })
      .then(() => {
        return new Promise(resolve => setTimeout(resolve, 1000));
      })
      .then(() => MongoDB.collection('users').find({id: '1'}).toArray())
      .then(result => {
        expect(result.length).to.equal(1);
        expect(result[0]).not.to.be.null();
        expect(result[0].gigya.email).to.equal('1@test.nl');
        expect(result[0].createdAt).to.be.a.date();
        return Promise.resolve();
      })
      .then(() => MongoDB.collection('users').find({id: '2'}).toArray())
      .then(result => {
        expect(result.length).to.equal(1);
        expect(result[0]).not.to.be.null();
        expect(result[0].gigya.email).to.equal('2@test.nl');
        expect(result[0].createdAt).to.be.a.date();

        done();
      })
      .catch(done);
    });


    it('getting accountDeleted test 1', (done) => {

      var notifications_request = {
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

      notifications_request = gigya_helper.setGigyaSigHmax(notifications_request);

      Bpc.request(notifications_request)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        return Promise.resolve();
      })
      .then(() => {
        return new Promise(resolve => setTimeout(resolve, 1000));
      })
      .then(() => MongoDB.collection('users').find({id: '1'}).toArray())
      .then(result => {
        expect(result.length).to.equal(0);
        return Promise.resolve();
      })
      .then(() => MongoDB.collection('deleted_users').find({id: '1'}).toArray())
      .then(result => {
        expect(result.length).to.equal(1);
        expect(result[0].deletedAt).to.be.a.date();

        done();
      })
      .catch(done);
    });


    it('getting multiple identical accountRegistered events', (done) => {

      var notifications_request = {
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

      notifications_request = gigya_helper.setGigyaSigHmax(notifications_request);

      Bpc.request(notifications_request)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        return Promise.resolve();
      })
      .then(() => {
        return new Promise(resolve => setTimeout(resolve, 1000));
      })
      .then(() => MongoDB.collection('users').find({id: '3'}).toArray())
      .then(result => {
        expect(result.length).to.equal(1);
        expect(result[0].gigya.UID).to.equal('3');
        expect(result[0].gigya.email).to.equal('3@test.nl');

        done();
      })
      .catch(done);
    });

  });

  describe('accountRegistered changes email accountUpdated', () => {


    before(done => {
      Gigya.callApi.withArgs('/accounts.getAccountInfo', {UID: '5', include: 'profile,emails'})
      .onFirstCall().resolves({body: {UID: '5', profile: { email: 'FIVE@test.nl'}}})
      .onSecondCall().resolves({body: {UID: '5', profile: { email: 'five_o@test.nl'}}});
      done();
    });

    after(done => {
      Gigya.callApi.reset();
      done();
    });



    it('getting accountRegistered', (done) => {

      var notifications_request = {
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
                "uid": "5"
              }
            }
          ]
        },
        "nonce": "8693aa10-9c75-48c9-a959-6ef1ae2b6b54",
        "timestamp": 1450011479
      };

      notifications_request = gigya_helper.setGigyaSigHmax(notifications_request);
      

      Bpc.request(notifications_request)
      .then(response => {
        expect(response.statusCode).to.equal(200);
      })
      .then(() => {
        return new Promise(resolve => setTimeout(resolve, 1000));
      })
      .then(() => MongoDB.collection('users').find({'gigya.UID': '5'}).toArray())
      .then(result => {
        expect(result).not.to.be.null();
        expect(result.length).to.equal(1);
        expect(result[0].id).to.be.equal('5');
        expect(result[0].gigya.UID).to.equal('5');
        expect(result[0].gigya.email).to.equal('five@test.nl');
        expect(result[0].createdAt).to.be.a.date();
      })
      .then(done)
      .catch(done);
    });


    it('getting accountUpdated with a new email', (done) => {

      var notifications_request = {
        method: 'POST',
        url: '/gigya/notifications',
        headers: {
        },
        payload: {
          "events": [
            {
              "type": "accountUpdated",
              "id": "b3e95b42-5788-49a7-842a-90c0f183d656",
              "timestamp": 1450011477,
              "data": {
                "uid": "5"
              }
            }
          ]
        },
        "nonce": "8693aa10-9c75-48c9-a959-6ef1ae2b6b54",
        "timestamp": 1450011479
      };

      notifications_request = gigya_helper.setGigyaSigHmax(notifications_request);

      Bpc.request(notifications_request)
      .then(response => {
        expect(response.statusCode).to.equal(200);
      })
      .then(() => {
        return new Promise(resolve => setTimeout(resolve, 1000));
      })
      .then(() => MongoDB.collection('users').find({'gigya.UID': '5'}).toArray())
      .then(result => {
        expect(result).not.to.be.null();
        expect(result.length).to.equal(1);
        expect(result[0].id).to.be.equal('5');
        expect(result[0].gigya.email).to.equal('five_o@test.nl');
      })
      .then(done)
      .catch(done);

    });
  });
});
