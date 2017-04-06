/* jshint node: true */
'use strict';

// Bootstrap the testing harness.
const Code = require('code');   // assertion library
const Lab = require('lab');
const lab = exports.lab = Lab.script();
const rewire = require('rewire');
const sinon = require('sinon');
const MongoDB = require('./../server/mongo/mongodb_client');
const Applications = require('./../server/applications/applications');

// Test shortcuts.
const describe = lab.describe;
const it = lab.it;
const expect = Code.expect;
const before = lab.before;
const after = lab.after;


// Here we go...
describe('applications', () => {

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

  // TODO: Promisify this so we don't risk a race condition.
  before(done => {

    // Give the test cases an app to use.
    MongoDB.collection('applications').insert({
      id: 'valid-app',
      scope: [
        'admin',
        'admin:*',
        'admin:gdfgfd',
        'admin:uyutyutu'
      ],
      delegate: false,
      key: 'something_long_and_random',
      algorithm: 'sha256'
    });
    // Give the test cases a grant to use.
    MongoDB.collection('grants').insert({
      id: 'jhfgs294723ijsdhfsdfhskjh329423798wsdyre',
      app: 'valid-app',
      user: 'eu-west-1:dd8890ba-fe77-4ba6-8c9d-5ee0efeed605',
      scope: []
    });
    // Give the test cases a user to use.
    MongoDB.collection('users').insert({
      email: 'mkoc@berlingskemedia.dk',
      id: '117880216634946654515',
      provider: 'gigya',
      LastLogin: new Date(),
      dataScopes: {},
      providerData: {}
    });
    done();

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

    it('updates the correct app', done => {

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

    });

  });

});