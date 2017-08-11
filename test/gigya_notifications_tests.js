/* jshint node: true */
'use strict';

// Bootstrap the testing harness.
const Code = require('code');   // assertion library
const Lab = require('lab');
const lab = exports.lab = Lab.script();
const rewire = require('rewire');
const sinon = require('sinon');
const test_data = require('./data/test_data');
const bpc_helper = require('./helpers/bpc_helper');
const MongoDB = require('./mocks/mongodb_mock');
const Gigya = require('./mocks/gigya_mock');

const Crypto = require('crypto');

// Test shortcuts.
const describe = lab.describe;
const it = lab.it;
const expect = Code.expect;
const before = lab.before;
const after = lab.after;


describe('gigya notifications - functional tests', () => {

  before(done => {
    bpc_helper.initate(function(){
      done();
    });
  });

  describe('accountRegisteredEventHandler', () => {

    it('getting accountRegistered  test 1', (done) => {

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
                "uid": "3218736128736123215732"
              }
            },
            {
              "type": "accountRegistered",
              "id": "c3e95b42-5788-49a7-842a-90c0f183d664",
              "timestamp": 1450011477,
              "data": {
                "uid": "5347895384975934842757"
              }
            }
          ]
        },
        "nonce": "8693aa10-9c75-48c9-a959-6ef1ae2b6b54",
        "timestamp": 1450011477
      };

      notifications_request.headers['x-gigya-sig-hmac-sha1'] = generateGigyaSigHmax(notifications_request);

      bpc_helper.request(notifications_request, null, (response) => {
        // console.log(response);
        expect(response.statusCode).to.equal(200);

        MongoDB.collection('users').find().toArray((err, result) => {
          console.log('_______', err, result);
        });
        done();
      });

    });




    it('getting accountDeleted  test 1', (done) => {

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
                "uid": "3218736128736123215732"
              }
            },
            {
              "type": "accountDeleted",
              "id": "c3e95b42-5788-49a7-842a-90c0f183d664",
              "timestamp": 1450011479,
              "data": {
                "uid": "5347895384975934842757"
              }
            }
          ]
        },
        "nonce": "8693aa10-9c75-48c9-a959-6ef1ae2b6b54",
        "timestamp": 1450011477
      };

      notifications_request.headers['x-gigya-sig-hmac-sha1'] = generateGigyaSigHmax(notifications_request);

      bpc_helper.request(notifications_request, null, (response) => {

        expect(response.statusCode).to.equal(200);

        MongoDB.collection('users').findOne({id: '3218736128736123215732'}, function(err, result){
          expect(result.deletedAt).to.be.a.date();

          MongoDB.collection('users').findOne({id: '5347895384975934842757'}, function(err, result){
            expect(result.deletedAt).to.be.a.date();

            done();
          });
        });
      });
    });

  });
});


function generateGigyaSigHmax(request){
  const GIGYA_SECRET_KEY = 'random_test_password_that_is_longer_than_32_characters';
  const secretBuffer = new Buffer(GIGYA_SECRET_KEY, 'base64');
  const algorithm = 'sha1'; // sha256
  const _message = new Buffer.from(JSON.stringify(request.payload));
  const hmac = Crypto.createHmac(algorithm, secretBuffer).update(_message);
  return hmac.digest('base64');
}
