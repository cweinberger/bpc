const MongoDB = require('./../server/mongo/mongodb_mocked');
const Hawk = require('hawk');
const Oz = require('oz');
const bpc = require('./../server');
const crypto = require('crypto');
const test_data = require('./test_data');



module.exports.request = function (options, ticket, callback) {

  const req = {
    method: options.method,
    url: options.url,
    payload: options.payload,
    headers: Object.assign(options.headers || {},
      {
        host: 'testing.com'
      }
    )
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
  var k = Object.keys(test_data).map(function(collectionKey){
    return MongoDB.collection(collectionKey).remove({});
  });

  Promise.all(k).then(res => {
    done();
  });
}


function fillMongoMock (done){

  var k = Object.keys(test_data).map(function(collectionKey){
    return MongoDB.collection(collectionKey).insert(objectToArray(test_data[collectionKey]))
  });

  Promise.all(k).then(res => {
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
