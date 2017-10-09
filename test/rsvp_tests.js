/* jshint node: true */
'use strict';


// Bootstrap the testing harness.
const Oz = require('oz');
const rewire = require('rewire');
const sinon = require('sinon');
const bpc_helper = require('./helpers/bpc_helper');
const MongoDB = require('./mocks/mongodb_mock');
const Gigya = require('./mocks/gigya_mock');

// Test shortcuts.
const { expect, describe, it, before, beforeEach, after } = exports.lab = require('lab').script();


// Rewire rsvp.js in order to test internal functions.
const Rsvp = rewire('./../server/rsvp/rsvp');
const grantIsExpired = Rsvp.__get__('grantIsExpired');


describe('rsvp unit tests', () => {

  describe('grant', () => {

    it('is not expired when grant is undefined', done => {
      const result = grantIsExpired();
      expect(result).to.be.false();
      done();
    });

    it('is not expired when grant is null', done => {
      const result = grantIsExpired(null);
      expect(result).to.be.false();
      done();
    });

    it('is not expired when grant.exp is undefined', done => {
      const result = grantIsExpired({});
      expect(result).to.be.false();
      done();
    });

    it('is not expired when grant.exp is null', done => {
      const result = grantIsExpired({ exp: null });
      expect(result).to.be.false();
      done();
    });

    it('is not expired when grant.exp is now() + 20000', done => {
      const result = grantIsExpired({ exp: Oz.hawk.utils.now() + 20000 });
      expect(result).to.be.false();
      done();
    });

    it('expired when grant.exp is now() - 20000', done => {
      const result = grantIsExpired({ exp: Oz.hawk.utils.now() - 20000 });
      expect(result).to.be.true();
      done();
    });

  });




  describe('create user RSVPs', () => {

    before(done => {
      MongoDB.initate().then(done);
    });

    before(done => {
      const getAccountInfoStub = sinon.stub();
      getAccountInfoStub.resolves({body: {profile: {email: 'some@email.com'}}});
      Rsvp.__set__('Gigya.callApi', getAccountInfoStub);
      done();
    });

    before(done => {
      const tokeninfoStub = sinon.stub();
      tokeninfoStub.resolves({email: 'different@email.com'});
      Rsvp.__set__('Google.tokeninfo', tokeninfoStub);
      done();
    });

    it('throws an error for unsupported provider', done => {
      Rsvp.create({
        provider: 'illegal',
        UID: '123',
        email: 'some@email.com',
        app: 'valid-app'
      })
      .then(rsvp => {
        expect(rsvp).to.be.undefined();
        done(new Error('RSVP must not be issued'));
      })
      .catch(err => {
        expect(err).to.exist();
        done();
      });
    });

    it('throws an error for mismatched emails (Gigya)', done => {
      Rsvp.create({
        provider: 'gigya',
        UID: '123',
        email: 'incorrect@domain.com'
      })
      .then(rsvp => {
        expect(rsvp).to.be.undefined();
        done(new Error('RSVP must not be issued'));
      })
      .catch(err => {
        expect(err).to.exist();
        done();
      });
    });


    it('throws an error for mismatched emails (Google)', done => {
      Rsvp.create({
        provider: 'google',
        UID: '123',
        email: 'incorrect@domain.com'
      })
      .then(rsvp => {
        expect(rsvp).to.be.undefined();
        done(new Error('RSVP must not be issued'));
      })
      .catch(err => {
        expect(err).to.exist();
        done();
      });
    });


    it('fails for invalid app id (Gigya)', done => {
      Rsvp.create({
        provider: 'gigya',
        UID: '123',
        email: 'some@email.com',
        app: 'invalid-app'
      })
      .then(rsvp => {
        expect(rsvp).to.be.undefined();
        done(new Error('RSVP must not be issued'));
      })
      .catch(err => {
        expect(err).to.exist();
        expect(err).to.be.an.error('Unknown application');
        done();
      });
    });

    it('returns a RSVP for a valid app id (Gigya)', done => {
      Rsvp.create({
        provider: 'gigya',
        UID: '123',
        email: 'some@email.com',
        app: 'valid-app'
      })
      .then(rsvp => {
        expect(rsvp).to.be.a.string();
        expect(rsvp).to.have.length(334);
        done();
      })
      .catch(err => {
        expect(err).to.not.exist();
        done(new Error('RSVP missing'));
      });
    });
  });


  describe('creating new clean grant', () => {

    before(done => {
      const getAccountInfoStub = sinon.stub();
      getAccountInfoStub.resolves({body: {profile: {email: 'userwithnopreviousgrant@email.com'}}});
      Rsvp.__set__('Gigya.callApi', getAccountInfoStub);
      done();
    });

    beforeEach(done => {
      MongoDB.collection('grants').remove({user:'userwithnopreviousgrant'}, (err) => {
        expect(err).to.be.null();
        done();
      });
    });

    it('created a new clean grant when disallowAutoCreationGrants is not set', done => {
      Rsvp.create({
        provider: 'gigya',
        UID: 'userwithnopreviousgrant',
        email: 'userwithnopreviousgrant@email.com',
        app: 'valid-app'
      })
      .then(rsvp => {
        expect(rsvp).to.be.a.string();
        expect(rsvp).to.have.length(334);

        // Wating a second to make sure the grant is saved to MongoDB
        setTimeout(
          () => {
            MongoDB.collection('grants').findOne({user:'userwithnopreviousgrant@email.com', app: 'valid-app'})
            .then(grant => {
              expect(grant).to.not.be.null();
              expect(grant.id).to.have.length(40);
              done();
            });
          }, 1000
        );

      })
      .catch(err => {
        expect(err).to.not.exist();
        done(new Error('RSVP missing'));
      });
    });

    it('does not create a new clean grant because of disallowAutoCreationGrants is set', done => {
      Rsvp.create({
        provider: 'gigya',
        UID: 'userwithnopreviousgrant',
        email: 'userwithnopreviousgrant@email.com',
        app: 'app_with_disallowAutoCreationGrants'
      })
      .then(rsvp => {
        expect(rsvp).to.not.exist();
        done(new Error('RSVP must not be issued to userwithnopreviousgrant'));
      })
      .catch(err => {
        expect(err).to.be.an.error('Forbidden');

        // Wating a second to make sure the grant is saved to MongoDB
        setTimeout(
          () => {
            MongoDB.collection('grants')
            .findOne({user:'userwithnopreviousgrant@email.com', app: 'app_with_disallowAutoCreationGrants'})
            .then(grant => {
              expect(grant).to.be.null();
              done();
            });
          }, 1000
        );

      });
    });
  });
});


describe('rsvp integration test', () => {

  before(done => {
    bpc_helper.start().then(done);
  });

  before(done => {
    Gigya.callApi.withArgs('/accounts.getAccountInfo', {UID: 'doensnotexists'})
    .resolves({body: {UID: 'doensnotexists', profile: { email: 'doensnotexists@test.nl'}}});
    done();
  });

  after(done => {
    Gigya.callApi.reset();
    done();
  });

  it('get rsvp for a gigya user', done => {
    
    let payload = {
      provider: 'gigya',
      UID: 'doensnotexists',
      email: 'doensnotexists@test.nl',
      app: 'valid-app',
      UIDSignature: 'ignored_in_this_test',
      signatureTimestamp: 'ignored_in_this_test'
    };

    bpc_helper.request({ method: 'POST', url: '/rsvp', payload: payload}, null)
    .then(response => {
      expect(response.statusCode).to.be.equal(200);
      expect(response.result.rsvp).to.have.length(334);
      done();
    });

  });

});
