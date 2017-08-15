/* jshint node: true */
'use strict';


// Bootstrap the testing harness.
const Code = require('code');   // assertion library
const Lab = require('lab');
const lab = exports.lab = Lab.script();
const Oz = require('oz');
const rewire = require('rewire');
const sinon = require('sinon');
const bpc_helper = require('./helpers/bpc_helper');
const MongoDB = require('./mocks/mongodb_mock');
const Gigya = require('./mocks/gigya_mock');

// Test shortcuts.
const describe = lab.describe;
const it = lab.it;
const expect = Code.expect;
const before = lab.before;
const after = lab.after;



// Rewire rsvp.js in order to test internal functions.
const Rsvp = rewire('./../server/rsvp/rsvp');
const grantIsExpired = Rsvp.__get__('grantIsExpired');
const createNewCleanGrant = Rsvp.__get__('createNewCleanGrant');
const createUserRsvp = Rsvp.create;


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



  describe('createNewCleanGrant()', () => {

    it('contains a 40-char id', done => {

      const result = createNewCleanGrant();

      expect(result).to.be.an.object();
      expect(result).to.contain('id');
      expect(result.id).to.have.length(40);

      done();
    });

  });



  describe('createUserRsvp()', () => {

    before(done => {
      MongoDB.initate().then(done);
    });


    it('throws an error for unsupported provider', done => {

      createUserRsvp({provider: 'Illegal'}, (err, res) => {
        expect(err).to.be.an.error();
        done();
      });

    });

    it('throws an error for mismatched emails (Gigya)', done => {

      // Stub out getAccountInfo() so we don't interact with Gigya.
      const getAccountInfoStub = sinon.stub();
      getAccountInfoStub.returns(
        Promise.resolve({body: {profile: {email: 'different@email.com'}}})
      );
      Rsvp.__set__('Gigya.callApi', getAccountInfoStub);

      createUserRsvp({
        provider: 'gigya',
        UID: 123,
        email: 'incorrect@domain.com'
      }, (err, res) => {

        expect(err).to.be.an.error();
        done();

      });

    });


    it('throws an error for mismatched emails (Google)', done => {

      // Stub out tokeninfo() so we don't interact with Google.
      const tokeninfoStub = sinon.stub();
      tokeninfoStub.callsArgWith(1, null, {email: 'different@email.com'});
      Rsvp.__set__('Google.tokeninfo', tokeninfoStub);

      createUserRsvp({
        provider: 'google',
        UID: 123,
        email: 'incorrect@domain.com'
      }, (err, res) => {

        expect(err).to.be.an.error();
        done();

      });

    });

    it('fails for invalid app id (Gigya)', done => {

      // Stub out getAccountInfo() so we don't interact with Gigya.
      const getAccountInfoStub = sinon.stub();
      getAccountInfoStub.returns(
        Promise.resolve({body: {profile: {email: 'some@email.com'}}})
      );
      Rsvp.__set__('Gigya.callApi', getAccountInfoStub);

      createUserRsvp({
        provider: 'gigya',
        UID: 123,
        email: 'some@email.com',
        app: 'invalid-app'
      }, (err, res) => {

        expect(err).to.be.an.error('Unknown application');
        done();

      });

    });

    it('returns a grant for a valid app id (Gigya)', done => {

      // Stub out getAccountInfo() so we don't interact with Gigya.
      const getAccountInfoStub = sinon.stub();
      getAccountInfoStub.returns(
        Promise.resolve({body: {profile: {email: 'some@email.com'}}})
      );
      Rsvp.__set__('Gigya.callApi', getAccountInfoStub);

      createUserRsvp({
        provider: 'gigya',
        UID: '117880216634946654515',
        email: 'some@email.com',
        app: 'valid-app'
      }, (err, res) => {

        expect(err).to.be.null();
        expect(res).to.be.a.string();
        expect(res).to.have.length(334);
        done();

      });

    });

  });


  it('created a new clean grant when disallowAutoCreationGrants is not set', done => {

    const getAccountInfoStub = sinon.stub();
    getAccountInfoStub.returns(
      Promise.resolve({body: {profile: {email: 'userwithnopreviousgrant@email.com'}}})
    );
    Rsvp.__set__('Gigya.callApi', getAccountInfoStub);

    createUserRsvp({
      provider: 'gigya',
      UID: 'userwithnopreviousgrant',
      email: 'userwithnopreviousgrant@email.com',
      app: 'valid-app'
    }, (err, res) => {
      expect(err).to.be.null();
      expect(res).to.be.a.string();
      expect(res).to.have.length(334);

      // Wating a second to make sure the grant is saved to MongoDB
      setTimeout(
        () => {
          MongoDB.collection('grants').findOne({user:'userwithnopreviousgrant', app: 'valid-app'}, (err, grant) => {
            expect(grant).to.not.be.null();
            expect(grant.id).to.have.length(40);
            done();
          });
        },
        1000
      );

    });
  });


  it('does not create a new clean grant because of disallowAutoCreationGrants is set', done => {
    // TODO

    done();
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

  it('get rsvp for a gigya user', done => {

    let payload = {
      provider: 'gigya',
      UID: 'doensnotexists',
      email: 'doensnotexists@test.nl',
      app: 'valid-app',
      UIDSignature: 'ignored_in_this_test',
      signatureTimestamp: 'ignored_in_this_test'
    };

    bpc_helper.request({ method: 'POST', url: '/rsvp', payload: payload}, null, (response) => {
      expect(response.statusCode).to.be.equal(200);
      expect(response.payload).to.have.length(334);
      done();
    });

  });

});
