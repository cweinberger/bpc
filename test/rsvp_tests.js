/* jshint node: true */
'use strict';


// Bootstrap the testing harness.
const Oz = require('oz');
const sinon = require('sinon');
const Bpc = require('./helpers/bpc_helper');
const MongoDB = require('./helpers/mongodb_helper');
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


    it('fails for invalid app id (Gigya)', done => {
      Rsvp.create({
        provider: 'gigya',
        UID: '123',
        UIDSignature:'UIDSignature_random',
        signatureTimestamp:'signatureTimestamp_random',
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
        UIDSignature:'UIDSignature_random',
        signatureTimestamp:'signatureTimestamp_random',
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
        UIDSignature:'UIDSignature_random',
        signatureTimestamp:'signatureTimestamp_random',
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
      .then(() => MongoDB.collection('users').findOne({id:'userwithnopreviousgrant'}))
      .then(user => {
        expect(user).to.not.be.null();
        expect(user.email).to.be.equal('userwithnopreviousgrant@email.com');
        expect(user.provider).to.be.equal('gigya');
        return Promise.resolve(user);
      })
      .then(user => MongoDB.collection('grants').findOne({user: user._id, app: 'valid-app'}))
      .then(grant => {
        expect(grant).to.not.be.null();
        expect(grant.id).to.have.length(40);
        expect(grant.app).to.be.equal('valid-app');
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
        UIDSignature:'UIDSignature_random',
        signatureTimestamp:'signatureTimestamp_random',
        email: 'userwithnopreviousgrant@email.com',
        app: 'app_that_disallowAutoCreationGrants'
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
      .then(() => MongoDB.collection('grants').findOne({user:'userwithnopreviousgrant@email.com', app: 'app_that_disallowAutoCreationGrants'}))
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

    Bpc.request({ method: 'POST', url: '/rsvp', payload: payload})
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

    Bpc.request({ method: 'POST', url: '/rsvp', payload: payload})
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
      ID: 'doesnotexistsatgoogle',
      email: 'doensnotexists@testgoogle.nl',
      app: 'valid-google-app',
      id_token: 'random_id_token_hdjshjdhs',
      access_token: 'random_access_token_kfjsdhkjfhsdwe'
    };

    Bpc.request({ method: 'POST', url: '/rsvp', payload: payload})
    .then(response => {
      expect(response.statusCode).to.be.equal(200);
      expect(response.result.rsvp.length).to.be.within(300,360);
      done();
    })
    .catch(done);
  });

  it('get rsvp for a google user but app is using gigya', done => {
    let payload = {
      provider: 'google',
      ID: 'doesnotexistsatgoogle',
      email: 'doensnotexists@testgoogle.nl',
      app: 'app_with_gigya_provider',
      id_token: 'random_id_token_nmvbcnm',
      access_token: 'random_access_token_oyiyu'
    };

    Bpc.request({ method: 'POST', url: '/rsvp', payload: payload})
    .then(response => {
      expect(response.statusCode).to.be.equal(400);
      done();
    })
    .catch(done);
  });

});


describe('rsvp integration test - email masks', () => {

  before(done => {
    MongoDB.reset().then(done);
  });

  after(done => {
    MongoDB.clear().then(done);
  });

  before(done => {

    // exchangeUIDSignature
    Gigya.callApi.withArgs('/accounts.exchangeUIDSignature', {
      UID: 'user_with_valid_email_domain',
      UIDSignature:'UIDSignature_random',
      signatureTimestamp:'signatureTimestamp_random'
    })
    .resolves({ body: {UID: 'user_with_valid_email_domain'}});
    
    // getAccountInfo
    Gigya.callApi.withArgs('/accounts.getAccountInfo', {
      UID: 'user_with_valid_email_domain'
    })
    .resolves({ body: {
      UID: 'user_with_valid_email_domain',
      profile: { email: 'user_with_valid_email_domain@validdomain.nl'}}
    });


    // exchangeUIDSignature
    Gigya.callApi.withArgs('/accounts.exchangeUIDSignature', {
      UID: 'user_with_another_valid_email_domain',
      UIDSignature:'UIDSignature_random',
      signatureTimestamp:'signatureTimestamp_random'
    })
    .resolves({ body: {UID: 'user_with_another_valid_email_domain'}});
    
    // getAccountInfo
    Gigya.callApi.withArgs('/accounts.getAccountInfo', {
      UID: 'user_with_another_valid_email_domain'
    })
    .resolves({ body: {
      UID: 'user_with_another_valid_email_domain',
      profile: { email: 'user_with_another_valid_email_domain@anothervaliddomain.nl'}}
    });
    

    // exchangeUIDSignature
    Gigya.callApi.withArgs('/accounts.exchangeUIDSignature', {
      UID: 'user_with_invalid_email_domain',
      UIDSignature:'UIDSignature_random',
      signatureTimestamp:'signatureTimestamp_random'
    })
    .resolves({ body: {UID: 'user_with_invalid_email_domain'}});

    // getAccountInfo
    Gigya.callApi.withArgs('/accounts.getAccountInfo', {
      UID: 'user_with_invalid_email_domain'
    })
    .resolves({ body: {
      UID: 'user_with_invalid_email_domain',
      profile: { email: 'user_with_invalid_email_domain@invaliddomain.nl'}}
    });

    done();
  });

  after(done => {
    Gigya.callApi.reset();
    done();
  });

  it('get rsvp for a gigya user with a valid domain', done => {
    let payload = {
      provider: 'gigya',
      UID: 'user_with_valid_email_domain',
      email: 'user_with_valid_email_domain@validdomain.nl',
      UIDSignature: 'UIDSignature_random',
      signatureTimestamp: 'signatureTimestamp_random',
      app: 'app_with_email_masks'
    };

    Bpc.request({ method: 'POST', url: '/rsvp', payload: payload})
    .then(response => {
      expect(response.statusCode).to.be.equal(200);
      expect(response.result.rsvp).to.have.length(356);
      done();
    })
    .catch(done);
  });


  it('get rsvp for a gigya user with another valid domain', done => {
    let payload = {
      provider: 'gigya',
      UID: 'user_with_another_valid_email_domain',
      email: 'user_with_another_valid_email_domain@anothervaliddomain.nl',
      UIDSignature: 'UIDSignature_random',
      signatureTimestamp: 'signatureTimestamp_random',
      app: 'app_with_email_masks'
    };

    Bpc.request({ method: 'POST', url: '/rsvp', payload: payload})
    .then(response => {
      expect(response.statusCode).to.be.equal(200);
      expect(response.result.rsvp).to.have.length(356);
      done();
    })
    .catch(done);
  });


  it('get rsvp error for a gigya user with an invalid domain', done => {
    let payload = {
      provider: 'gigya',
      UID: 'user_with_invalid_email_domain',
      email: 'user_with_invalid_email_domain@invaliddomain.nl',
      UIDSignature: 'UIDSignature_random',
      signatureTimestamp: 'signatureTimestamp_random',
      app: 'app_with_email_masks'
    };

    Bpc.request({ method: 'POST', url: '/rsvp', payload: payload})
    .then(response => {
      expect(response.statusCode).to.be.equal(403);
      done();
    })
    .catch(done);
  });
});