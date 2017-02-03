/*jshint node: true */
'use strict';

const Boom = require('boom');
const Hawk = require('hawk');
const http = require('http');
const https = require('https');
const sso_client = require('./sso_client');

module.exports.register = function (server, options, next) {

  server.route({
    method: 'GET',
    path: '/',
    config: {
      cors: false,
      state: {
        parse: true,
        failAction: 'log'
      }
    },
    handler: function(request, reply) {
      reply({message: 'non-protected resource'});
    }
  });

  server.route({
    method: 'GET',
    path: '/protected',
    config: {
      state: {
        parse: true,
        failAction: 'log'
      }
    },
    handler: function(request, reply) {

      if(request.state.ticket === undefined || request.state.ticket === null){
        return reply(Boom.unauthorized());
      }

      if (request.state.ticket.exp < Hawk.utils.now()){
        return reply(Boom.forbidden('Ticket has expired'));
      }

      // Different examples on how to validate the userTicket
      // sso_client.validateUserTicket(request.state.ticket, ['read', 'write'], function (err, response){
      // sso_client.validateUserTicket(request.state.ticket, ['read'], function (err, response){
      // sso_client.validateUserTicket(request.state.ticket, 'read', function (err, response){
      // sso_client.validateUserTicket(request.state.ticket, [], function (err, response){
      // sso_client.validateUserTicket(request.state.ticket, 1, function (err, response){
      // sso_client.request('POST', '/cognito/validateuserpermissions', {permissions: 'admin'}, request.state.ticket, function (err, response){
      // sso_client.request('POST', '/cognito/validateuserpermissions', {permissions: ['read', 'admin'], all: true}, request.state.ticket, function (err, response){
      // sso_client.request('POST', '/validate/userpermissions', {permissions: ['read', 'admin']}, request.state.ticket, function (err, response){
      sso_client.getUserPermissions(request.state.ticket, 'berlingske', function (err, response){
        console.log('cc', err, response);
        if (err){
          // return reply(err);
          reply({message: 'public resource'});
        } else {
          reply({message: 'protected resource'});
        }
      });

      sso_client.setUserPermissions(request.state.ticket.user, 'berlingske', {subscriber: true }, function (err, response){
        console.log('setUserPermissions', err, response);
      });
    }
  });

  next();
};


module.exports.register.attributes = {
  name: 'resources',
  version: '1.0.0'
};
