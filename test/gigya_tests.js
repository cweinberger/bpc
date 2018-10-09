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


  describe('Getting Gigya user before the webhook has upserted the user to Mongo', () => {

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

      const fakeSearchResponseBody = {
        "callId": "f01d926729ea45089cfc0eec2960cf06",
        "errorCode": 0,
        "apiVersion": 2,
        "statusCode": 200,
        "statusReason": "OK",
        "time": "2018-10-08T12:04:36.903Z",
        "results": [
          {
            "socialProviders": "site",
            "lastLogin": "2018-10-02T14:29:43.046Z",
            "data": {
              "gigyaImportJobID": 1498577419,
              "sso_uid": "80899",
              "nationality": "",
              "terms": true,
              "dppImportJob": "1452613747632",
              "brand": ""
            },
            "isVerified": true,
            "registered": "2016-01-12T15:49:03.906Z",
            "isActive": true,
            "oldestDataUpdatedTimestamp": 1452613743812,
            "emails": {
              "verified": [
                "test@testdomain.dk"
              ],
              "unverified": []
            },
            "lastUpdated": "2018-08-22T08:45:20.325Z",
            "verifiedTimestamp": 1463131686043,
            "identities": [
              {
                "oldestDataUpdatedTimestamp": 1528961161044,
                "providerUID": "298e5107b9154cd784edf9b4ff7aa1a2",
                "lastUpdated": "2018-10-02T14:29:43.046Z",
                "zip": "2700",
                "firstName": "Testa",
                "isExpiredSession": false,
                "lastName": "Persona",
                "gender": "m",
                "city": "MyCity",
                "phones": [
                  {
                    "number": "004547362578"
                  }
                ],
                "provider": "site",
                "oldestDataUpdated": "2018-06-14T07:26:01.044Z",
                "email": "test@testdomain.dk",
                "lastUpdatedTimestamp": 1538490583046,
                "isLoginIdentity": true,
                "allowsLogin": true,
                "birthYear": 1982,
                "age": 35
              }
            ],
            "oldestDataUpdated": "2016-01-12T15:49:03.812Z",
            "lastUpdatedTimestamp": 1534927520325,
            "created": "2016-01-12T15:49:03.812Z",
            "createdTimestamp": 1452613743812,
            "profile": {
              "lastName": "Persona",
              "gender": "m",
              "city": "MyCity",
              "phones": [
                {
                  "number": "004547362578"
                }
              ],
              "email": "test@testdomain.dk",
              "zip": "2700",
              "firstName": "Testa",
              "birthYear": 1982,
              "age": 35
            },
            "verified": "2016-05-13T09:28:06.043Z",
            "registeredTimestamp": 1452613743906,
            "loginProvider": "site",
            "lastLoginTimestamp": 1538490583046,
            "UID": "298e5107b9154cd784edf9b4ff7aa1a2",
            "isRegistered": true,
            "loginIDs": {
              "emails": [
                "test@testdomain.dk"
              ],
              "unverifiedEmails": []
            }
          }
        ],
        "objectsCount": 1,
        "totalCount": 1
      };

      Gigya.callApi.onFirstCall().resolves({body: fakeSearchResponseBody});
      done();
    });
  
    after(done => {
      Gigya.callApi.reset();
      done();
    });


    it('get Gigya email from UID', done => {
      Bpc.request({url: '/gigya?email=test@testdomain.dk'}, appTicket)
      .then((response) => {
        expect(response.statusCode).to.equal(200);
        expect(response.result.UID).to.equal('298e5107b9154cd784edf9b4ff7aa1a2');
        expect(response.result.email).to.equal('test@testdomain.dk');
      })
      .then(() => MongoDB.collection('users').findOne({ id: '298e5107b9154cd784edf9b4ff7aa1a2' }))
      .then(user => {
        expect(user.gigya).to.exists();
        expect(user.gigya.loginProvider).to.equal('site');
        expect(user.gigya.email).to.equal('test@testdomain.dk');
      })
      .then(() => done())
      .catch(done);
    });
  });


  describe('Getting Gigya user not found for real', () => {

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

      const fakeSearchEmptyResponseBody = {
        "callId": "0e2efbe808ba4527b22a3d61bf1132c7",
        "errorCode": 0,
        "apiVersion": 2,
        "statusCode": 200,
        "statusReason": "OK",
        "time": "2018-10-08T12:55:21.676Z",
        "results": [],
        "objectsCount": 0,
        "totalCount": 0
      };

      Gigya.callApi.onFirstCall().resolves({body: fakeSearchEmptyResponseBody});
      done();
    });
  
    after(done => {
      Gigya.callApi.reset();
      done();
    });

    it('get Gigya email from UID', done => {
      Bpc.request({url: '/gigya?email=doesnotexistforreal@testdomain.dk'}, appTicket)
      .then((response) => {
        expect(response.statusCode).to.equal(404);
      })
      .then(() => done())
      .catch(done);
    });
  });
});
