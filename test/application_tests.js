/* jshint node: true */
'use strict';

// Bootstrap the testing harness.
const Code = require('code');   // assertion library
const Lab = require('lab');
const lab = exports.lab = Lab.script();
const rewire = require('rewire');
const sinon = require('sinon');
const MongoDB = require('./../server/mongo/mongodb_mocked');
const bpc = require('./../server');
// const Applications = require('./../server/applications/applications');
const crypto = require('crypto');

// Test shortcuts.
const describe = lab.describe;
const it = lab.it;
const expect = Code.expect;
const before = lab.before;
const after = lab.after;

// TODO
return; // currently these tests must be re-written

// Here we go...
describe('applications', () => {


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
      // Give the test cases an app to use.
      MongoDB.collection('applications').insert({
        id: 'valid-app',
        scope: [
          'admin',
          'admin:*',
          'business:all',
          'bt:all'
        ],
        delegate: false,
        key: 'something_long_and_random',
        algorithm: 'sha256'
      }),
      MongoDB.collection('applications').insert({
        id: 'delete-me-app',
        scope: [
          'admin',
          'admin:*',
          'admin:gdfgfd',
          'admin:uyutyutu'
        ],
        delegate: false,
        key: 'something_long_and_random',
        algorithm: 'sha256'
      }),
      // Give the test cases a grant to use.
      MongoDB.collection('grants').insert({
        id: 'jhfgs294723ijsdhfsdfhskjh329423798wsdyre',
        app: 'valid-app',
        user: 'eu-west-1:dd8890ba-fe77-4ba6-8c9d-5ee0efeed605',
        scope: []
      }),
      // Give the test cases a grant to use.
      MongoDB.collection('grants').insert({
        id: 'jhfgs294723ijsdhfsdfhskjh329423798animal',
        app: 'delete-me-app',
        user: 'eu-west-1:dd8890ba-fe77-4ba6-8c9d-5ee0efeed605',
        scope: []
      }),
      // Give the test cases a user to use.
      MongoDB.collection('users').insert({
        email: 'mkoc@berlingskemedia.dk',
        id: '117880216634946654515',
        provider: 'gigya',
        lastLogin: new Date(),
        dataScopes: {},
        providerData: {}
      })
    ]).then(res => {
      done();
    })

  });


  describe('findAll()', () => {

    it('returns at least one app', done => {

      Applications.findAll().then(apps => {

        expect(apps).to.be.an.array();
        expect(apps).not.to.be.empty();
        done();

      });

    });

  });


  describe('findAppById()', () => {

    it('returns the correct app', done => {

      Applications.findAppById('valid-app').then(app => {

        expect(app).to.be.an.object();
        expect(app).to.part.include({
          id: 'valid-app', key: 'something_long_and_random'
        });
        done();

      });

    });

    it('returns empty response for invalid app ids', done => {

      Applications.findAppById('invalid-app').then(app => {

        expect(app).to.be.null();
        done();

      });

    });

  });


  describe('createApp()', () => {

    it('inserts an app into the "applications" collection', done => {

      const newApp = {
        id: 'new-app',
        scope: [
          'admin',
        ],
        delegate: false,
        key: 'something_long_and_random',
        algorithm: 'sha256'
      };

      Applications.createApp(newApp).then(app => {

        expect(app).to.part.include(newApp); // Also testing the promise.

        MongoDB.collection('applications').findOne({id: 'new-app'}).then(_app => {

          expect(_app).to.part.include(newApp); // There will be "_id" field etc.
          done();

        });

      });

    });

    it('creates a new id when app id is taken', done => {

      const newApp = {
        id: 'valid-app',
        scope: [
          'admin',
        ],
        delegate: false,
        key: 'something_long_and_random',
        algorithm: 'sha256'
      };

      Applications.createApp(newApp).then(app => {

        expect(app).to.be.an.object();
        expect(app.id).to.not.be.empty();
        expect(app.id).to.not.equal('valid-app'); // Different id's.
        done();

      });

    });

  });


  describe('updateApp()', () => {

    // TODO: Test is currently skipped due to lacking support in mongo-mock:
    // findOneAndUpdate().
    /* it('updates the correct app', done => {

      MongoDB.collection('applications').findOne({id: 'valid-app'}).then(app => {

        expect(app).to.be.an.object();
        expect(app.id).to.equal('valid-app');
        expect(app.delegate).to.equal(false);

        // Change the app.
        app.delegate = true;

        Applications.updateApp('valid-app', app).then(res => {

          expect(res).to.be.an.object();
          expect(res.id).to.equal('valid-app');

          MongoDB.collection('applications').findOne({id: 'valid-app'}).then(_app => {

            expect(_app).to.be.an.object();
            expect(_app.id).to.equal('valid-app');
            expect(_app.delegate).to.equal(true);
            done();

          });

        });

      });

    }); */

  });


  // TODO: Test is currently skipped due to lacking support in mongo-mock.
  describe('deleteAppById()', () => {

    it('fails for nonexisting app id', done => {

      Applications.deleteAppById('nonexisting-app', {app: 'nonexisting-app'})
          .then(isRemoved => {

        expect(isRemoved).to.be.a.boolean();
        expect(isRemoved).to.be.false();
        done();

      });

    });

    it('removes all traces of the app', done => {

      Applications.deleteAppById('delete-me-app', {app: 'delete-me-app'})
          .then(isRemoved => {

        Promise.all([
          MongoDB.collection('applications').findOne({id: 'delete-me-app'}),
          MongoDB.collection('grants').findOne({app: 'delete-me-app'})
        ]).then(res => {

          expect(isRemoved).to.be.a.boolean();
          expect(isRemoved).to.be.true();
          expect(res).to.be.an.array();
          expect(res).to.have.length(2);
          expect(res[0]).to.be.null();
          expect(res[1]).to.be.null();
          done();

        }).catch(err => {

          console.error(err);
          Code.fail(err.message);

        });

      });

    });

  });


  // TODO: Test is currently skipped due to lacking support in mongo-mock.
  describe('assignAdminScope()', () => {

    it('fails for nonexisting app id', done => {

      const ticket = {
        app: 'invalid-app',
        grant: crypto.randomBytes(20).toString('hex')
      }

      Applications.assignAdminScope('invalid-app', ticket).then(isUpdated => {

        expect(isUpdated).to.be.a.boolean();
        expect(isUpdated).to.be.false();
        done();

      }).catch(err => {

        Code.fail(err.message);

      });

    });

    it('succeeds for existing app id', done => {

      const ticket = {
        app: 'valid-app',
        grant: 'jhfgs294723ijsdhfsdfhskjh329423798wsdyre'
      }

      Applications.assignAdminScope('valid-app', ticket).then(isUpdated => {

        expect(isUpdated).to.be.a.boolean();
        expect(isUpdated).to.be.true();
        done();

      }).catch(err => {

        Code.fail(err.message);

      });

    });

  });


  describe('createAppGrant()', () => {

    it('fails for nonexisting app id', done => {

      const grant = {
        user: '117880216634946654515',
        scope: [
          'admin',
          'admin:*',
          'business:all',
          'bt:all'
        ]
      };

      Applications.createAppGrant('invalid-app', grant).then(grant => {

        expect(grant).to.be.undefined();
        done();

      }).catch(err => {

        Code.fail(err.message);

      });

    });

    it('only keeps the app scopes', done => {

      const grant = {
        user: '117880216634946654515',
        scope: [
          'admin',
          'admin:*',
          'business:all',
          'bt:all',
          'aok:all' // This one is not in the app, hence should not be in grant.
        ]
      };

      Applications.createAppGrant('valid-app', grant).then(grant => {

        expect(grant).to.be.an.object();
        expect(grant.scope).to.be.an.array();
        expect(grant.scope).to.have.length(4);
        expect(grant.scope).not.to.contain('aok:all');
        done();

      }).catch(err => {

        Code.fail(err.message);

      });

    });

  });


  describe('updateAppGrant()', () => {

    it('fails for nonexisting app id', done => {

      const grant = {
        user: '117880216634946654515',
        scope: [
          'admin',
          'admin:*',
          'business:all',
          'bt:all'
        ]
      };

      Applications.updateAppGrant('invalid-app', grant).then(grant => {

        expect(grant).to.be.undefined();
        done();

      }).catch(err => {

        Code.fail(err.message);

      });

    });

    it('only keeps the app scopes', done => {

      const grant = {
        user: '117880216634946654515',
        scope: [
          'admin',
          'admin:*',
          'business:all',
          'bt:all',
          'b:all', // This one is not in the app, hence should not be in grant.
          'aok:all' // This one is not in the app, hence should not be in grant.
        ]
      };

      Applications.updateAppGrant('valid-app', grant).then(grant => {

        expect(grant).to.be.an.object();
        expect(grant.scope).to.be.an.array();
        expect(grant.scope).to.have.length(4);
        expect(grant.scope).not.to.contain('b:all');
        expect(grant.scope).not.to.contain('aok:all');
        done();

      }).catch(err => {

        Code.fail(err.message);

      });

    });

  });


});
