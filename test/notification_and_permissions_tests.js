/* jshint node: true */
'use strict';

// Bootstrap the testing harness.
const sinon = require('sinon');
const test_data = require('./data/test_data');
const bpc_helper = require('./helpers/bpc_helper');
const MongoDB = require('./helpers/mongodb_helper');
const Gigya = require('./helpers/gigya_stub');
const gigya_helper = require('./helpers/gigya_helper');


// Test shortcuts.
const { expect, describe, it, before, after } = exports.lab = require('lab').script();

describe('gigya notifications - integration tests', () => {

  before(done => {
    MongoDB.reset().then(done);
  });

  after(done => {
    MongoDB.clear().then(done);
  });



  describe('setting permissions before the user is registered and the updating email', () => {

    var app = test_data.applications.app_with_profile_scope;
    var appTicket;

    before(done => {
      bpc_helper.request({ method: 'POST', url: '/ticket/app' }, app)
      .then(response => {
        appTicket = response.result;
        return Promise.resolve();
      })
      .then(done)
      .catch(done);
    });


    before(done => {
      Gigya.callApi.withArgs('/accounts.getAccountInfo', {UID: '4', include: 'profile,emails'})
      .onFirstCall().resolves({body: {UID: '4', profile: { email: 'four@test.nl'}}})
      .onSecondCall().resolves({body: {UID: '4', profile: { email: 'four_new_email@test.nl'}}});
      // .resolves({body: {UID: '4', profile: { email: 'four@test.nl'}}});

      done();
    });


    after(done => {
      Gigya.callApi.reset();
      done();
    });


    it('setting permissions for a new user', done => {
      const permissions_request = {
        method: 'POST',
        url: '/permissions/four@test.nl/profile',
        headers: {},
        payload: {
          "sso-id": "12345"
        }
      };

      bpc_helper.request(permissions_request, appTicket)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        // expect(response.payload.status).to.equal('ok');
        return Promise.resolve();
      })
      .then(() => {
        return new Promise(resolve => setTimeout(resolve, 1000));
      })
      .then(() => MongoDB.collection('users').find({$or: [{id: '4'}, {id: 'four@test.nl'}, {id: 'FOUR@test.nl'}, {email: 'four@test.nl'}]}).toArray())
      .then(result => {
        expect(result).not.to.be.null();
        expect(result.length).to.equal(1);
        expect(result[0].id).to.equal('four@test.nl');
        expect(result[0].createdAt).to.be.a.date();
        // expect(result[0].lastUpdated).to.be.a.date();
        expect(result[0].dataScopes.profile['sso-id']).to.be.equal('12345');
        return Promise.resolve();
      })
      .then(done)
      .catch(done);
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
                "uid": "4"
              }
            }
          ]
        },
        "nonce": "8693aa10-9c75-48c9-a959-6ef1ae2b6b54",
        "timestamp": 1450011479
      };

      notifications_request = gigya_helper.setGigyaSigHmax(notifications_request);

      bpc_helper.request(notifications_request)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        return Promise.resolve();
      })
      .then(() => {
        return new Promise(resolve => setTimeout(resolve, 1000));
      })
      .then(() => MongoDB.collection('users').find({$or: [{id: '4'}, {id: 'four@test.nl'}, {id: 'FOUR@test.nl'}, {email: 'four@test.nl'}]}).toArray())
      .then(result => {
        expect(result).not.to.be.null();
        expect(result.length).to.equal(1);
        expect(result[0].id).to.equal('4');
        expect(result[0].gigya.UID).to.equal('4');
        expect(result[0].gigya.email).to.equal('four@test.nl');
        expect(result[0].createdAt).to.be.a.date();
        expect(result[0].dataScopes.profile['sso-id']).to.be.equal('12345');
        return Promise.resolve();
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
                "uid": "4"
              }
            }
          ]
        },
        "nonce": "8693aa10-9c75-48c9-a959-6ef1ae2b6b54",
        "timestamp": 1450011479
      };

      notifications_request = gigya_helper.setGigyaSigHmax(notifications_request);

      bpc_helper.request(notifications_request)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        return Promise.resolve();
      })
      .then(() => {
        return new Promise(resolve => setTimeout(resolve, 1000));
      })
      .then(() => MongoDB.collection('users').find({$or: [{id: '4'}, {'gigya.UID': '4'}, {id: 'four@test.nl'}, {id: 'FOUR@test.nl'}, {email: 'four@test.nl'}]}).toArray())
      .then(result => {
        expect(result).not.to.be.null();
        expect(result.length).to.equal(1);
        expect(result[0].id).to.equal('4');
        expect(result[0].gigya.email).to.equal('four_new_email@test.nl');
        return Promise.resolve();
      })
      .then(done)
      .catch(done);

    });
  });




  describe('setting permissions with a lowercase email before the user is registered with an uppercase email', () => {

    var app = test_data.applications.app_with_profile_scope;
    var appTicket;

    before(done => {
      bpc_helper.request({ method: 'POST', url: '/ticket/app' }, app)
      .then(response => {
        appTicket = response.result;
      })
      .then(done)
      .catch(done);
    });


    before(done => {
      Gigya.callApi.withArgs('/accounts.getAccountInfo', {UID: '6', include: 'profile,emails'})
      .resolves({body: {UID: '6', profile: { email: 'SIX@test.nl'}}});

      done();
    });


    after(done => {
      Gigya.callApi.reset();
      done();
    });


    it('setting permissions for a new user', done => {
      const permissions_request = {
        method: 'POST',
        url: '/permissions/six@test.nl/profile',
        headers: {},
        payload: {
          some_value: "767676"
        }
      };

      bpc_helper.request(permissions_request, appTicket)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        // expect(response.payload.status).to.equal('ok');
        return Promise.resolve();
      })
      .then(() => {
        return new Promise(resolve => setTimeout(resolve, 1000));
      })
      .then(() => MongoDB.collection('users').find({$or: [{id: '6'}, {id: 'six@test.nl'}, {id: 'SIX@test.nl'}, {email: 'six@test.nl'}]}).toArray())
      .then(result => {
        expect(result).not.to.be.null();
        expect(result.length).to.equal(1);
        expect(result[0].id).to.equal('six@test.nl');
        expect(result[0].email).to.equal('six@test.nl');
        expect(result[0].createdAt).to.be.a.date();
        expect(result[0].dataScopes.profile.some_value).to.equal("767676");
        return Promise.resolve();
      })
      .then(done)
      .catch(done);
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
                "uid": "6"
              }
            }
          ]
        },
        "nonce": "8693aa10-9c75-48c9-a959-6ef1ae2b6b54",
        "timestamp": 1450011479
      };

      notifications_request = gigya_helper.setGigyaSigHmax(notifications_request);

      bpc_helper.request(notifications_request)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        return Promise.resolve();
      })
      .then(() => {
        return new Promise(resolve => setTimeout(resolve, 1000));
      })
      .then(() => MongoDB.collection('users').find({$or: [{id: '6'}, {id: 'six@test.nl'}, {id: 'SIX@test.nl'}, {email: 'six@test.nl'}]}).toArray())
      .then(result => {
        expect(result).not.to.be.null();
        expect(result.length).to.equal(1);
        expect(result[0].id).to.equal('6');
        expect(result[0].email).to.equal('six@test.nl');
        expect(result[0].gigya.UID).to.equal('6');
        expect(result[0].gigya.email).to.equal('six@test.nl');
        return Promise.resolve();
      })
      .then(done)
      .catch(done);
    });


    it('setting updated permissions for a the user', done => {
      const permissions_request = {
        method: 'POST',
        url: '/permissions/six@test.nl/profile',
        headers: {},
        payload: {
          some_value: "totally_new_value"
        }
      };

      bpc_helper.request(permissions_request, appTicket)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        // expect(response.payload.status).to.equal('ok');
        return Promise.resolve();
      })
      .then(() => {
        return new Promise(resolve => setTimeout(resolve, 1000));
      })
      .then(() => MongoDB.collection('users').find({$or: [{id: '6'}, {id: 'six@test.nl'}, {id: 'SIX@test.nl'}, {email: 'six@test.nl'}]}).toArray())
      .then(result => {
        expect(result).not.to.be.null();
        expect(result.length).to.equal(1);
        expect(result[0].id).to.equal('6');
        expect(result[0].gigya.UID).to.equal('6');
        expect(result[0].gigya.email).to.equal('six@test.nl');
        expect(result[0].dataScopes.profile.some_value).to.equal("totally_new_value");
        return Promise.resolve();
      })
      .then(done)
      .catch(done);
    });
  });


  describe('setting permissions with an uppercase email before the user is registered with a lowercase email', () => {

    var app = test_data.applications.app_with_profile_scope;
    var appTicket;

    before(done => {
      bpc_helper.request({ method: 'POST', url: '/ticket/app' }, app)
      .then(response => {
        appTicket = response.result;
      })
      .then(done)
      .catch(done);
    });


    before(done => {
      Gigya.callApi.withArgs('/accounts.getAccountInfo', {UID: '7', include: 'profile,emails'})
      .resolves({body: {UID: '7', profile: { email: 'seven@test.nl'}}});

      done();
    });


    after(done => {
      Gigya.callApi.reset();
      done();
    });


    it('setting new permissions for a new user', done => {
      const permissions_request = {
        method: 'POST',
        url: '/permissions/SEVEN@test.nl/profile',
        headers: {},
        payload: {
          some_value: "788787"
        }
      };

      bpc_helper.request(permissions_request, appTicket)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        // expect(response.payload.status).to.equal('ok');
        return Promise.resolve();
      })
      .then(() => {
        return new Promise(resolve => setTimeout(resolve, 1000));
      })
      .then(() => MongoDB.collection('users').find({$or: [{id: '7'}, {id: 'SEVEN@test.nl'}, {id: 'seven@test.nl'}, {email: 'seven@test.nl'}]}).toArray())
      .then(result => {
        expect(result).not.to.be.null();
        expect(result.length).to.equal(1);
        expect(result[0].id).to.equal('seven@test.nl');
        expect(result[0].email).to.equal('seven@test.nl');
        expect(result[0].createdAt).to.be.a.date();
        expect(result[0].dataScopes.profile.some_value).to.equal("788787");
        return Promise.resolve();
      })
      .then(done)
      .catch(done);
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
                "uid": "7"
              }
            }
          ]
        },
        "nonce": "8693aa10-9c75-48c9-a959-6ef1ae2b6b54",
        "timestamp": 1450011479
      };

      notifications_request = gigya_helper.setGigyaSigHmax(notifications_request);

      bpc_helper.request(notifications_request, null)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        return Promise.resolve();
      })
      .then(() => {
        return new Promise(resolve => setTimeout(resolve, 1000));
      })
      .then(() => MongoDB.collection('users').find({$or: [{id: '7'}, {id: 'SEVEN@test.nl'}, {id: 'seven@test.nl'}, {email: 'seven@test.nl'}]}).toArray())
      .then(result => {
        expect(result).not.to.be.null();
        expect(result.length).to.equal(1);
        expect(result[0].id).to.equal('7');
        expect(result[0].email).to.equal('seven@test.nl');
        expect(result[0].gigya.UID).to.equal('7');
        expect(result[0].gigya.email).to.equal('seven@test.nl');
        return Promise.resolve();
      })
      .then(done)
      .catch(done);
    });


    it('setting updated permissions for a the user', done => {
      const permissions_request = {
        method: 'POST',
        url: '/permissions/SEVEN@test.nl/profile',
        headers: {},
        payload: {
          some_value: "new_value"
        }
      };

      bpc_helper.request(permissions_request, appTicket)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        // expect(response.payload.status).to.equal('ok');
        return Promise.resolve();
      })
      .then(() => {
        return new Promise(resolve => setTimeout(resolve, 1000));
      })
      .then(() => MongoDB.collection('users').find({$or: [{id: '7'}, {id: 'SEVEN@test.nl'}, {id: 'seven@test.nl'}, {email: 'seven@test.nl'}]}).toArray())
      .then(result => {
        expect(result).not.to.be.null();
        expect(result.length).to.equal(1);
        expect(result[0].id).to.equal('7');
        expect(result[0].email).to.equal('seven@test.nl');
        expect(result[0].gigya.UID).to.equal('7');
        expect(result[0].gigya.email).to.equal('seven@test.nl');
        expect(result[0].dataScopes.profile.some_value).to.equal("new_value");
        return Promise.resolve();
      })
      .then(done)
      .catch(done);
    });
  });
});
