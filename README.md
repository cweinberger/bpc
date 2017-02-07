# SSO Poc

# SSO (Single Sign On) and BPC (Berlingske Permission Central)

SSO is implementet using Gigya RaaS and Site Groups. Websites and apps use Gigyas SDK to show a login screen to the user. Gigya has the options to have multiple screenSets depending on what device the user is on.

Gigya RaaS (Registration-as-a-Service) means our Gigya platform is a cloud hosted platform. RaaS has the support for Social Logins as standard.

Gigya Site Groups enables one unified user account database in Gigya across mutiple sites and apps. This means the user only needs one account to access all Berlingske Media websites and apps, even though the user might be presented with different login screens with different media branding.

Gigya does not directly support automatic login on all websites, once the user has logged in at one website. To support this, we must build a central login-portal, and delegate sessions securely from the portal to all websites. Whether or not to support this, comes down to a user experience decision.

After creating an account in Gigya or logging in to an existing account, the user is identified and authenticated. Is this point, the user has no authorizations or permissions. The user is simply an identified guest.

This is were the BPC comes in. BPC is a permission-service to securely exchange user permissions to the website or app. For an example, when a user signs into b.dk, the website uses BPC to verify if the user has an active subscription or the paid-article count is depleted.

BPC uses an open source solution, Oz, which is based on the OAuth 1.0 protocol. Oz provides access scopes, delegation, credential refresh, stateless server scalability, self-expiring credentials, secret rotation, and a really solid authentication foundation.

Normally OAuth (and Oz) is used in scenarios where an application is granted various permissions to user-owned resources on a server. Eg. a photo-print-service (the app) is granted access to user photos (the resources) on Facebook (the server). The grant is reviewed and accepted by the user in a consent screen.

Oz is used a bit differently in BPC.

* The server = BPC
* The application = website or app
* The user = customer
* The resources = customer account permissions (An account permission could be eg. "Paying subscriber to b.dk")
* The user does not "own" the resources
* The user does not review the grant
* The grant is created automatically without any consent screen

After the user has signed in with Gigya on the website, the website request user permission securely from BPC. The secure exchange of permissions is done by encrypted tickets.

The workflow goes like this:

0. The website is registered with BPC and is issued a client ID and secret. This is done once per website or app.
1. The website gets an app ticket from BPC used it's client ID and secret.
2. The user visits the website. The user is unauthenticated.
3. The user signs in with Gigya on the website.
4. The applications sends the user to BPC with the client ID and Gigya ID.
5. BPC validates the user with Gigya, grant is automatically created and stored and a RSVP is issued.
6. The user is sent back to the website with the RSVP.
7. The website uses it's app ticket and the RSVP to get an user ticket from BPC.
8. The application stores the user ticket in e.g. a browser cookie.
9. For each user action on the website can be validated for sufficient permissions using the user ticket with BPC.


## Application

An application is a website or mobile app.

Each application must be registered in BPC. By registering, the app is given an client ID and a secret. These must stored in the application itself.

## User

A user is a customer and/reader of a Berlingske Media brand. He/she is identified by an email or social media login.

## Permission

A permission is an indication of whether or not the user is entitled to a given artifact. A permissions is bound within a scope to the user account. The permissions and artifact is defined in the domain of the application. BPC has no knowledge about permissions or it's usage. It can be a string value, boolean or integer.

## Grant

TODO

## Scope

Each application registeret with BPC can be assigned one or more arbitrary scopes e.g. "berlingske", "bt" or "marketinganalytics". When a website validates a user ticket with BPC, only permissions that are within that specific applications scope are accessible. This means that only applications with e.g. the "berlingske" scope are allowed to read or make changes to the permissions within that scope. Other scopes are restricted.

Scopes cannot be named starting with "admin". There is a reserves scope named be the convention "admin:<client ID>". These are used to promote specific users as an admin for that application in the BPC console.

## RSVP

## Ticket

## BPC console

The BPC console is a special application for managing BPC. It enabled it's users register other applications in BPC, set scopes and administer users.


# Setup

## /etc/hosts

127.0.0.1       berlingske-poc.local
127.0.0.1       berlingske-poc-client.local
127.0.0.1       berlingske-poc-server.local
127.0.0.1       berlingske-poc-console.local

## MongoDB


```
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
  scope: ['admin:*']})
```

# Flows


## AWS Cognito / Oz


## Gigya
