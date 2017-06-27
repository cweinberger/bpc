const MongoDB = require('./../server/mongo/mongodb_mocked');
const Hawk = require('hawk');
const Oz = require('oz');
const bpc = require('./../server');
const crypto = require('crypto');


module.exports.apps = apps = {
  console: {
    id: 'console',
    scope: ['admin', 'admin:*', 'admin:console'],
    key: 'j4h2kj4h32lkh432lkh4dk32ljh4lk32djh4lkj32h4',
    algorithm: 'sha256'
  },
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

module.exports.users = users = {
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
  },
  console_superadmin_google_user: {
    email: 'console_admin@berlingskemedia.dk',
    id: '1111111111111111111111',
    provider: 'google',
    lastLogin: new Date(),
    dataScopes: {},
    providerData: {}
  },
  console_google_user: {
    email: 'console_user@berlingskemedia.dk',
    id: '2222222222222222222222',
    provider: 'google',
    lastLogin: new Date(),
    dataScopes: {},
    providerData: {}
  }
};


module.exports.grants = grants = {
  console_superadmin_google_user__console_grant : {
    id : '7462ydu3jjj3u32uej3mmsi3',
    app : apps.console.id,
    user : users.console_superadmin_google_user.id,
    scope : ['admin:*'],
    exp : null,
    createdAt: new Date()
  },
  console_google_user__console_grant : {
    id : '7362ydu3kkk3u65uej3mmsi4',
    app : apps.console.id,
    user : users.console_google_user.id,
    scope : [],
    exp : null,
    createdAt: new Date()
  }
};


module.exports.request = function (options, ticket, callback) {

  const req = {
    method: options.method,
    url: options.url,
    payload: options.payload,
    headers: {
      host: 'test.com'
    }
  };

  if (ticket !== undefined && ticket !== null && ticket !== {}) {
    const hawkHeader = Hawk.client.header('http://'.concat(req.headers.host, options.url), options.method, ticket);
    if (!hawkHeader.field){
      callback(hawkHeader);
    }

    req.headers.authorization = hawkHeader.field;
  }

  bpc.inject(req, callback);
};


module.exports.generateRsvp = function(app, grant, callback) {
  Oz.ticket.rsvp(app, grant, process.env.ENCRYPTIONPASSWORD, {}, callback);
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
    MongoDB.collection('applications').insert(objectToArray(apps)),
    MongoDB.collection('users').insert(objectToArray(users)),
    MongoDB.collection('grants').insert(objectToArray(grants)),
  ]).then(res => {
    done();
  });

  function objectToArray(input){
    return Object.keys(input).map(function(key){
      return input[key];
    });
  }
}


function random40Character() {
  return crypto.randomBytes(20).toString('hex'); // (gives 40 characters)
}
