/* jshint node: true */
'use strict';

const test_data = require('./data/test_data');
const Bpc = require('./helpers/bpc_helper');
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
    Bpc.request({ method: 'POST', url: '/ticket/app' }, consoleApp)
    .then(response => {
      expect(response.statusCode).to.equal(200);
      consoleAppTicket = response.result;
    })
    .then(() => done())
    .catch(done);
  });


  // Getting the consoleUserTicket
  before(done => {
    Bpc.generateRsvp(consoleApp, consoleGrant)
    .then(rsvp => Bpc.request({ method: 'POST', url: '/ticket/user', payload: { rsvp: rsvp } }, consoleAppTicket))
    .then(response => {
      expect(response.statusCode).to.equal(200);
      consoleUserTicket = response.result;
    })
    .then(() => done());
  });


  // Getting the consoleSuperAdminUserTicket
  before(done => {
    Bpc.generateRsvp(consoleApp, consoleSuperAdminGrant)
    .then(rsvp => Bpc.request({ method: 'POST', url: '/ticket/user', payload: { rsvp: rsvp } }, consoleAppTicket))
    .then(response => {
      expect(response.statusCode).to.equal(200);
      consoleSuperAdminUserTicket = response.result;
    })
    .then(() => done());
  });



  describe('get the list', () => {

    it('returns at least one app', done => {

      Bpc.request({ url: '/applications' }, consoleUserTicket)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        expect(response.result).to.be.an.array();
        expect(response.result).not.to.be.empty();
        response.result.forEach(function(app){
          expect(app.key).to.not.exist();
        });
      })
      .then(() => done())
      .catch(done);
    });
  });


  describe('get app by id', () => {

    it('returns 403 for normal admin user', done => {

      Bpc.request({ url: '/applications/valid_app' }, consoleUserTicket)
      .then(response => {
        expect(response.statusCode).to.equal(403);
      })
      .then(() => done())
      .catch(done);
    });


    it('returns the correct app', done => {
      Bpc.request({ url: '/applications/valid_app' }, consoleSuperAdminUserTicket)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        expect(response.result).to.be.an.object();
        expect(response.result).to.part.include({
          id: 'valid_app', key: 'something_long_and_random'
        });
      })
      .then(() => done())
      .catch(done);
    });


    it('returns empty response for invalid app ids', done => {
      Bpc.request({ url: '/applications/invalid_app' }, consoleSuperAdminUserTicket)
      .then(response => {
        expect(response.statusCode).to.equal(404);
      })
      .then(() => done())
      .catch(done);
    });
  });



  describe('create', () => {

    const newApp = {
      id: 'new_app',
      scope: [ 'funscope' ],
      delegate: false,
      algorithm: 'sha256',
      settings: {
        provider: 'gigya'
      }
    };

    it('create new app by console user', done => {

      Bpc.request({ url: '/applications', method: 'POST', payload: newApp }, consoleUserTicket)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        expect(response.result.id).to.equal(newApp.id);
        expect(response.result.scope).to.equal(newApp.scope);
        expect(response.result.delegate).to.equal(newApp.delegate);
        expect(response.result.algorithm).to.equal(newApp.algorithm);
      })
      .then(() => MongoDB.collection('applications').find({ id: 'new_app' }).toArray())
      .then(result => {
        expect(result.length).to.equal(1);
        expect(result[0]).to.part.include(newApp); // There will be "_id" field etc.
      })
      .then(() => done())
      .catch(done);
    });


    it('console user can get own app', done => {

      // Getting a new ticket, since the old ticket does not have the new admin:new-app scope
      Bpc.generateRsvp(consoleApp, consoleGrant)
      .then(rsvp => Bpc.request({ method: 'POST', url: '/ticket/user', payload: { rsvp: rsvp } }, consoleAppTicket))
      .then(response => {
        expect(response.result.scope).to.include('admin:new_app');
        return Promise.resolve(response.result);
      })
      .then(newConsoleUserTicket => Bpc.request({ url: '/applications/new_app' }, newConsoleUserTicket))
      .then(response => {
        expect(response.statusCode).to.equal(200);
        expect(response.result.id).to.equal(newApp.id);
        expect(response.result.scope).to.equal(newApp.scope);
      })
      .then(() => done())
      .catch(done);
    });


    it('creates a new id when app id is taken', done => {

      const newApp = {
        id: 'valid_app',
        scope: [],
        delegate: false,
        algorithm: 'sha256',
        settings: {
          provider: 'gigya'
        }
      };

      Bpc.request({ url: '/applications', method: 'POST', payload: newApp }, consoleUserTicket)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        expect(response.result).to.be.an.object();
        expect(response.result.id).to.not.be.empty();
        expect(response.result.id).to.not.equal('valid_app'); // Different id's.
      })
      .then(() => done())
      .catch(done);
    });


    it('create without settings use default values', done => {

      const newApp = {
        id: 'djkhfksh',
        scope: [],
        delegate: false,
        key: 'something_long_and_random',
        algorithm: 'sha256'
      };

      Bpc.request({ url: '/applications', method: 'POST', payload: newApp }, consoleUserTicket)
      .then(response => {
        expect(response.statusCode).to.equal(200);
      })
      .then(() => MongoDB.collection('applications').findOne({ id: newApp.id}))
      .then(savedApp => {
        expect(savedApp.algorithm).to.equal(newApp.algorithm);
        expect(savedApp.scope).to.equal(newApp.scope);
        expect(savedApp.key).to.not.equal(newApp.key);
        expect(savedApp.settings).to.be.an.object();
        expect(savedApp.settings.provider).to.equal('gigya');
      })
      .then(() => done())
      .catch(done);
    });


    it('create without provider will set default value', done => {

      const newApp = {
        id: 'fjhsdkj',
        scope: [],
        delegate: false,
        algorithm: 'sha256',
        settings: {
          someSetting: true
        }
      };

      Bpc.request({ url: '/applications', method: 'POST', payload: newApp }, consoleUserTicket)
      .then(response => {
        expect(response.statusCode).to.equal(200);
      })
      .then(() => MongoDB.collection('applications').findOne({ id: newApp.id}))
      .then(savedApp => {
        expect(savedApp.settings).to.be.an.object();
        expect(savedApp.settings.provider).to.equal('gigya');
        expect(savedApp.settings.someSetting).to.equal(true);
      })
      .then(() => done())
      .catch(done);
    });


    it('create with invalid app id *', done => {
      const invalidAppId = {
        id: '*',
        scope: [],
        delegate: false,
        key: 'something_long_and_random',
        algorithm: 'sha256',
        settings: {
          provider: 'gigya'
        }
      };

      Bpc.request({ url: '/applications', method: 'POST', payload: invalidAppId }, consoleUserTicket)
      .then(response => {
        expect(response.statusCode).to.equal(400);
      })
      .then(() => done())
      .catch(done);
    });


    it('create with a too short app id', done => {
      const invalidAppId = {
        id: 'a',
        scope: [],
        delegate: false,
        key: 'something_long_and_random',
        algorithm: 'sha256',
        settings: {
          provider: 'gigya'
        }
      };

      Bpc.request({ url: '/applications', method: 'POST', payload: invalidAppId }, consoleUserTicket)
      .then(response => {
        expect(response.statusCode).to.equal(400);
      })
      .then(() => done())
      .catch(done);
    });


    it('create with a too long app id', done => {
      const invalidAppId = {
        id: 'fdsjhkjsdfhgkfjsdhgkjsdfhgkljhsdfgkjhsdfgkhs',
        scope: [],
        delegate: false,
        key: 'something_long_and_random',
        algorithm: 'sha256',
        settings: {
          provider: 'gigya'
        }
      };

      Bpc.request({ url: '/applications', method: 'POST', payload: invalidAppId }, consoleUserTicket)
      .then(response => {
        expect(response.statusCode).to.equal(400);
      })
      .then(() => done())
      .catch(done);
    });


    it('create with a too short scope name', done => {
      const invalidAppId = {
        id: 'abcsdsdfjksdh',
        scope: ['a'],
        delegate: false,
        key: 'something_long_and_random',
        algorithm: 'sha256',
        settings: {
          provider: 'gigya'
        }
      };

      Bpc.request({ url: '/applications', method: 'POST', payload: invalidAppId }, consoleUserTicket)
      .then(response => {
        expect(response.statusCode).to.equal(400);
      })
      .then(() => done())
      .catch(done);
    });


    it('create with a too long scope name', done => {
      const invalidAppId = {
        id: 'abcsdsdfjksdh',
        scope: ['fsdkjhfkjsdhfkjsdhfklsjhdfkhsdkfhsdkvcxnbvmnxbc'],
        delegate: false,
        key: 'something_long_and_random',
        algorithm: 'sha256',
        settings: {
          provider: 'gigya'
        }
      };

      Bpc.request({ url: '/applications', method: 'POST', payload: invalidAppId }, consoleUserTicket)
      .then(response => {
        expect(response.statusCode).to.equal(400);
      })
      .then(() => done())
      .catch(done);
    });
  });


  describe('update', () => {

    it('update not allowed for non-admin user', done => {
      
      var app = test_data.applications.valid_app;

      const updateRequest = {
        url: `/applications/${app.id}`,
        method: 'PUT',
        payload: JSON.stringify(app)
      };

      Bpc.request(updateRequest, consoleUserTicket)
      .then(response => {
        expect(response.statusCode).to.equal(403);
      })
      .then(() => done())
      .catch(done);
    });


    it('duplicates in scope are removed and key is ignored', done => {

      var app = test_data.applications.valid_app;
      app.scope.push('test_scope');
      app.scope.push('test_scope');
      app.key = 'somenewkeythatisignored';

      const updateRequest = {
        url: `/applications/${app.id}`,
        method: 'PUT',
        payload: JSON.stringify(app)
      };

      Bpc.request(updateRequest, consoleSuperAdminUserTicket)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        expect(response.result.status).to.equal('ok');
      })
      .then(() => MongoDB.collection('applications').findOne({ id: app.id}))
      .then(savedApp => {
        expect(savedApp.scope).to.be.an.array();
        expect(savedApp.scope).to.once.include('test_scope');
        expect(savedApp.key).to.not.be.equal('somenewkeythatisignored');
      })
      .then(() => done())
      .catch(done);
    });


    it('update a setting on app does not change setttings.provider to default', done => {
      var app = test_data.applications.valid_google_app;

      app.settings.allowAnonymousUsers = true;

      const updateRequest = {
        url: `/applications/${app.id}`,
        method: 'PUT',
        payload: JSON.stringify(app)
      };

      Bpc.request(updateRequest, consoleSuperAdminUserTicket)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        expect(response.result.status).to.equal('ok');
      })
      .then(() => MongoDB.collection('applications').findOne({ id: app.id}))
      .then(savedApp => {
        expect(savedApp.settings.provider).to.equal('google');
      })
      .then(() => done())
      .catch(done);
    });

  });



  describe('delete', () => {

    it('nonexisting app forbidden for regular console app user', done => {
      Bpc.request({ url: '/applications/nonexisting-app', method: 'DELETE' }, consoleUserTicket)
      .then(response => {
        expect(response.statusCode).to.equal(403);
      })
      .then(() => done())
      .catch(done);
    });


    it(' nonexisting app for superadmin user return not found', done => {
      Bpc.request({ url: '/applications/nonexisting-app', method: 'DELETE' }, consoleSuperAdminUserTicket)
      .then(response => {
        expect(response.statusCode).to.equal(404);
      })
      .then(() => done())
      .catch(done);
    });


    it('existing app forbidden for non-admin console app user', done => {

      Bpc.request({ url: '/applications/delete_me_app', method: 'DELETE' }, consoleUserTicket)
      .then(response => {
        expect(response.statusCode).to.equal(403);
      })
      .then(() => done())
      .catch(done);
    });


    it('superadmin delete app', done => {

      Bpc.request({ url: '/applications/delete_me_app', method: 'DELETE' }, consoleSuperAdminUserTicket)
      .then(response => {

        expect(response.statusCode).to.equal(200);

        Promise.all([
          MongoDB.collection('applications').findOne({id: 'delete_me_app'}),
          MongoDB.collection('grants').findOne({app: 'delete_me_app'})
        ]).then(res => {

          expect(res).to.be.an.array();
          expect(res).to.have.length(2);
          expect(res[0]).to.be.null();
          expect(res[1]).to.be.null();
        })
        .then(() => done())
        .catch(done);
      });
    });
  });


  describe('get appTicket and perform admin tasks', () => {

    const app = test_data.applications.bt;
    const adminAppScope = `admin:${app.id}:app`;
    var appTicket;

    it('appTicket has admin:{id} scope', done => {

      expect(app.scope).to.not.include(adminAppScope);

      Bpc.request({ method: 'POST', url: '/ticket/app' }, app)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        appTicket = response.result;
      })
      .then(() => {
        expect(appTicket.scope).to.include(adminAppScope);
        expect(appTicket.scope).to.not.include('admin:*');
      })
      .then(() => done())
      .catch(done);
    });


    it('userTicket must NOT have admin-scope', done => {
      const grant = test_data.grants.simple_first_user_bt_grant;
      Bpc.generateRsvp(app, grant)
      .then(rsvp => Bpc.request({ method: 'POST', url: '/ticket/user', payload: { rsvp: rsvp } }, appTicket))
      .then(response => {
        expect(response.statusCode).to.equal(200);
        expect(response.result.scope).to.not.include(adminAppScope);
      })
      .then(() => done())
      .catch(done);
    });


    it('gettings app settings using regular appTicket succeeds', done => {
      const getAppRequest = {
        url: `/applications/${app.id}`
      };

      Bpc.request(getAppRequest, appTicket)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        expect(response.result.key).to.equal(app.key);
        expect(response.result.settings.provider).to.equal(app.settings.provider);
      })
      .then(() => done())
      .catch(done);
    });


    it('updating app settings using regular appTicket succeeds', done => {
      const updateAppRequest = {
        url: `/applications/${app.id}`,
        method: 'PUT',
        payload: {
          settings: {
            someNewSetting: true
          }
        }
      };

      Bpc.request(updateAppRequest, appTicket)
      .then(response => {
        expect(response.statusCode).to.equal(200);
      })
      .then(() => MongoDB.collection('applications').findOne({id: app.id}))
      .then(appInDatabase => {
        expect(appInDatabase.settings.provider).to.equal('gigya');
        expect(appInDatabase.settings.someNewSetting).to.equal(true);
      })
      .then(() => done())
      .catch(done);
    });


    it('deleting app using regular appTicket fails', done => {
      done();
    });


    it('adding grants using regular appTicket succeeds', done => {
      done();
    });


    it('deleting grants using regular appTicket succeeds', done => {
      done();
    });

    
    console.log('TODO: make sure adding using /admins endpoint using standard appTicket, will go to the console');
    it('adding admins using standard appTicket will TODO', done => {
      done();
    });

  });
});
