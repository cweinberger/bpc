/* jshint node: true */
'use strict';


const Code = require('code');   // assertion library
const Lab = require('lab');
const lab = exports.lab = Lab.script();
const Oz = require('oz');
const rewire = require('rewire');
const sinon = require('sinon');
const MongoDB = require('./../server/mongo/mongodb_client');

// Test shortcuts.
const describe = lab.describe;
const it = lab.it;
const expect = Code.expect;
const before = lab.before;
const after = lab.after;

// Rewire rsvp.js in order to test internal functions.
const Rsvp = rewire('./../server/auth/rsvp');
const grantIsExpired = Rsvp.__get__('grantIsExpired');
const createNewCleanGrant = Rsvp.__get__('createNewCleanGrant');
const createUserRsvp = Rsvp.__get__('createUserRsvp');

// TODO: I know these tests do NOT test the actual code. These are just examples.
describe('rsvp', () => {

  describe('grant', () => {

    it('is not expired when grant is undefined', done => {
      
      var result = grantIsExpired();
      
      expect(result).to.be.false();
      
      done();
    });

    it('is not expired when grant is null', done => {
      
      var result = grantIsExpired(null);
      
      expect(result).to.be.false();
      
      done();
    });

    it('is not expired when grant.exp is undefined', done => {
      
      var result = grantIsExpired({});
      
      expect(result).to.be.false();
      
      done();
    });

    it('is not expired when grant.exp is null', done => {
      
      var result = grantIsExpired({ exp: null });
      
      expect(result).to.be.false();
      
      done();
    });

    it('is not expired when grant.exp is now() + 20000', done => {
      
      var result = grantIsExpired({ exp: Oz.hawk.utils.now() + 20000 });
      
      expect(result).to.be.false();
      
      done();
    });

    it('expired when grant.exp is now() - 20000', done => {
      
      var result = grantIsExpired({ exp: Oz.hawk.utils.now() - 20000 });
      
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
      // Give the test cases an app to use.
      MongoDB.collection('applications').insert({
        id: 'valid-app',
        scope: [
          'admin',
          'admin:*',
          'admin:gdfgfd',
          'admin:uyutyutu'
        ],
        delegate: false,
        key: 'something_long_and_random',
        algorithm: 'sha256'
      });
      // Give the test cases a grant to use.
      MongoDB.collection('grants').insert({
        id: 'jhfgs294723ijsdhfsdfhskjh329423798wsdyre',
        app: 'valid-app',
        user: 'eu-west-1:dd8890ba-fe77-4ba6-8c9d-5ee0efeed605',
        scope: []
      });
      // Give the test cases a user to use.
      MongoDB.collection('users').insert({
        email: 'mkoc@berlingskemedia.dk',
        id: '117880216634946654515',
        provider: 'gigya',
        LastLogin: new Date(),
        dataScopes: {},
        providerData: {}
      });
      done();
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
      Rsvp.__set__('GigyaAccounts.getAccountInfo', getAccountInfoStub);

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
      Rsvp.__set__('GigyaAccounts.getAccountInfo', getAccountInfoStub);

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
      Rsvp.__set__('GigyaAccounts.getAccountInfo', getAccountInfoStub);

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
