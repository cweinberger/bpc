'use strict';

const sinon = require('sinon');
const test_data = require('../data/test_data');

console.log('Using Gigya MOCK');


let callApiStub = sinon.stub();
module.exports.callApi = callApiStub;

Object.keys(test_data.users)
.map(key => {
  return test_data.users[key];
})
.forEach(user => {
  addWithArgsReturns({id: user.id, email: user.email});
});

function addWithArgsReturns({id, email}){
  let returns = {
    body: {
      UID: id,
      profile: {
        email:email
      }
    }
  };

  callApiStub.withArgs('/accounts.getAccountInfo', { UID: id })
  .returns(Promise.resolve(returns));
}

module.exports.addWithArgsReturns = addWithArgsReturns;
