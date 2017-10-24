/* jshint node: true */
'use strict';

// Bootstrap the testing harness.
const sinon = require('sinon');
const MongoDB = require('./mocks/mongodb_mock');
const test_data = require('./data/test_data');
const bpc_helper = require('./helpers/bpc_helper');
// const Permissions = require('./../server/permissions');

// Test shortcuts.
const { expect, describe, it, before, after } = exports.lab = require('lab').script();


describe('scope datafields - integration tests', () => {

  var appTicket;
  var bt = test_data.applications.bt;
  var user = test_data.users.simple_first_user;

  before(done => {
    bpc_helper.start().then(done);
  });

  // Getting the appTicket
  before((done) => {
    bpc_helper.request({ method: 'POST', url: '/ticket/app' }, bt)
    .then(response => {
      appTicket = response.result;
    })
    .then(done)
    .catch(done);
  });


  describe('integers and floats', () => {

    var lastUpdated;

    it('setting a value', (done) => {
      const set_request = {
        method: 'POST',
        url: '/permissions/' + user.id + '/bt',
        headers: {},
        payload: {
          "test_integer": 1,
          "test_float": 7
        }
      };

      bpc_helper.request(set_request, appTicket)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        return Promise.resolve();
      })
      .then(() => MongoDB.collection('users').findOne({id: user.id}))
      .then(user => {
        // console.log('response', response.statusCode);
        expect(user.dataScopes.bt.test_integer).to.equal(1);
        lastUpdated = user.lastUpdated;
      })
      .then(done)
      .catch(done);
    });


    // Command findOneAndUpdate not supported by mongo-mock

    // it('increase int by 1', (done) => {
    //   const inc_request = {
    //     method: 'PATCH',
    //     url: '/permissions/' + user.id + '/bt',
    //     headers: {},
    //     payload: {
    //       $inc: { "test_integer": 2 },
    //       $mul: { "test_float": 0.5 }
    //     }
    //   };
    //
    //   bpc_helper.request(inc_request, appTicket)
    //   .then(response => {
    //     expect(response.statusCode).to.equal(200);
    //     return Promise.resolve();
    //   })
    //   .then(() => MongoDB.collection('users').findOne({id: user.id}))
    //   .then(user => {
    //     expect(user.dataScopes.bt.test_integer).to.equal(3);
    //
    //     // Operator $mul not supported by mongo-mock yet
    //     // expect(user.dataScopes.bt.test_float).to.equal(3.5);
    //
    //     // Operator $currentDate not supported by mongo-mock yet
    //     // expect(user.lastUpdated).not.to.equal(lastUpdated);
    //   })
    //   .then(done)
    //   .catch(done);
    // });

  });

});
