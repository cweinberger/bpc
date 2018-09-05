/* jshint node: true */
'use strict';

const test = {
  PORT: null,
  BPC_PUB_HOST: null,
  BPC_PUB_PORT: null,
  DISABLE_LOG: true,
  GIGYA_APP_KEY: null,
  GIGYA_USER_KEY: null,
  GIGYA_SECRET_KEY: 'random_test_password_that_is_longer_than_32_characters',
  GOOGLE_API_KEY: null,
  MONGODB_CONNECTION: process.env.MONGODB_CONNECTION_TESTING,
  ENCRYPTIONPASSWORD: 'random_test_password_that_is_longer_than_32_characters',
  HOLIDAYS_DATES: [
    new Date('2018-01-01'),
    new Date('2018-03-29'),
    new Date('2018-03-30'),
    new Date('2018-04-01'),
    new Date('2018-04-02'),
    new Date('2018-04-27'),
    new Date('2018-05-10'),
    new Date('2018-05-20'),
    new Date('2018-05-21'),
    new Date('2018-06-05'),
    new Date('2018-12-25'),
    new Date('2018-12-26'),
  ]
};

const env = {
  PORT: process.env.PORT ? process.env.PORT : 8000,
  BPC_PUB_HOST: process.env.BPC_PUB_HOST,
  BPC_PUB_PORT: process.env.BPC_PUB_PORT,
  DISABLE_LOG: ['yes', 'true', '1'].includes(process.env.DISABLE_LOG) || false,
  GIGYA_APP_KEY: process.env.GIGYA_APP_KEY || '',
  GIGYA_USER_KEY: process.env.GIGYA_USER_KEY || '',
  GIGYA_SECRET_KEY: process.env.GIGYA_SECRET_KEY || '',
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
  MONGODB_CONNECTION: process.env.MONGODB_CONNECTION,
  ENCRYPTIONPASSWORD: process.env.ENCRYPTIONPASSWORD,
  HOLIDAYS_DATES: [
    new Date('2018-01-01'),
    new Date('2018-03-29'),
    new Date('2018-03-30'),
    new Date('2018-04-01'),
    new Date('2018-04-02'),
    new Date('2018-04-27'),
    new Date('2018-05-10'),
    new Date('2018-05-20'),
    new Date('2018-05-21'),
    new Date('2018-06-05'),
    new Date('2018-12-25'),
    new Date('2018-12-26'),
  ]
};

module.exports = process.env.NODE_ENV === 'test' ? test : env;