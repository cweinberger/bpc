/* jshint node: true */
'use strict';

const bpc = require('./../server');

// Test shortcuts.
const { describe, it, before, after } = exports.lab = require('lab').script();
// Assertion library
const { expect } = require('code');


describe('healthcheck', () => {

  before(done => {
    bpc.start(function(){
      done();
    });
  });


  it('returns 200 OK', done => {
    bpc.inject({
      method: 'GET',
      url: '/healthcheck'
    }, (response) => {
      expect(response.statusCode).to.equal(200);
      done();
    });
  });
});
