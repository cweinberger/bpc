/* jshint node: true */
'use strict';

// Bootstrap the testing harness.
const sinon = require('sinon');
const crypto = require('crypto');
const Boom = require('boom');
const MongoDB = require('./mocks/mongodb_mock');
const Applications = require('./../server/applications/applications');

// Test shortcuts.
const { expect, describe, it, before, after } = exports.lab = require('lab').script();



describe('application unit tests', () => {


  before(done => {
    MongoDB.initate().then(done);
  });


  describe('findAll()', () => {

    it('returns at least one app', done => {

      Applications.findAll()
      .then(apps => {

        expect(apps).to.be.an.array();
        expect(apps).not.to.be.empty();

        done();

      })
      .catch(done);
    });
  });


  describe('findAppById()', () => {

    it('returns the correct app', done => {

      Applications.findAppById('valid-app')
      .then(app => {

        expect(app).to.be.an.object();
        expect(app).to.part.include({
          id: 'valid-app', key: 'something_long_and_random'
        });

        done();

      })
      .catch(done);
    });


    it('returns empty response for invalid app ids', done => {

      Applications.findAppById('invalid-app')
      .then(app => {

        expect(app).to.be.null();

        done();

      })
      .catch(done);

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
        algorithm: 'sha256'
      };

      Applications.createApp(newApp)
      .then(app => {

        expect(app.id).to.equal(newApp.id);
        expect(app.scope).to.equal(newApp.scope);
        expect(app.delegate).to.equal(newApp.delegate);
        expect(app.algorithm).to.equal(newApp.algorithm);

        return Promise.resolve();
      })
      .then(() => MongoDB.collection('applications').find({id: 'new-app'}).toArray())
      .then(result => {
        expect(result.length).to.equal(1);
        expect(result[0]).to.part.include(newApp); // There will be "_id" field etc.

        done();

      })
      .catch(done);
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

      })
      .catch(done);
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


  describe('deleteAppById()', () => {

    it('fails for nonexisting app id', done => {

      Applications.deleteAppById('nonexisting-app', {app: 'nonexisting-app'})
      .then(isRemoved => {

        expect(isRemoved).to.be.a.boolean();
        expect(isRemoved).to.be.false();
        done();

      })
      .catch(done);

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

        })
        .catch(done);

      });
    });
  });



  describe('createAppGrant()', () => {

    it('fails for nonexisting app id', done => {

      const grant = {
        app: 'invalid-app',
        user: 'mkoc@berlingskemedia.dk',
        scope: [
          'admin',
          'admin:*',
          'business:all',
          'bt:all'
        ]
      };

      Applications.createAppGrant(grant)
      .then(grant => {

        expect(grant).to.be.undefined();
        done(new Error('Grant must not be issued'))

      }).catch(err => {

        expect(err).to.exist();
        done();

      });
    });

    it('only keeps the app scopes', done => {

      const grant = {
        app: 'valid-app',
        user: 'mkoc@berlingskemedia.dk',
        scope: [
          'admin',
          'admin:*',
          'business:all',
          'bt:all',
          'aok:all' // This one is not in the app, hence should not be in grant.
        ]
      };

      Applications.createAppGrant(grant)
      .then(() => MongoDB.collection('grants').findOne({app:'valid-app', user: 'mkoc@berlingskemedia.dk'}))
      .then(grant => {

        expect(grant).to.be.an.object();
        expect(grant.scope).to.be.an.array();
        expect(grant.scope).to.have.length(4);
        expect(grant.scope).not.to.contain('aok:all');

        done();

      })
      .catch(done);
    });
  });


  describe('updateAppGrant()', () => {

    it('fails for nonexisting app id', done => {

      const grant = {
        app: 'invalid-app',
        user: 'mkoc@berlingskemedia.dk',
        scope: [
          'admin',
          'admin:*',
          'business:all',
          'bt:all'
        ]
      };

      Applications.updateAppGrant(grant)
      .then(grant => {

        expect(grant).to.be.undefined();
        done(new Error('Grant must not be issued'));

      }).catch(err => {

        expect(err).to.exist();
        done();

      });
    });

    it('only keeps the app scopes', done => {

      const grant = {
        app: 'valid-app',
        user: 'mkoc@berlingskemedia.dk',
        scope: [
          'admin',
          'admin:*',
          'business:all',
          'bt:all',
          'b:all', // This one is not in the app, hence should not be in grant.
          'aok:all' // This one is not in the app, hence should not be in grant.
        ]
      };

      Applications.updateAppGrant(grant)
      .then(() => MongoDB.collection('grants').findOne({app:'valid-app', user: 'mkoc@berlingskemedia.dk'}))
      .then(grant => {

        expect(grant).to.be.an.object();
        expect(grant.scope).to.be.an.array();
        expect(grant.scope).to.have.length(4);
        expect(grant.scope).not.to.contain('b:all');
        expect(grant.scope).not.to.contain('aok:all');

        done();

      })
      .catch(done);
    });
  });
});
