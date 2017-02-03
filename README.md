# SSO Poc

# SSO (Single Sign On) and BPC (Berlingske Permission Central)

SSO is implementet using Gigya RaaS and Site Groups. Websites and app use Gigyas SDK to implement a login screen. Gigya has the options to have multiple screenSets depending on what device the user is on.

Gigya RaaS (Registration-as-a-Service) means Gigya is a cloud hosted platform. RaaS has the support for Social Logins as standard.

Gigya Site Groups enables one unified user account database in Gigya. This means the user only needs one account to access all Berlingske Media websites and apps.

Gigya does not directly support automatic login on all websites, when logged in one place. To do this, we mest build a central login-portal, and delegate sessions securely from there to all sites. This is not recommended, because this is not the way Gigya was designed.

After creating an account in Gigya or logging in to an existing, the user is identified and authenticated. Is this point, the user has no authorizations or permissions. The user is simply an identified guest.

This is were the BPC comes in. BPC is a permission-service to securely exchange user grants and permissions to the website or app. For an example, when a user logs into b.dk, the website uses BPC to learn if the user has an active subscription or the paid-article count is depleted.

BPC uses an open source solution, Oz, which is based on the OAuth 1.0 protocol. Oz provices access scopes, delegation, credential refresh, stateless server scalability, self-expiring credentials, secret rotation, and a really solid authentication foundation.

Normally OAuth (and Oz) is used in scenarios where an application is granted various permissions to user-owned resources on a server. Eg. a photo-print-service (the app) is granted access to user photos on Facebook (the server). The grant is reviewed and accepted by the user in a consent screen.

Oz is used a bit differently in BPC. The user does not review the grant and the user does not own the resource. In this case, the resource is the user permissions (eg. "b.dk paying subscriber") and the grant is used to grant the user access to the website or app.

After the user has logged in with Gigya, the website request user permission securely from BPC using encrypted tickets. BPC responds with permissions that are within that specific applications scope.

// TODO: '/permissions/{user}/{name}' must be access using a userTicket, which means the userTicket must have more scopes

## Application

Each website or app must be registered in BPC. These are called applications. By registering, the app is given an id and a secret. These must stored in the application itself.

Each application can be given one or more scopes. See more below.
Per default each application is given an admin-scope. This is used to promote specific users and an admin for that application in the BPC console.

## User

## Grant

## Scope

## RSVP

## Ticket

## BPC console


# Setup

## /etc/hosts

127.0.0.1       berlingske-poc.local
127.0.0.1       berlingske-poc-client.local
127.0.0.1       berlingske-poc-server.local
127.0.0.1       berlingske-poc-console.local

## MongoDB


db.applications.insert({
  id: 'test_sso_app',
  scope: [],
  delegate: false,
  key: 'hkj23h4kjh423kjhfsdkklj3983jkldl',
  algorithm: 'sha256'})

db.applications.insert({
  id: 'console',
  scope: ['admin'],
  delegate: false,
  key: 'kjfhsd783y24kjhdfs978623kjh367h2',
  algorithm: 'sha256'})

db.grants.insert({
  id:'f96a48fd0503832253548b34f3b65add16d54c2e',
  app: 'test_sso_app',
  user: 'eu-west-1:dd8890ba-fe77-4ba6-8c9d-5ee0efeed605',
  scope: []})

db.grants.insert({
  id:'739cd477fbfcd75980e3174ad912d899bd225af4',
  app: 'test_sso_app',
  user: 'eu-west-1:f34b49cd-695f-4d07-acd8-02e06174fa6b',
  scope: []})

db.grants.insert({
  id:'jhfgs294723ijsdhfsdfhskjh329423798wsdyre',
  app: 'console',
  user: 'eu-west-1:dd8890ba-fe77-4ba6-8c9d-5ee0efeed605',
  scope: ['admin']})


# Flows


## AWS Cognito / Oz


## Gigya
