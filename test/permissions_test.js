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
      social: {
          id: 'social',
          scope: ['a', 'b', 'c'],
          key: 'werxhqb98rpaxn39848xrunpaw3489ruxnpa98w4rxn',
          algorithm: 'sha256'
      },
      network: {
          id: 'network',
          scope: ['b', 'x'],
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
        'test': {
          test_paywall: true
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
      MongoDB.collection('applications').insert(apps.social),
      MongoDB.collection('applications').insert(apps.network),
      MongoDB.collection('users').insert(users.first)
    ]).then(res => {
      done();
    })
  });


  describe('getting user permissions with an app ticket', () => {

    var ticket;

    // Getting the appTicket
    before((done) => {
      const req = {
        method: 'POST',
        url: '/ticket/app',
        headers: {
          host: 'test.com',
          authorization: Hawk.client.header('http://test.com/ticket/app', 'POST', apps.social).field
        }
      };

      bpc.inject(req, (response) => {
        console.log('ticket response', response.result);
        expect(response.statusCode).to.equal(200);
        ticket = 'TODO';
        done();
      });
    });


    it('getting first user test permissions', (done) => {
      const req = {
          method: 'POST',
          url: '/permissions/' + users.first.id + '/test',
          headers: {
            host: 'example.com',
            authorization: Hawk.client.header('http://example.com/ticket/app', 'POST', apps.social).field
          }
      };

      bpc.inject(req, (response) => {
        // console.log('response', response);
        expect(response.payload.test_paywall).to.true();
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
