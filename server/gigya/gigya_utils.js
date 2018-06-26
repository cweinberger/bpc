/* jshint node: true */
'use strict';

const Crypto = require('crypto');
const Config = require('./../config');

const GIGYA_SECRET_KEY = Config.GIGYA_SECRET_KEY;

const secretBuffer = new Buffer(GIGYA_SECRET_KEY, 'base64');
const algorithm = 'sha1'; // sha256

module.exports.validNotificationRequest = function (request) {
  const _message = new Buffer.from(JSON.stringify(request.payload));
  const hmac = Crypto.createHmac(algorithm, secretBuffer).update(_message);
  const digest = hmac.digest('base64');
  const signature = request.headers['x-gigya-sig-hmac-sha1'];
  return digest === signature;
}
