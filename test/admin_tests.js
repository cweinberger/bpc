
const Joi = require('joi');
const Applications = require('./../server/applications/applications');

// Test shortcuts.
const { expect, describe, it, before, after } = exports.lab = require('lab').script();


// I know these tests do NOT test the actual code.These are just examples.
describe('the scope containing', () => {

  it('only admin not allowed', (done) => {
    const result = Joi.validate(['admin'], Applications.scopeValidation);
    expect(result.error).to.exist();
    done();
  });

  it('only admin: not allowed', (done) => {
    const result = Joi.validate(['admin:'], Applications.scopeValidation);
    expect(result.error).to.exist();
    done();
  });

  it('only sadmin allowed', (done) => {
    const result = Joi.validate(['sadmin'], Applications.scopeValidation);
    expect(result.error).to.not.exist();
    done();
  });

  it('only sdmin allowed', (done) => {
    const result = Joi.validate(['sdmin'], Applications.scopeValidation);
    expect(result.error).to.not.exist();
    done();
  });

  it('only a allowed', (done) => {
    const result = Joi.validate(['a'], Applications.scopeValidation);
    expect(result.error).to.not.exist();
    done();
  });

  it('both a and b allowed', (done) => {
    const result = Joi.validate(['a', 'b'], Applications.scopeValidation);
    expect(result.error).to.not.exist();
    done();
  });

  it('both admin and b not allowed', (done) => {
    const result = Joi.validate(['admin', 'b'], Applications.scopeValidation);
    expect(result.error).to.exist();
    done();
  });

  it('both a and admin not allowed', (done) => {
    const result = Joi.validate(['a', 'admin'], Applications.scopeValidation);
    expect(result.error).to.exist();
    done();
  });

});
