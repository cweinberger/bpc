/* jshint node: true */
'use strict';


// Bootstrap the testing harness.
const Code = require('code');   // assertion library
const Lab = require('lab');
const lab = exports.lab = Lab.script();
const Oz = require('oz');
const rewire = require('rewire');
const sinon = require('sinon');
const MongoDB = require('./mocks/mongodb_mock');
const bpc = require('./../server');

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

});
