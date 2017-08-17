'use strict';

const Crypto = require('crypto');


module.exports.generateGigyaSigHmax = function (request){
  const GIGYA_SECRET_KEY = 'random_test_password_that_is_longer_than_32_characters';
  const secretBuffer = new Buffer(GIGYA_SECRET_KEY, 'base64');
  const algorithm = 'sha1'; // sha256
  const _message = new Buffer.from(JSON.stringify(request.payload));
  const hmac = Crypto.createHmac(algorithm, secretBuffer).update(_message);
  return hmac.digest('base64');
}
