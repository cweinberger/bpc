/* jshint node: true */
'use strict';

const Boom = require('boom');
const Joi = require('joi');
const Oz = require('oz');
const Hawk = require('hawk');
const url = require('url');
const OzLoadFuncs = require('./../oz_loadfuncs');
const MongoDB = require('./../mongo/mongodb_client');

module.exports.register = function (server, options, next) {

  server.route({
    method: 'POST',
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
        if (err){
          reply(err);
        }

        // The bewit can be restricted to a specific app, a specific user or both.
        // The app and/or will be validated based on the ticket used to authorize the POST /validate request.
        var ext = '';
        if (request.payload.app || request.payload.user) {
          ext = ''.concat(request.payload.app || '', ':', request.payload.user || '');
        }


        const duration = 60 * 5;      // 5 Minutes
        const bewit = Hawk.uri.getBewit(request.payload.url, { credentials: ticket, ttlSec: duration, ext: ext });

        // Calculate the exp so the client can request a new bewit before this one expires.
        const exp = Hawk.utils.now() + (duration * 1000);

        reply({ bewit: bewit, exp: exp })
          .header('X-BPC-BEWIT', bewit)
          .header('X-BPC-BEWIT-EXP', exp);
      });
    }
  });


  server.route({
    method: 'POST',
    path: '/validate',
    config: {
      auth: {
        access: {
          entity: 'any'
        }
      }
    },
    handler: function(request, reply) {

      var url_to_validate = url.parse(request.payload.url);
      var uri_to_authenticate = {
        method: 'GET',
        url: url_to_validate.path,
        headers: {
          host: url_to_validate.host,
          authorization: null
        }
      };

      Hawk.uri.authenticate(uri_to_authenticate, credentialsFunc, {}, (err, credentials, attributes) => {
        if (err) {

          reply().statusCode = 401;

        } else if (attributes.ext) {

          // In case the bewit has been restricted to a specific app and/or user, this will be validated now:
          var tmp = attributes.ext.split(':');
          var app = tmp[0];
          var user = tmp[1];
          OzLoadFuncs.parseAuthorizationHeader(request.headers.authorization, function(err, ticket){
            if(err) {
              reply().statusCode = 401;
            } else if (user && ticket.user !== user) {
              reply().statusCode = 401;
            } else if (app && ticket.app !== app) {
              reply().statusCode = 401;
            } else {
              reply().statusCode = 200;
            }
          });

        } else {

          reply().statusCode = 200;

        }
      });
    }
  });

  next();
};


module.exports.register.attributes = {
  name: 'bewit',
  version: '1.0.0'
};


const credentialsFunc = function (id, callback) {
  Oz.ticket.parse(id, process.env.ENCRYPTIONPASSWORD, {}, callback);
};
