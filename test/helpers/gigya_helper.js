'use strict';

const Crypto = require('crypto');
const Config = require('./../../server/config');


module.exports.generateGigyaSigHmax = function (request){
  const secretBuffer = new Buffer(Config.GIGYA_SECRET_KEY, 'base64');
  const algorithm = 'sha1'; // sha256
  const _message = new Buffer.from(JSON.stringify(request.payload));
  const hmac = Crypto.createHmac(algorithm, secretBuffer).update(_message);
  return hmac.digest('base64');
}


module.exports.setGigyaSigHmax = function (request){
  const x_gigya_sig_hmac_sha1 = module.exports.generateGigyaSigHmax(request);
  const newRequest = Object.assign(
    {},
    request,
    {
      headers: {
        'x-gigya-sig-hmac-sha1': x_gigya_sig_hmac_sha1
      }
    }
  );
  return newRequest;
}