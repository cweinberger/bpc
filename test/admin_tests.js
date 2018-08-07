/* jshint node: true */
'use strict';

const test_data = require('./data/test_data');
const Bpc = require('./helpers/bpc_helper');
const MongoDB = require('./helpers/mongodb_helper');

// Test shortcuts.
const { expect, describe, it, before, after } = exports.lab = require('lab').script();


describe('admin tests', () => {

  
  before(done => {
    MongoDB.reset().then(done);
  });
  
  after(done => {
    MongoDB.clear().then(done);
  });
  

  const app = test_data.applications.console;
  var appTicket;


  // Getting the appTicket
  before(done => {
    Bpc.request({ method: 'POST', url: '/ticket/app' }, app)
    .then(response => {
      appTicket = response.result;
    })
    .then(() => done())
    .catch(done);
  });


  describe('regular console user', () => {

    const grant = test_data.grants.console_google_user__console_grant;
    var userTicket;

    
    it('getting user ticket', (done) => {
      Bpc.generateRsvp(app, grant)
      .then(rsvp => Bpc.request({ method: 'POST', url: '/ticket/user', payload: { rsvp: rsvp } }, appTicket))
      .then(response => {
        expect(response.statusCode).to.equal(200);
        userTicket = response.result;
        expect(userTicket.scope).to.be.an.array();
        expect(userTicket.scope).to.include('admin');
        expect(userTicket.scope).to.not.include('admin:*');
      })
      .then(() => done())
      .catch(done);
    });


    it('get list of admin users is forbidden', (done) => {
      Bpc.request({ url: `/applications/${app.id}/grants` }, userTicket)
      .then(response => {
        expect(response.statusCode).to.equal(403);
      })
      .then(() => done())
      .catch(done);
    });
  

    it('promote self to superadmin is forbidden', (done) => {

      const request = {
        method: 'POST',
        url: `/admins/superadmin/${grant.id}`
      };

      Bpc.request(request, userTicket)
      .then((response) => {
        expect(response.statusCode).to.equal(403);
      })
      .then(() => done())
      .catch(done);
    });

    
    it('promote another user to superadmin is forbidden', (done) => {

      const grant_two = test_data.grants.console_google_user_two__console_grant;

      const request = {
        method: 'POST',
        url: `/admins/superadmin/${grant_two.id}`
      };

      Bpc.request(request, userTicket)
      .then((response) => {
        expect(response.statusCode).to.equal(403);
      })
      .then(() => done())
      .catch(done);
    });

    
    it('create new app by console user', done => {

      const newApp = {
        id: 'new_app_to_simple_user',
        scope: [ ],
        delegate: false,
        algorithm: 'sha256',
        settings: {
          provider: 'gigya'
        }
      };

      Bpc.request({ url: '/applications', method: 'POST', payload: newApp }, userTicket)
      .then(response => {
        expect(response.statusCode).to.equal(200);
      })
      .then(() => done())
      .catch(done);
    });


    it('refresh console ticket to get new admin:app scope', done => {
      Bpc.generateRsvp(app, grant)
      .then(rsvp => Bpc.request({ method: 'POST', url: '/ticket/user', payload: { rsvp: rsvp } }, appTicket))
      .then(response => {
        expect(response.statusCode).to.equal(200);
        userTicket = response.result;
        expect(userTicket.scope).to.include('admin:new_app_to_simple_user');
      })
      .then(() => done())
      .catch(done);
    });


    it('simple user is made admin', done => {
      const payload = {
        user: 'first_user@berlingskemedia.dk'
      };

      Bpc.request({ url: '/users?email=first_user@berlingskemedia.dk' }, userTicket)
      .then(response => {
        return Promise.resolve(response.result[0]);
      })
      .then(user => Bpc.request(
        {
          url: '/admins/new_app_to_simple_user/admin',
          method: 'POST',
          payload: { user: user._id}
        },
        userTicket
      ))
      .then(response => {
        expect(response.statusCode).to.equal(200);
      })
      .then(() => done())
      .catch(done);
    });


    it('simple user now has grant to console', done => {
      const user = test_data.users.simple_first_user;
      // Finding the new grant to be able to generate RSVP
      MongoDB.collection('grants').findOne({app: 'console', user: user._id })
      .then(grant => Bpc.generateRsvp(app, grant))
      .then(rsvp => Bpc.request({ method: 'POST', url: '/ticket/user', payload: { rsvp: rsvp } }, appTicket))
      .then(response => {
        expect(response.statusCode).to.equal(200);
        expect(response.result.scope).to.include('admin');
        expect(response.result.scope).to.include('admin:new_app_to_simple_user');
      })
      .then(() => done())
      .catch(done);
    });

  });



  describe('superadmin', () => {

    const grant = test_data.grants.console_superadmin_google_user__console_grant;
    var userTicket;

    it('getting superadmin user ticket', (done) => {
      Bpc.generateRsvp(app, grant)
      .then(rsvp => Bpc.request({ method: 'POST', url: '/ticket/user', payload: { rsvp: rsvp } }, appTicket))
      .then(response => {
        expect(response.statusCode).to.equal(200);
        userTicket = response.result;
        expect(userTicket.scope).to.be.an.array();
        expect(userTicket.scope).to.include('admin');
        expect(userTicket.scope).to.include('admin:*');
      })
      .then(() => done())
      .catch(done);
    });


    it('get list of admin users is allowed', (done) => {
      Bpc.request({ url: `/applications/${app.id}/grants` }, userTicket)
      .then(response => {
        expect(response.statusCode).to.equal(200);
        expect(response.result).to.be.an.array();
      })
      .then(() => done())
      .catch(done);
    });


    it('demote self from superadmin fails', (done) => {
      const request = {
        method: 'DELETE',
        url: `/admins/superadmin/${grant.id}`
      };

      Bpc.request(request, userTicket)
      .then((response) => {
        expect(response.statusCode).to.equal(403);
      })
      .then(() => done())
      .catch(done);
    });


    it('promote and demote another user to superadmin succeeds', (done) => {

      const another_grant = test_data.grants.console_google_user__console_grant;

      const promoteRequest = {
        method: 'POST',
        url: `/admins/superadmin/${another_grant.id}`
      };

      const deomoteRequest = {
        method: 'DELETE',
        url: `/admins/superadmin/${another_grant.id}`
      };

      Bpc.request(promoteRequest, userTicket)
      .then((response) => {
        expect(response.statusCode).to.equal(200);
      })
      .then(() => Bpc.request(deomoteRequest, userTicket))
      .then((response) => {
        expect(response.statusCode).to.equal(200);
      })
      .then(() => done())
      .catch(done);
    });


    it('simple user grant to console is expired', done => {

      const user = test_data.users.simple_first_user;

      MongoDB.collection('grants').findOne({app: 'console', user: user._id })
      .then(grant => {

        expect(grant).to.be.an.object();
        expect(grant.exp).to.equal(null);
        expect(grant.scope).to.include('admin:new_app_to_simple_user');

        grant.exp = Date.now();

        const expireGrantRequest = {
          url: `/applications/${app.id}/grants/${grant.id}`,
          method: 'POST',
          payload: JSON.stringify(grant)
        };

        return Bpc.request(expireGrantRequest, userTicket);
      })
      .then(response => {
        expect(response.statusCode).to.equal(200);
        const updatedGrant = response.result;
        expect(updatedGrant).to.be.an.object();
        expect(updatedGrant.exp).to.not.equal(null);
        expect(updatedGrant.scope).to.include('admin:new_app_to_simple_user');
      })
      .then(() => MongoDB.collection('grants').findOne({ app: app.id, user: user._id }))
      .then(dbGrant => {
        expect(dbGrant).to.be.an.object();
        expect(dbGrant.exp).to.not.equal(null);
        expect(dbGrant.scope).to.include('admin:new_app_to_simple_user');
      })
      .then(() => done())
      .catch(done);
    });
  });

});
