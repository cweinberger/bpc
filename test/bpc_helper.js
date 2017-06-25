const MongoDB = require('./../server/mongo/mongodb_mocked');
const Hawk = require('hawk');
const bpc = require('./../server');


module.exports.request = function (options, ticket, callback) {

  const hawkHeader = Hawk.client.header('http://test.com'.concat(options.url), options.method, ticket);
  if (!hawkHeader.field){
    callback(hawkHeader);
  }

  const req = {
    method: options.method,
    url: options.url,
    headers: {
      host: 'test.com',
      authorization: hawkHeader.field
    }
  };

  bpc.inject(req, callback);
};


module.exports.apps = {
  bt: {
    id: 'bt',
    scope: ['bt'],
    key: 'werxhqb98rpaxn39848xrunpaw3489ruxnpa98w4rxn',
    algorithm: 'sha256'
  },
  berlingske: {
    id: 'berlingske',
    scope: ['berlingske'],
    key: 'witf745itwn7ey4otnw7eyi4t7syeir7bytise7rbyi',
    algorithm: 'sha256'
  }
};

module.exports.users = {
  simple_first_user: {
    email: 'user@berlingskemedia.dk',
    id: '3218736128736123215732',
    provider: 'gigya',
    lastLogin: new Date(),
    dataScopes: {
      'bt': {
        bt_paywall: true,
        bt_subscription_tier: 'free'
      },
      'berlingske': {
        berlingske_paywall: true,
        berlingske_subscription_tier: 'premium'
      }
    },
    providerData: {}
  }
};


module.exports.initate = function (done) {
  // Need to wait a sec for the database/mongo-mock to start up...
  setTimeout(function() {
    clearMongoMock(function(){
      fillMongoMock(function(){
        bpc.start(function(){
          done();
        });
      });
    });
  }, 1000);
};


function clearMongoMock (done){
  Promise.all([
    MongoDB.collection('applications').remove({}),
    MongoDB.collection('grants').remove({}),
    MongoDB.collection('users').remove({})
  ]).then(res => {
    done();
  });
}


function fillMongoMock (done){
  Promise.all([
    // Give the test cases a user to use.
    MongoDB.collection('applications').insert(objectToArray(module.exports.apps)),
    MongoDB.collection('users').insert(objectToArray(module.exports.users)),
  ]).then(res => {
    done();
  });

  function objectToArray(input){
    return Object.keys(input).map(function(key){
      return input[key];
    });
  }
}
