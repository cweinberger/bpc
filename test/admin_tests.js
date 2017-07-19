const Code = require('code');   // assertion library
const expect = Code.expect;
const Lab = require('lab');
const lab = exports.lab = Lab.script();



// I know these tests do NOT test the actual code.These are just examples.
lab.experiment('the scope containing', () => {

  const Joi = require('joi');
  const scopeValidation = Joi.array().items(Joi.string().regex(/^(?!admin).*$/, { name: 'admin', invert: true }));

  lab.test('only admin not allowed', (done) => {
    Joi.validate(['admin'], scopeValidation, validate_test_expect_err_to_exist_callback(done));
  });

  lab.test('only admin: not allowed', (done) => {
    Joi.validate(['admin:'], scopeValidation, validate_test_expect_err_to_exist_callback(done));
  });

  lab.test('only sadmin allowed', (done) => {
    Joi.validate(['sadmin'], scopeValidation, validate_test_expect_err_to_not_exist_callback(done));
  });

  lab.test('only sdmin allowed', (done) => {
    Joi.validate(['sdmin'], scopeValidation, validate_test_expect_err_to_not_exist_callback(done));
  });

  lab.test('only a allowed', (done) => {
    Joi.validate(['a'], scopeValidation, validate_test_expect_err_to_not_exist_callback(done));
  });

  lab.test('both a and b allowed', (done) => {
    Joi.validate(['a', 'b'], scopeValidation, validate_test_expect_err_to_not_exist_callback(done));
  });

  lab.test('both admin and b not allowed', (done) => {
    Joi.validate(['admin', 'b'], scopeValidation, validate_test_expect_err_to_exist_callback(done));
  });

  lab.test('both a and admin not allowed', (done) => {
    Joi.validate(['a', 'admin'], scopeValidation, validate_test_expect_err_to_exist_callback(done));
  });

});


function validate_test_expect_err_to_not_exist_callback(done){
  return function(err, result){
    expect(err).to.not.exist();
    done();
  };
}


function validate_test_expect_err_to_exist_callback(done){
  return function(err, result){
    expect(err).to.exist();
    done();
  };
}
