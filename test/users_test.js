/* jshint node: true */
'use strict';

// Bootstrap the testing harness.
const test_data = require('./data/test_data');
const bpc_helper = require('./helpers/bpc_helper');
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

  describe('creating a user with an app ticket', () => {

  });


  describe('getting user with an app ticket', () => {

    const app = test_data.applications.bt;
    var appTicket;
    const simple_first_user = test_data.users.simple_first_user;

    // Getting the appTicket
    before(done => {
      bpc_helper.request({ method: 'POST', url: '/ticket/app' }, app)
      .then((response) => {
        appTicket = response.result;
      })
      .then(() => done())
      .catch(done);
    });


    it('getting first user bt permissions', (done) => {
      bpc_helper.request({ method: 'GET', url: '/permissions/' + simple_first_user.id + '/bt'}, appTicket)
      .then((response) => {
        expect(response.statusCode).to.equal(200);
        expect(response.result.bt_paywall).to.true();
        done();
      });
    });
  });


  describe('deleting user using an application with admin scope', () => {

    const app = test_data.applications.app_with_admin_scope;
    let appTicket;

    // Getting the appTicket
    before(done => {
      bpc_helper.request({ method: 'POST', url: '/ticket/app' }, app)
      .then((response) => {
        expect(response.statusCode).to.equal(200);
        appTicket = response.result;
        done();
      });
    });

    it('delete user succeeds', done => {
      let options = {
        method: 'DELETE',
        url: '/users/5347895384975934842757'
      };

      bpc_helper.request(options, appTicket)
      .then((response) => {
        expect(response.statusCode).to.equal(200);

        MongoDB.collection('users')
        .find({id: '5347895384975934842757'})
        .toArray(function(err, result){
          expect(result.length).to.equal(0);

          done();
        });
      });
    });
  });

});
