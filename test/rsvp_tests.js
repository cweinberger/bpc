const Code = require('code');   // assertion library
const expect = Code.expect;
const Lab = require('lab');
const lab = exports.lab = Lab.script();
const Oz = require('oz');



// TODO: I know these tests do NOT test the actual code. These are just examples.
lab.experiment('the grant is', () => {

  function grantIsExpired(grant){
    // var exp_conditions =  [{exp: { $exists: false }}, { exp: null },{ exp: {$lt: Oz.hawk.utils.now() }}];
    return grant !== undefined && grant !== null && grant.exp !== undefined && grant.exp !== null && grant.exp < Oz.hawk.utils.now();
  }

  lab.test('not expired when grant is undefined', (done) => {
    var result = grantIsExpired();
    expect(result).to.be.false();
    done();
  });

  lab.test('not expired when grant is null', (done) => {
    var result = grantIsExpired(null);
    expect(result).to.be.false();
    done();
  });

  lab.test('not expired when grant.exp is undefined', (done) => {
    var result = grantIsExpired({});
    expect(result).to.be.false();
    done();
  });

  lab.test('not expired when grant.exp is null', (done) => {
    var result = grantIsExpired({ exp: null });
    expect(result).to.be.false();
    done();
  });


  lab.test('not expired when grant.exp is now() + 20000', (done) => {
    var result = grantIsExpired({ exp: Oz.hawk.utils.now() + 20000 });
    expect(result).to.be.false();
    done();
  });

  lab.test('expired when grant.exp is now() - 20000', (done) => {
    var result = grantIsExpired({ exp: Oz.hawk.utils.now() - 20000 });
    expect(result).to.be.true();
    done();
  });

});
