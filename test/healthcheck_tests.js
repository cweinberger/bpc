/* jshint node: true */
'use strict';

// Bootstrap the testing harness.
const Code = require('code');   // assertion library
const expect = Code.expect;

const Lab = require('lab');
const lab = exports.lab = Lab.script();

const describe = lab.describe;
const before = lab.before;
const it = lab.it;
const after = lab.after;

const bpc = require('./../server');

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
