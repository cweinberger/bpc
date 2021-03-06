/* jshint node: true */
'use strict';

// Bootstrap the testing harness.
const sinon = require('sinon');
const test_data = require('./data/test_data');
const Bpc = require('./helpers/bpc_helper');
const MongoDB = require('./helpers/mongodb_helper');
// const Permissions = require('./../server/permissions');

// Test shortcuts.
const { expect, describe, it, before, after } = exports.lab = require('lab').script();


describe('permissions - integration tests', () => {

  let appTicket;
  const bt = test_data.applications.bt;
  const simple_first_user = test_data.users.simple_first_user;

  before(done => {
    MongoDB.reset().then(done);
  });

  after(done => {
    MongoDB.clear().then(done);
  });

  // Getting the appTicket
  before(done => {
    Bpc.request({ method: 'POST', url: '/ticket/app' }, bt)
    .then(response => {
      appTicket = response.result;
    })
    .then(() => done())
    .catch(done);
  });


  describe('getting user permissions with an app ticket', () => {

    it('getting first user bt permissions', (done) => {
      Bpc.request({ url: '/permissions/' + simple_first_user.id + '/bt' }, appTicket)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        expect(response.result.bt_paywall).to.true();
        expect(response.result.bt_subscription_tier).to.equal('free');
      })
      // .then(() => MongoDB.collection('users').find().toArray())
      // .then(result => {
      //   console.log('result', result);
      // })
      .then(() => done())
      .catch(done);
    });

    it('getting first user bt permissions by email', (done) => {
      Bpc.request({ url: '/permissions/first_user@berlingskemedia.dk/bt' }, appTicket)
      .then(response => {
        expect(response.statusCode).to.equal(404);
      })
      .then(() => done())
      .catch(done);
    });

    it('getting first user bt permissions by uppercase email', (done) => {
      Bpc.request({ url: '/permissions/FIRST_USER@berlingskemedia.dk/bt' }, appTicket)
      .then(response => {
        expect(response.statusCode).to.equal(404);
      })
      .then(() => done())
      .catch(done);
    });


    it('denied first user berlingske permissions', (done) => {
      Bpc.request({ url: '/permissions/' + simple_first_user.id + '/berlingske' }, appTicket)
      .then(response => {
        expect(response.statusCode).to.equal(403);
      })
      .then(() => done())
      .catch(done);
    });

    it('getting non-existing user permissions', (done) => {
      Bpc.request({ url: '/permissions/thisuserdoesnotexist/bt' }, appTicket)
      .then(response => {
        expect(response.statusCode).to.equal(404);
      })
      .then(() => done())
      .catch(done);
    });

  });


  describe('getting user data an app ticket', () => {

    it('getting third users bt permissions by gigya UID', (done) => {
      Bpc.request({ url: '/permissions/5347895384975934842758/bt' }, appTicket)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        expect(response.result.third_user).to.equal(true);
      })
      .then(() => done())
      .catch(done);
    });
  });



  describe('non-existing user permissions with an app ticket', () => {

    it('getting will result in not found', (done) => {
      Bpc.request({ url: '/permissions/thisuserdoesnotexist@test.nl/bt', method: 'GET'}, appTicket)
      .then(response => {
        expect(response.statusCode).to.equal(404);
      })
      .then(() => done())
      .catch(done);
    });

    it('updating will result in not found', (done) => {
      const payload = {
        $inc: { "test_integer": 2 }
      };

      Bpc.request({ url: '/permissions/thisuserdoesnotexist@test.nl/bt', method: 'PATCH', payload: payload}, appTicket)
      .then(response => {
        expect(response.statusCode).to.equal(404);
      })
      .then(() => done())
      .catch(done);
    });


    it('setting will result in being created', (done) => {
      const payload = {
        "test_integer": 2
      };

      Bpc.request({ url: '/permissions/thisuserdoesnotexisteither@test.nl/bt', method: 'POST', payload: payload}, appTicket)
      .then(response => {
        expect(response.statusCode).to.equal(200);
      })
      .then(() => MongoDB.collection('users').findOne({id: 'thisuserdoesnotexisteither@test.nl'}))
      .then(user => {
        expect(user.dataScopes.bt.test_integer).to.equal(2);
        expect(user.provider).to.equal('gigya');
        expect(user.createdAt).to.exist();
        // expect(user.lastUpdated).to.exist();
        // expect(user.lastUpdated).to.equal(user.createdAt);
      })
      .then(() => done())
      .catch(done);
    });
  });


  describe('getting user permissions with user ticket', () => {

    const simple_first_user_bt_grant = test_data.grants.simple_first_user_bt_grant;
    let simple_first_user_ticket;


    before(done => {
      Bpc.generateRsvp(bt, simple_first_user_bt_grant)
      .then(rsvp => Bpc.request({ method: 'POST', url: '/ticket/user', payload: { rsvp: rsvp } }, appTicket))
      .then(response => {
        expect(response.statusCode).to.equal(200);
        simple_first_user_ticket = response.result;
      })
      .then(() => done())
      .catch(done);
    });


    it('validating scope that is not saved/persisten to the profile in MongoDB', (done) => {

      Bpc.request({ url: '/permissions/non_persisted_scope'}, simple_first_user_ticket)
      .then(response => {
        expect(response.statusCode).to.equal(200);
      })
      .then(() => done())
      .catch(done);
    });
  });


  describe('getting user with no dataScopes with an user ticket', () => {

    const app_with_no_scopes = test_data.applications.app_with_no_scopes;
    let app_with_no_scopes_ticket;
    const user_with_no_datascopes_grant = test_data.grants.user_with_no_datascopes_grant;
    let user_with_no_datascopes_ticket;

    before(done => {
      Bpc.request({ method: 'POST', url: '/ticket/app' }, app_with_no_scopes)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        app_with_no_scopes_ticket = response.result;
      })
      .then(() => done())
      .catch(done);
    });

    before(done => {
      Bpc.generateRsvp(app_with_no_scopes, user_with_no_datascopes_grant)
      .then(rsvp => Bpc.request({ method: 'POST', url: '/ticket/user', payload: { rsvp: rsvp } }, app_with_no_scopes_ticket))
      .then(response => {
        expect(response.statusCode).to.equal(200);
        user_with_no_datascopes_ticket = response.result;
      })
      .then(() => done())
      .catch(done);
    });


    it('getting third user permissions by gigya UID', (done) => {
      Bpc.request({ url: '/permissions' }, user_with_no_datascopes_ticket)
      .then(response => {
        expect(response.statusCode).to.equal(200);
      })
      .then(() => done())
      .catch(done);
    });

  });


  describe('scope:read will allow the app to read but not write permissions', () => {

    const app = test_data.applications.berlingske_read_app;
    var appTicket;
    const simple_first_user = test_data.users.simple_first_user;

    before(done => {
      Bpc.request({ method: 'POST', url: '/ticket/app' }, app)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        appTicket = response.result;
      })
      .then(() => done())
      .catch(done);
    });


    it('reading from berlingske scope using an appTicket is allowed', (done) => {
      Bpc.request({ url: `/permissions/${simple_first_user.id}/berlingske` }, appTicket)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        expect(response.result.berlingske_subscription_tier).to.equal('premium');
      })
      .then(() => done())
      .catch(done);
    });


    it('writing to berlingske scope is disallowed', (done) => {
      const payload = {
        a_new_field_that_will_not_be_saved: 12
      };

      Bpc.request({ url: '/permissions/' + simple_first_user.id + '/berlingske', method: 'POST', payload: payload }, appTicket)
      .then(response => {
        expect(response.statusCode).to.equal(403);
      })
      .then(() => done())
      .catch(done);
    });


    it('reading from berlingske scope using a userTicket is also allowed', done => {

      const grant = test_data.grants.simple_first_user_of_berlingske_readonly_app_grant;
      var userTicket;

      Bpc.generateRsvp(app, grant)
      .then(rsvp => Bpc.request({ method: 'POST', url: '/ticket/user', payload: { rsvp: rsvp } }, appTicket))
      .then(response => {
        expect(response.statusCode).to.equal(200);
        userTicket = response.result;
      })
      .then(() => {
        expect(userTicket.scope).to.include('berlingske:read');
      })
      .then(() => Bpc.request({ url: `/permissions/berlingske`}, userTicket))
      .then(response => {
        expect(response.statusCode).to.equal(200);
        expect(response.result.berlingske_subscription_tier).to.equal('premium');
      })
      .then(() => done())
      .catch(done);      
    });
  });


  describe('query permissions with projection (using app ticket)', () => {

    const app = test_data.applications.berlingske;
    const user = test_data.users.xyz_user;
    var appTicket;

    before(done => {
      Bpc.request({ method: 'POST', url: '/ticket/app' }, app)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        appTicket = response.result;
      })
      .then(() => done())
      .catch(done);
    });


    it('return specific fields from berlingske scope', (done) => {
      const projectionRequest = {
        url: `/permissions/${user.id}/berlingske?fieldA=1&fieldC=1`
      };
      Bpc.request(projectionRequest, appTicket)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        expect(response.result.fieldA).to.equal(5);
        expect(response.result.fieldB).to.not.exist();
        expect(response.result.fieldC).to.equal([ 'A', 'B', 'C' ]);
      })
      .then(() => done())
      .catch(done);
    });


    it('suppress specific fields from berlingske scope', (done) => {
      const projectionRequest = {
        url: `/permissions/${user.id}/berlingske?fieldA=0`
      };
      Bpc.request(projectionRequest, appTicket)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        expect(response.result.fieldA).to.not.exist();
        expect(response.result.fieldB).to.equal(8);
        expect(response.result.fieldC).to.equal([ 'A', 'B', 'C' ]);
      })
      .then(() => done())
      .catch(done);
    });


    it('suppress more specific fields from berlingske scope', (done) => {
      const projectionRequest = {
        url: `/permissions/${user.id}/berlingske?fieldA=0&fieldB=0`
      };
      Bpc.request(projectionRequest, appTicket)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        expect(response.result.fieldA).to.not.exist();
        expect(response.result.fieldB).to.not.exist();
        expect(response.result.fieldC).to.equal([ 'A', 'B', 'C' ]);
      })
      .then(() => done())
      .catch(done);
    });


    it('suppress specific fields from berlingske scope', (done) => {
      const projectionRequest = {
        url: `/permissions/${user.id}/berlingske?fieldD.E=1`
      };
      Bpc.request(projectionRequest, appTicket)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        expect(response.result.fieldD).to.equal([{"E": 15}, {"E": 17}]);
      })
      .then(() => done())
      .catch(done);
    });

    it('projection cannot have a mix of inclusion and exclusion', (done) => {
      const projectionRequest = {
        url: `/permissions/${user.id}/berlingske?fieldA=1&fieldB=0`
      };
      Bpc.request(projectionRequest, appTicket)
      .then(response => {
        expect(response.statusCode).to.equal(400);
      })
      .then(() => done())
      .catch(done);
    });

  });

  describe('calculate users access object based on roles', () => {

    const app = test_data.applications.weekendavisen;
    const user = test_data.users.calculate_scope_user;
    var appTicket;

    before(done => {
      Bpc.request({ method: 'POST', url: '/ticket/app' }, app)
        .then(response => {
          expect(response.statusCode).to.equal(200);
          appTicket = response.result;
        })
        .then(() => done())
        .catch(done);
    });

    it('should calculate the user roles and present an access field with boolean values depending on the user data for each role', (done) => {
      const accessRequest = {
        url: `/permissions/${user.id}/weekendavisen`
      };
      Bpc.request(accessRequest, appTicket)
        .then(response => {
          expect(response.statusCode).to.equal(200);
          expect(response.result.access).to.be.an.object();
          expect(response.result.access.waa_epaper).to.be.a.boolean();
          expect(response.result.access.waa_epaper).to.equal(true);
        })
        .then(() => done())
        .catch(done);
    });

  });
  });
