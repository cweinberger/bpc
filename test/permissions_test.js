/* jshint node: true */
'use strict';

// Bootstrap the testing harness.
const Code = require('code');   // assertion library
const Lab = require('lab');
const lab = exports.lab = Lab.script();
const rewire = require('rewire');
const sinon = require('sinon');
const Oz = require('oz');
const MongoDB = require('./../server/mongo/mongodb_client');
const bpc = require('./../server');
// const Permissions = require('./../server/permissions');
const crypto = require('crypto');

// Test shortcuts.
const describe = lab.describe;
const it = lab.it;
const expect = Code.expect;
const before = lab.before;
const after = lab.after;


// Here we go...
describe('permissions', () => {

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

  const encryptionPassword = 'a_password_that_is_not_too_short_and_also_not_very_random_but_is_good_enough';

  let appTicket = null;

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
      MongoDB.collection('users').insert({
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
      })
    ]).then(res => {
      done();
    })
  });


  // Getting the appTicket
  before((done) => {

    const req = {
        method: 'POST',
        url: '/ticket/app',
        headers: {
            host: 'example.com',
            authorization: Oz.client.header('http://example.com/ticket/app', 'POST', apps.social).field
        }
    };

    const options = {
        encryptionPassword,
        loadAppFunc: function (id, callback) {
          callback(null, apps[id]);
        }
    };

    console.log('bpc', bpc);
    done();
    // TODO: Use bpc to get an appTicket. Below is an example from an Oz-test
    // Oz.endpoints.app(req, null, options, (err, ticket) => {
    //   console.log('TICKET', ticket);
    //     expect(err).to.not.exist();
    //     appTicket = ticket;
    //     done();
    // });
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
  //             authorization: Oz.client.header('http://example.com/oz/reissue', 'POST', appTicket).field
  //         }
  //     };
  //
  //     Permissions.findAll().then(apps => {
  //
  //       expect(apps).to.be.an.array();
  //       expect(apps).not.to.be.empty();
  //       done();
  //
  //     });
  //
  //   });
  //
  // });


});
