/* jshint node: true */
'use strict';

const Boom = require('boom');
const Joi = require('joi');
const Oz = require('oz');
const Hawk = require('hawk');
const OzLoadFuncs = require('./../oz_loadfuncs');
const MongoDB = require('./../mongo/mongodb_client');

module.exports.register = function (server, options, next) {

  server.route({
    method: 'GET',
    path: '/',
    config: {
      auth: {
        access: {
          entity: 'any'
        }
      }
    },
    handler: function(request, reply) {

      OzLoadFuncs.parseAuthorizationHeader(request.headers.authorization, function(err, ticket){
        console.log('parseAuthorizationHeader', err, ticket);

        const duration = 60 * 5;      // 5 Minutes
        // const bewit = Hawk.uri.getBewit('http://example.com:8000/resource/1?b=1&a=2', { credentials: ticket, ttlSec: duration, ext: 'some-app-data' });
        // const uri = 'http://example.com:8000/resource/1?b=1&a=2' + '&bewit=' + bewit;
        const bewit = Hawk.uri.getBewit(request.info.host.concat(request.path, '/validate'), { credentials: ticket, ttlSec: duration, ext: 'some-app-data' });

        console.log('||||| DOUING bewit', request.info.host.concat(request.path, '/validate'));

        reply({ bewit: bewit })
          .header('X-BPC-BEWIT', bewit);
      });
    }
  });

  server.route({
    method: 'GET',
    path: '/validate',
    config: {
      auth: {
        access: {
          entity: 'any'
        }
      }
    },
    handler: function(request, reply) {

      console.log('___2__', request.url);

      // This is a work-around for:
      //    TypeError: Uncaught error: Cannot read property 'url' of undefined
      //    at Object.exports.authenticateBewit [as authenticate] (/mnt/c/Users/munke/Code/bpc/node_modules/hawk/lib/server.js:338:44)
      //
      // The code is:
      //    request.url.match(internals.bewitRegex)
      request.method = 'GET';
      request.url = request.url.path;
      request.headers.authorization = null;

      Hawk.uri.authenticate(request, credentialsFunc, {}, (err, credentials, attributes) => {
        console.log('authenticate', err, credentials, attributes);
      });

      reply();
    }
  });

  server.route({
    method: 'POST',
    path: '/',
    config: {
      auth: {
        access: {
          entity: 'app'
        }
      }
    },
    handler: function(request, reply) {
      console.log('headers', request.headers);
      console.log('payload', request.payload);

      var attributes = Hawk.utils.parseAuthorizationHeader(request.headers.authorization);
      console.log('attributes', attributes);

      OzLoadFuncs.parseAuthorizationHeader(request.headers.authorization, function(err, ticket){
        console.log('parseAuthorizationHeader', err, ticket);

        if (ticket.app === request.payload.app){

        }

        // var s = {
        //   headers: {
        //     authorization: {
        //
        //     }
        //   }
        // };
        //
        // credentialsFunc('test_sso_app', function(err, credentials){
        //   const mac = Hawk.crypto.calculateMac('header', credentials, request.payload);
        //   console.log('mac', mac);
        // });
        //
        //
        // // Hawk.server.authenticate(s, credentialsFunc, {}, (err, credentials, artifacts) => {
        // Hawk.server.authenticate(request.payload, credentialsFunc, {}, (err, credentials, artifacts) => {
        //   console.log('authenticate', err, credentials, artifacts);
        // });
        // if (err) {
        //   return reply(err)
        // }
        //
        // reply();
      });

      reply();
    }
  });

  next();
};


module.exports.register.attributes = {
  name: 'auth',
  version: '1.0.0'
};


const credentialsFunc = function (id, callback) {
  console.log('credentialsFunc', id);

  Oz.ticket.parse(id, process.env.ENCRYPTIONPASSWORD, {}, function(err, rr){
    console.log('***parsed', err, rr);


    // rr = {
            //   {
            //    exp: 1490100884438,
            //    app: 'test_sso_app',
            //    scope: [ 'berlingske', 'mdb', 'kundeunivers', 'gigya' ],
            //    grant: 'e1f25c54d48f2fd9825f8b85cd512d989b64ce13',
            //    user: '_guid_dVlIynSm5Mk913pi57uG3j0l7hGnSb7hMy4GlTGJXFU=',
            //    key: 'XPevEY1BZYrDFy0-TnPmrvPCgRR913jG',
            //    algorithm: 'sha256',
            //    ext:
            //    {
            //      public: {},
            //      private:
            //      {
            //        email: 'dako@berlingskemedia.dk',
            //        id: '_guid_dVlIynSm5Mk913pi57uG3j0l7hGnSb7hMy4GlTGJXFU=',
            //        Permissions: {}
            //      }
            //    },
            //    id: 'Fe26.2**9a19633a2342baaed5c087591cabf7e876c4f81df798438dbb3958ac83ebaf94*X-NO9BApmGIbQWVTVn9BwA*ff7tcu4iy6lnRzSLttRupZPTJtDDdIbNEXfiKbC3_uptiRM4YmOr4p7FQO1op9cmjF_Xi6-rpBgxAqxCjAmJXRFuY5sy_ND_IDnbrPD8pP0BAcrk2zUvNF0u7BBFmdVr0-QxNHq8wrCChn8P0Rsar5cRWI8yzLBm_P2NnW5_K_9EazRjtBuvLDqf4a-OjG7g_k_AXTXsddxI8D34gmnR3DLwMjspZBaimnuXRy4vMFg5AE4Jbi0E8lJIl9bq8ui8_j_QrMh7S7w_HBVWrt3JefhuHOvXX3yEAWbfSO1mpxfew6-N_IOTgaJYdNSmQCUn9Yk6EIfqualFMWtmFiIzPIZIdXxnNxdDmae6M3CzlkZzC5yJau0WFQ1ehDQixLL3OS4d0eqKG9M499JQNR7fEWsfFg-_iiGAQAZGaHBr3_FmzDyFqVj3kdISnLMyxpPZw8c3X9NEZYmEoZ5KmyR7zu1AhkOOPxwd1-RlShvXDWuaWGzTR6L1TIVVmYg9B8CocL_EXBPhELwGArOewTmRzt9TH84zvPpk86PQhMGEk6Y**8eca743116a587108dd6dde47b91b42b60bb438d0d19587a05ee4f50302f077b*ntDTrLdpX-XxVIaPaR7sgnniXJAFeLj0VDLG3WJE1RE'
            //  }
            // }

  });

  // const credentials = {
  //   key: 'werxhqb98rpaxn39848xrunpaw3489ruxnpa98w4rxn',
  //   algorithm: 'sha256',
  //   user: 'Steve'
  // };

  const credentials = {
    key: 'hkj23h4kjh423kjhfsdkklj3983jkldl',
    algorithm: 'sha256'
    // app: 'test_sso_app'
  };

  return callback(null, credentials);
};
