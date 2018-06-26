/* jshint node: true */
'use strict';

const test_data = require('./data/test_data');
const bpc_helper = require('./helpers/bpc_helper');
const MongoDB = require('./helpers/mongodb_helper');

// Test shortcuts.
const { expect, describe, it, before, after } = exports.lab = require('lab').script();


describe('application tests', () => {

  const consoleApp = test_data.applications.console;
  var consoleAppTicket;

  const consoleGrant = test_data.grants.console_google_user__console_grant;
  var consoleUserTicket;

  const consoleSuperAdminGrant = test_data.grants.console_superadmin_google_user__console_grant;
  var consoleSuperAdminUserTicket;


  before(done => {
    MongoDB.reset().then(done);
  });

  after(done => {
    MongoDB.clear().then(done);
  });


  // Getting the consoleAppTicket
  before(done => {
    bpc_helper.request({ method: 'POST', url: '/ticket/app' }, consoleApp)
    .then(response => {
      expect(response.statusCode).to.equal(200);
      consoleAppTicket = response.result;
      done();
    })
    .catch(done);
  });


  // Getting the consoleUserTicket
  before(done => {
    bpc_helper.generateRsvp(consoleApp, consoleGrant)
    .then(rsvp => bpc_helper.request({ method: 'POST', url: '/ticket/user', payload: { rsvp: rsvp } }, consoleAppTicket))
    .then(response => {
      expect(response.statusCode).to.equal(200);
      consoleUserTicket = response.result;
      done();
    });
  });


  // Getting the consoleSuperAdminUserTicket
  before(done => {
    bpc_helper.generateRsvp(consoleApp, consoleSuperAdminGrant)
    .then(rsvp => bpc_helper.request({ method: 'POST', url: '/ticket/user', payload: { rsvp: rsvp } }, consoleAppTicket))
    .then(response => {
      expect(response.statusCode).to.equal(200);
      consoleSuperAdminUserTicket = response.result;
      done();
    });
  });



  describe('get the list', () => {

    it('returns at least one app', done => {

      bpc_helper.request({ url: '/applications' }, consoleUserTicket)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        expect(response.result).to.be.an.array();
        expect(response.result).not.to.be.empty();
        response.result.forEach(function(app){
          expect(app.key).to.not.exist();
        });
        done();
      })
      .catch(done);
    });
  });


  describe('get app by id', () => {

    it('returns 403 for normal admin user', done => {

      bpc_helper.request({ url: '/applications/valid-app' }, consoleUserTicket)
      .then(response => {
        expect(response.statusCode).to.equal(403);
        done();
      })
      .catch(done);
    });


    it('returns the correct app', done => {
      bpc_helper.request({ url: '/applications/valid-app' }, consoleSuperAdminUserTicket)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        expect(response.result).to.be.an.object();
        expect(response.result).to.part.include({
          id: 'valid-app', key: 'something_long_and_random'
        });
        done();
      })
      .catch(done);
    });


    it('returns empty response for invalid app ids', done => {
      bpc_helper.request({ url: '/applications/invalid-app' }, consoleSuperAdminUserTicket)
      .then(response => {
        expect(response.statusCode).to.equal(404);
        done();
      })
      .catch(done);
    });
  });



  describe('create', () => {

    const newApp = {
      id: 'new-app',
      scope: [ 'funscope' ],
      delegate: false,
      algorithm: 'sha256'
    };

    it('create new app by console user', done => {

      bpc_helper.request({ url: '/applications', method: 'POST', payload: newApp }, consoleUserTicket)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        expect(response.result.id).to.equal(newApp.id);
        expect(response.result.scope).to.equal(newApp.scope);
        expect(response.result.delegate).to.equal(newApp.delegate);
        expect(response.result.algorithm).to.equal(newApp.algorithm);
        return Promise.resolve();
      })
      .then(() => MongoDB.collection('applications').find({id: 'new-app'}).toArray())
      .then(result => {
        expect(result.length).to.equal(1);
        expect(result[0]).to.part.include(newApp); // There will be "_id" field etc.
        return Promise.resolve();
      })
      .then(done)
      .catch(done);
    });


    it('console user can get own app', done => {

      // Getting a new ticket, since the old ticket does not have the new admin:new-app scope
      bpc_helper.generateRsvp(consoleApp, consoleGrant)
      .then(rsvp => bpc_helper.request({ method: 'POST', url: '/ticket/user', payload: { rsvp: rsvp } }, consoleAppTicket))
      .then(response => {
        expect(response.result.scope).to.include('admin:new-app');
        return Promise.resolve(response.result);
      })
      .then(newConsoleUserTicket => bpc_helper.request({ url: '/applications/new-app' }, newConsoleUserTicket))
      .then(response => {
        expect(response.statusCode).to.equal(200);
        expect(response.result.id).to.equal(newApp.id);
        expect(response.result.scope).to.equal(newApp.scope);
        return Promise.resolve();
      })
      .then(done)
      .catch(done);
    });


    it('creates a new id when app id is taken', done => {

      const newApp = {
        id: 'valid-app',
        scope: [],
        delegate: false,
        key: 'something_long_and_random',
        algorithm: 'sha256'
      };

      bpc_helper.request({ url: '/applications', method: 'POST', payload: newApp }, consoleUserTicket)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        expect(response.result).to.be.an.object();
        expect(response.result.id).to.not.be.empty();
        expect(response.result.id).to.not.equal('valid-app'); // Different id's.
        return Promise.resolve();
      })
      .then(done)
      .catch(done);
    });
  });


  describe('update', () => {

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



  describe('delete', () => {

    it('nonexisting app forbidden for regular console app user', done => {
      bpc_helper.request({ url: '/applications/nonexisting-app', method: 'DELETE' }, consoleUserTicket)
      .then(response => {
        expect(response.statusCode).to.equal(403);
        done();
      });
    });


    it(' nonexisting app for superadmin user return not found', done => {
      bpc_helper.request({ url: '/applications/nonexisting-app', method: 'DELETE' }, consoleSuperAdminUserTicket)
      .then(response => {
        expect(response.statusCode).to.equal(404);
        done();
      });
    });


    it('existing app forbidden for non-admin console app user', done => {

      bpc_helper.request({ url: '/applications/delete-me-app', method: 'DELETE' }, consoleUserTicket)
      .then(response => {

        expect(response.statusCode).to.equal(403);
        done();

      });
    });


    it('superadmin delete app', done => {

      bpc_helper.request({ url: '/applications/delete-me-app', method: 'DELETE' }, consoleSuperAdminUserTicket)
      .then(response => {

        expect(response.statusCode).to.equal(200);

        Promise.all([
          MongoDB.collection('applications').findOne({id: 'delete-me-app'}),
          MongoDB.collection('grants').findOne({app: 'delete-me-app'})
        ]).then(res => {

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
});
