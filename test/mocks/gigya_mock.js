'use strict';

const sinon = require('sinon');
const test_data = require('../data/test_data');

console.log('Using Gigya MOCK');

let callApiStub = sinon.stub();
module.exports.callApi = callApiStub;


module.exports.reset = function () {

  Object.keys(test_data.users)
  .map(key => {
    return test_data.users[key];
  })
  .map(user => {
    return {
      body: {
        UID: user.id,
        profile: {
          email: user.email
        }
      }
    };
  })
  .forEach(accountInfo => {
    callApiStub.withArgs('/accounts.getAccountInfo', { UID: accountInfo.body.UID })
    .resolves(accountInfo);
  });
}

module.exports.reset();
