/* jshint node: true */
'use strict';


// Bootstrap the testing harness.
const Oz = require('oz');
const rewire = require('rewire');
const sinon = require('sinon');
const bpc_helper = require('./helpers/bpc_helper');
const MongoDB = require('./helpers/mongodb_mock');
const Gigya = require('./helpers/gigya_stub');
const Google = require('./helpers/google_stub');
const Rsvp = require('./../server/rsvp/rsvp');
const OzLoadFuncs = require('./../server/oz_loadfuncs');

// Test shortcuts.
const { expect, describe, it, before, beforeEach, after } = exports.lab = require('lab').script();


describe('rsvp unit tests', () => {

  describe('grant', () => {

    it('is not expired when grant is undefined', done => {
      const result = OzLoadFuncs.grantIsExpired();
      expect(result).to.be.false();
      done();
    });

    it('is not expired when grant is null', done => {
      const result = OzLoadFuncs.grantIsExpired(null);
      expect(result).to.be.false();
      done();
    });

    it('is not expired when grant.exp is undefined', done => {
      const result = OzLoadFuncs.grantIsExpired({});
      expect(result).to.be.false();
      done();
    });

    it('is not expired when grant.exp is null', done => {
      const result = OzLoadFuncs.grantIsExpired({ exp: null });
      expect(result).to.be.false();
      done();
    });

    it('is not expired when grant.exp is now() + 20000', done => {
      const result = OzLoadFuncs.grantIsExpired({ exp: Oz.hawk.utils.now() + 20000 });
      expect(result).to.be.false();
      done();
    });

    it('expired when grant.exp is now() - 20000', done => {
      const result = OzLoadFuncs.grantIsExpired({ exp: Oz.hawk.utils.now() - 20000 });
      expect(result).to.be.true();
      done();
    });

  });




  describe('create user RSVPs', () => {

    before(done => {
      MongoDB.reset().then(done);
    });

    after(done => {
      MongoDB.clear().then(done);
    });

    before(done => {
      Gigya.callApi.resolves({body: {UID: '123', profile: {email: 'some@email.com'}}});
      done();
    });

    before(done => {
      Google.tokeninfo.resolves({body: {UID: '123', profile: {email: 'some@email.com'}}});
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
        ID: '123',
        email: 'incorrect@domain.com'
      })
      .then(rsvp => {
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
      .then(result => {
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
      .then(result => {
        expect(result.rsvp).to.be.a.string();
        expect(result.rsvp).to.have.length(334);
        done();
      })
      .catch(err => {
        done(new Error('RSVP missing'));
      });
    });
  });


  describe('creating new clean grant', () => {

    before(done => {
      MongoDB.reset().then(done);
    });

    after(done => {
      MongoDB.clear().then(done);
    });

    before(done => {
      Gigya.callApi.resolves({body: {UID: 'userwithnopreviousgrant', profile: {email: 'userwithnopreviousgrant@email.com'}}});
      done();
    });

    after(done => {
      Gigya.callApi.reset();
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
      .then(result => {
        expect(result.rsvp).to.be.a.string();
        expect(result.rsvp).to.have.length(334);
      })
      .then(() => {
        // Wating a second to make sure the grant is saved to MongoDB
        return new Promise(resolve => setTimeout(resolve, 1000));
      })
      .then(() => MongoDB.collection('grants').findOne({user:'userwithnopreviousgrant@email.com', app: 'valid-app'}))
      .then(grant => {
        expect(grant).to.not.be.null();
        expect(grant.id).to.have.length(40);
        done();
      })
      .catch(err => {
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
      .then(result => {
        done(new Error('RSVP must not be issued to userwithnopreviousgrant'));
      })
      .then(() => {
        // Wating a second to make sure the grant is saved to MongoDB
        return new Promise(resolve => setTimeout(resolve, 1000));
      })
      .catch(err => {
        expect(err).to.be.an.error('Forbidden');
        return Promise.resolve();
      })
      .then(() => MongoDB.collection('grants').findOne({user:'userwithnopreviousgrant@email.com', app: 'app_with_disallowAutoCreationGrants'}))
      .then(grant => {
        expect(grant).to.be.null();
        done();
      });
    });
  });
});


describe('rsvp integration test - gigya', () => {

  before(done => {
    MongoDB.reset().then(done);
  });

  after(done => {
    MongoDB.clear().then(done);
  });

  before(done => {
    Gigya.callApi.withArgs('/accounts.exchangeUIDSignature', {
      UID:'doensnotexists',
      UIDSignature:'UIDSignature_random',
      signatureTimestamp:'signatureTimestamp_random'
    })
    .resolves({body: {UID: 'doensnotexists'}});

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
      UIDSignature: 'UIDSignature_random',
      signatureTimestamp: 'signatureTimestamp_random'
    };

    bpc_helper.request({ method: 'POST', url: '/rsvp', payload: payload}, null)
    .then(response => {
      expect(response.statusCode).to.be.equal(200);
      expect(response.result.rsvp).to.have.length(334);
      done();
    })
    .catch(done);
  });


  it('invalid request for rsvp for a gigya user', done => {
    let payload = {
      provider: 'gigya',
      UID: 'doensnotexists',
      email: 'doensnotexists@test.nl',
      app: 'app_with_gigya_provider'
    };

    bpc_helper.request({ method: 'POST', url: '/rsvp', payload: payload}, null)
    .then(response => {
      expect(response.statusCode).to.be.equal(400);
      done();
    })
    .catch(done);
  });

});


describe('rsvp integration test - google', () => {

  before(done => {
    MongoDB.reset().then(done);
  });

  after(done => {
    MongoDB.clear().then(done);
  });

  before(done => {
    Google.tokeninfo //.withArgs({id_token: 'random_id_token_hdjshjdhs', access_token: 'random_access_token_kfjsdhkjfhsdwe'})
    .resolves({user_id: 'doesnotexistsatgoogle', email: 'doensnotexists@testgoogle.nl'});
    done();
  });

  after(done => {
    Google.tokeninfo.reset();
    done();
  });


  it('get rsvp for a google user', done => {
    let payload = {
      provider: 'google',
      ID: 'doesnotexistsatgoogle',
      email: 'doensnotexists@testgoogle.nl',
      app: 'valid-app',
      id_token: 'random_id_token_hdjshjdhs',
      access_token: 'random_access_token_kfjsdhkjfhsdwe'
    };

    bpc_helper.request({ method: 'POST', url: '/rsvp', payload: payload}, null)
    .then(response => {
      expect(response.statusCode).to.be.equal(200);
      expect(response.result.rsvp).to.have.length(334);
      done();
    })
    .catch(done);
  });

  it('get rsvp for a google user', done => {
    let payload = {
      provider: 'google',
      ID: 'doesnotexistsatgoogle',
      email: 'doensnotexists@testgoogle.nl',
      app: 'app_with_gigya_provider',
      id_token: 'random_id_token_nmvbcnm',
      access_token: 'random_access_token_oyiyu'
    };

    bpc_helper.request({ method: 'POST', url: '/rsvp', payload: payload}, null)
    .then(response => {
      expect(response.statusCode).to.be.equal(401);
      done();
    })
    .catch(done);
  });

});
