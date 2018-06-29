/*jshint node: true */
'use strict';


const Joi = require('joi');
const Admins = require('./admins');


module.exports.register = function (server, options, next) {


  const stdCors = {
    credentials: true,
    origin: ['*'],
    headers: ['Accept', 'Authorization', 'Content-Type', 'If-None-Match'],
    exposedHeaders: ['WWW-Authenticate', 'Server-Authorization'],
    maxAge: 86400
  };


  server.route({
    method: 'POST',
    path: '/superadmin/{id}',
    config: {
      auth:  {
        access: {
          scope: ['+admin:*'],
          entity: 'user' // Only superadmin users are allows to promote other superadmins
        }
      },
      cors: stdCors
    },
    handler: Admins.postSuperadmin
  });


  server.route({
    method: 'DELETE',
    path: '/superadmin/{id}',
    config: {
      auth:  {
        access: {
          scope: ['+admin:*'],
          entity: 'user' // Only superadmin users are allows to demote other superadmins
        }
      },
      cors: stdCors
    },
    handler: Admins.deleteSuperadmin
  });

  
  server.route({
    method: 'GET',
    path: '/{id}',
    config: {
      auth: {
        access: {
          scope: ['admin:{params.id}', 'admin:*'],
          entity: 'user'
        }
      },
      cors: stdCors
    },
    handler: Admins.getApplicationAdmins
  });


  server.route({
    method: 'POST',
    path: '/{id}/admin',
    config: {
      auth: {
        access: {
          scope: ['admin:{params.id}', 'admin:*'],
          entity: 'user'
        }
      },
      cors: stdCors,
      validate: {
        payload: adminPayloadValidation
      }
    },
    handler: Admins.postApplicationAdmin
  });


  server.route({
    method: 'DELETE',
    path: '/{id}/admin',
    config: {
      auth: {
        access: {
          scope: ['admin:{params.id}', 'admin:*'],
          entity: 'user'
        }
      },
      cors: stdCors,
      validate: {
        payload: adminPayloadValidation
      }
    },
    handler: Admins.deleteApplicationAdmin
  });


  next();

};


module.exports.register.attributes = {
  name: 'admins',
  version: '1.0.0'
};


const adminPayloadValidation = Joi.object().keys({
  _id: Joi.strip(),
  id: Joi.strip(),
  app: Joi.strip(),
  user: Joi.string().required(),
  exp: Joi.strip(),
  scope: Joi.strip()
}).unknown(true); // Allow and strip unknows parameters