/* jshint node: true */
'use strict';

// Bootstrap the testing harness.
const sinon = require('sinon');
const MongoDB = require('./helpers/mongodb_helper');
const test_data = require('./data/test_data');
const Bpc = require('./helpers/bpc_helper');
// const Permissions = require('./../server/permissions');

// Test shortcuts.
const { expect, describe, it, before, after } = exports.lab = require('lab').script();


describe('scope datafields - integration tests', () => {

  var appTicket;
  var bt = test_data.applications.bt;
  var user = test_data.users.simple_first_user;

  before(done => {
    MongoDB.reset().then(done);
  });

  after(done => {
    MongoDB.clear().then(done);
  });

  // Getting the appTicket
  before((done) => {
    Bpc.request({ method: 'POST', url: '/ticket/app' }, bt)
    .then(response => {
      appTicket = response.result;
    })
    .then(() => done())
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

      Bpc.request(set_request, appTicket)
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
      .then(() => done())
      .catch(done);
    });



    it('increase and multiply int', (done) => {
      const inc_request = {
        method: 'PATCH',
        url: '/permissions/' + user.id + '/bt',
        headers: {},
        payload: {
          $inc: { "test_integer": 2 },
          $mul: { "test_float": 0.5 }
        }
      };
    
      Bpc.request(inc_request, appTicket)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        return Promise.resolve();
      })
      .then(() => MongoDB.collection('users').findOne({id: user.id}))
      .then(user => {
        expect(user.dataScopes.bt.test_integer).to.equal(3);
        expect(user.dataScopes.bt.test_float).to.equal(3.5);    
        expect(user.lastUpdated).not.to.equal(lastUpdated);
      })
      .then(done)
      .catch(done);
    });


    it('increase and multiply int once again', (done) => {
      const inc_request = {
        method: 'PATCH',
        url: '/permissions/' + user.id + '/bt',
        headers: {},
        payload: {
          $inc: { "test_integer": 4 },
          $mul: { "test_float": 2 }
        }
      };
    
      Bpc.request(inc_request, appTicket)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        return Promise.resolve();
      })
      .then(() => MongoDB.collection('users').findOne({id: user.id}))
      .then(user => {
        expect(user.dataScopes.bt.test_integer).to.equal(7);
        expect(user.dataScopes.bt.test_float).to.equal(7);    
        expect(user.lastUpdated).not.to.equal(lastUpdated);
      })
      .then(done)
      .catch(done);
    });


    it('increase on a non-existing nested object', (done) => {
      const inc_request = {
        method: 'PATCH',
        url: '/permissions/' + user.id + '/bt',
        headers: {},
        payload: {
          $inc: {
            "newObject.newValueA": 2,
            "newObject.newValueB": 5
          }
        }
      };
    
      Bpc.request(inc_request, appTicket)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        return Promise.resolve();
      })
      .then(() => MongoDB.collection('users').findOne({id: user.id}))
      .then(user => {
        expect(user.dataScopes.bt.newObject).to.be.an.object();
        expect(user.dataScopes.bt.newObject.newValueA).to.equal(2);
        expect(user.dataScopes.bt.newObject.newValueB).to.equal(5);
      })
      .then(done)
      .catch(done);
    });

  });
});
