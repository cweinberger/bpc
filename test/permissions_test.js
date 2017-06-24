/* jshint node: true */
'use strict';

// Bootstrap the testing harness.
const Code = require('code');   // assertion library
const Lab = require('lab');
const lab = exports.lab = Lab.script();
const rewire = require('rewire');
const sinon = require('sinon');
const Hawk = require('hawk');
const MongoDB = require('./../server/mongo/mongodb_mocked');
const bpc = require('./../server');
// const Permissions = require('./../server/permissions');

// Test shortcuts.
const describe = lab.describe;
const it = lab.it;
const expect = Code.expect;
const before = lab.before;
const after = lab.after;


// Here we go...
describe('permissions - functional tests', () => {
  const apps = {
    bt: {
      id: 'bt',
      scope: ['bt'],
      key: 'werxhqb98rpaxn39848xrunpaw3489ruxnpa98w4rxn',
      algorithm: 'sha256'
    },
    berlingske: {
      id: 'berlingske',
      scope: ['berlingske'],
      key: 'witf745itwn7ey4otnw7eyi4t7syeir7bytise7rbyi',
      algorithm: 'sha256'
    }
  };

  const users = {
    first: {
      email: 'UserWithCapitalLetters@berlingskemedia.dk',
      id: '3218736128736123215732',
      provider: 'gigya',
      lastLogin: new Date(),
      dataScopes: {
        'bt': {
          bt_paywall: true,
          bt_subscription_tier: 'free'
        },
        'berlingske': {
          berlingske_paywall: true,
          berlingske_subscription_tier: 'premium'
        }
      },
      providerData: {}
    }
  }

  let appTicket = null;


  before(done => {
    bpc.start(function(){
      done();
    });
  });


  before(done => {
    // Need to wait a sec for the database/mongo-mock to start up...
    setTimeout(done, 1000);
  });


  before(done => {
    // Clear the database.
    Promise.all([
      MongoDB.collection('applications').remove({}),
      MongoDB.collection('grants').remove({}),
      MongoDB.collection('users').remove({})
    ]).then(res => {
      done();
    });

  });

  before(done => {
    Promise.all([
      // Give the test cases a user to use.
      MongoDB.collection('applications').insert(apps.bt),
      MongoDB.collection('applications').insert(apps.berlingske),
      MongoDB.collection('users').insert(users.first)
    ]).then(res => {
      done();
    })
  });


  describe('getting user permissions with an app ticket', () => {

    var appTicket;

    // Getting the appTicket
    before((done) => {

      bpc_request({ method: 'POST', url: '/ticket/app' }, {credentials: apps.bt}, (response) => {
        expect(response.statusCode).to.equal(200);
        appTicket = {credentials: JSON.parse(response.payload), app: apps.bt.id};
        done();
      });
    });


    it('getting first user bt permissions', (done) => {
      bpc_request({ method: 'GET', url: '/permissions/' + users.first.id + '/bt'}, appTicket, (response) => {
        expect(response.statusCode).to.equal(200);
        var payload = JSON.parse(response.payload);
        expect(payload.bt_paywall).to.true();
        done();
      });
    });

    it('getting first user bt permissions by provider and lowercase email', (done) => {
      bpc_request({ method: 'GET', url: '/permissions/gigya/userwithcapitalletters@berlingskemedia.dk/bt'}, appTicket, (response) => {
        expect(response.statusCode).to.equal(200);
        var payload = JSON.parse(response.payload);
        expect(payload.bt_subscription_tier).to.equal('free');
        done();
      });
    });

    it('denied first user berlingske permissions', (done) => {
      bpc_request({ method: 'GET', url: '/permissions/' + users.first.id + '/berlingske'}, appTicket, (response) => {
        expect(response.statusCode).to.equal(403);
        done();
      });
    });
  });

  //
  // describe('searchByEmail()', () => {
  //
  //   it('returns at least one app', done => {
  //
  //     const req = {
  //         method: 'POST',
  //         url: '/permissions/gigya/userwithcapitalletters@berlingskemedia.dk/test',
  //         headers: {
  //             host: 'example.com',
  //             authorization: Hawk.client.header('http://example.com/oz/reissue', 'POST', appTicket).field
  //         }
  //     };
  //
  //
  //   });
  //
  // });

});



function bpc_request (options, ticket, callback) {

  const hawkHeader = Hawk.client.header('http://test.com'.concat(options.url), options.method, ticket);
  if (!hawkHeader.field){
    callback(hawkHeader);
  }

  const req = {
    method: options.method,
    url: options.url,
    headers: {
      host: 'test.com',
      authorization: hawkHeader.field
    }
  };

  bpc.inject(req, callback);
}
