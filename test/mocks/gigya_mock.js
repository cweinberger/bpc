'use strict';

const sinon = require('sinon');
const test_data = require('../data/test_data');

console.log('Using Gigya MOCK');


let callApiStub = sinon.stub();
module.exports.callApi = callApiStub;

callApiStub.withArgs('/accounts.getAccountInfo', { UID: '3218736128736123215732' })
.returns(Promise.resolve({body:'WOWOWOW'}));

callApiStub.withArgs('/accounts.getAccountInfo', { UID: '5347895384975934842757' })
.returns(Promise.resolve({body:'WOWOWOW'}));


// module.exports.callApi = function(path, payload = null, api = 'accounts') {
//   return Promise.resolve({{id: 'TST'}});
// };
