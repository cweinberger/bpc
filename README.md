# Berlingske Permission Central (BPC)

This is the server (REST-based API) for the SSO solution that replaces
the previous BOND-based SSO solution.

![poc gigya 1](https://cloud.githubusercontent.com/assets/6349363/23746906/027f6946-04be-11e7-8f6c-419e95cb5bbc.png)


## Related Resources

  * [API Documentation](doc/API.md)


## Description

Single Sign-On (SSO) is implemented using Gigya Registration-as-a-Service (RaaS) and Site Groups. Websites
and apps use the Gigya Web SDK log users in and interact with user profile data.

Gigya RaaS means our Gigya platform is a
cloud-hosted platform.

Gigya Site Groups enables one unified user account database in Gigya across
multiple sites and apps. This means the user only needs one account to access
all Berlingske Media websites and apps, even though the user might have created the account with different
brand.

After creating an account in Gigya or logging in to an existing account, the
user is identified and authenticated. Is this point, the user has no
authorizations or permissions.

This is where the BPC comes in. BPC is a permission-service to securely exchange
user permissions to the website or app. For example, when a user signs into
b.dk, the website uses BPC to verify if the user has an active subscription or
the paid-article count is depleted.

BPC uses an open source solution, Oz, which is based on the OAuth 1.0 protocol.
Oz provides access scopes, delegation, credential refresh, stateless server
scalability, self-expiring credentials, secret rotation, and a really solid
authentication foundation.

After the user has signed in with Gigya on the website, the website request user
permission securely from BPC. The secure exchange of permissions is done by
encrypted tickets.

Beyond storing user permissions, BPC has additional functionality:

  * Applications can be registered (with App ID and Secret) and interact with BPC.
  * Data on a user profile is protected by a "scope".
    An application and/or user must have this scope to be able to access that data.
  * Data in a scope is a JSON object including string, integers, dates, booleans, arrays and objects.
    Every application with the corresponding scope has access to add, delete and change data with the scope.
    This helps us build a user experiences that across multiple applications and websites.
  * Each application can specify if access should be given to all registered users,
    or just a subset (by specifying user email.)
  * Access can be revoked.
  * Beside the data that can be stored on a user profile, each application has it's own data storage.
    This could be used for those settings that are not optimal to be stored in the environment.
    It could limit the need for a separate database for each application.
  * BPC can be used to secure an API to be used only by applications and/or users with valid BPC tickets.

## Workflow

The workflow goes like this:

  0. The website is registered with BPC and is issued a App ID and Secret.
     This is done once per website or app.
  1. The website gets an app ticket from BPC used it's App ID and Secret.
  2. The user visits the website. The user is unauthenticated.
  3. The user signs in with Gigya on the website.
  4. The applications sends the user to BPC with the App ID and Gigya login session information.
  5. BPC validates the user with Gigya and a RSVP is issued.
  6. The user returns to the website with the RSVP.
  7. The website uses it's app ticket and the RSVP to get an user ticket from BPC.
  8. The application stores the user ticket in e.g. a browser cookie.
  9. For each user action on the website can be validated for sufficient
     permissions using the user ticket with BPC.


### Application

An application is a website or mobile app.

Each application must be registered in BPC. By registering, the app is given an
App ID and a Secret. These must stored in the application itself.


### User

A user is a customer and/reader of a Berlingske Media brand. He/she is
identified by an email or social media login.


### Permission

A permission is an indication of whether or not the user is entitled to a given
artifact. A permissions is bound within a scope to the user account. The
permissions and artifact is defined in the domain of the application. BPC has no
knowledge about permissions or it's usage. It can be a string, boolean, date,
integer. Or an array or object.


### Scope

Each application registeret with BPC can be assigned one or more arbitrary
scopes e.g. "berlingske", "bt" or "marketinganalytics". When a website validates
a user ticket with BPC, only permissions that are within that specific
applications scope are accessible. This means that only applications with e.g.
the "berlingske" scope are allowed to read or make changes to the permissions
within that scope. Other scopes are restricted.

Scopes cannot be named starting with "admin". There is a reserves scope named be
the convention "admin:<client ID>". These are used to promote specific users as
an admin for that application in the BPC console.

The reserved scope "admin" is used for users that are allowed to see and create
apps. This scope will be added automatically to the ticket, if the grant is to
the console app.

The reserved scope "admin:\*" is used for superadmins.


### Grant

A grant is created to give a user access to a specific application.
These can be set to have an expiration time.


### Ticket

A ticket is a time-limited token to access permissions in BPC.
All protected resources in BPC must be accessed using a ticket.

There are two types of tickets: `app` and `user`. (`any` means both types).

An `app` ticket is generated to an application in exchange for a set of
application credentials.

A `user` ticket is generated to a user in exhange for an RSVP.


### RSVP

When BPC gives authorization for a user to access a specific application, the
user receives an RSVP which must be returned to the application.


# Oz, OAuth and BPC

Usually, OAuth (and Oz) is used in scenarios where an application is granted
various permissions to user-owned resources on a server. Eg. a
photo-print-service (the app) is granted access to user photos (the resources)
on Facebook (the server). The grant is reviewed and accepted by the user on a
consent screen.

Oz is used a bit differently in BPC:

  * The server = BPC
  * The application = website or app
  * The user = customer
  * The resources = customer account permissions
    (An account permission could be eg. "Paying subscriber to b.dk")
  * The user does not "own" the resources
  * The user does not review the grant
  * The grant is created automatically without any consent screen



# Tools

## Hawk

To make authorized requests to the API, each request must be signed with a Hawk Authorization header.

Hawk is natively implemented in JavaScript (Node.js and browser), but is ported
to many different environments.

See more about Hawk on [GitHub](https://github.com/hueniverse/hawk).

To generate a Hawk Authorization header, see the [API Documentation](doc/API.md).


## BPC console

The BPC console is a separate application for managing BPC. It enabled it's users
register other applications in BPC, set scopes and administer users.

The BPC Console must be primed in the database to work. See section about MongoDB under Setup.



# Gigya integrations

BPC integrates to Gigya in two ways: *RSVP/exchangeUIDSignature* and *Webhooks*.

## RSVP/exchangeUIDSignature

This integration is happening during the issue of an RSVP. After the user has logged in on the website using Gigya Web SDK,
the user is redirected to BPC with the *UID*, *UIDSignature* and *signatureTimestamp*. Using these values, BPC can exchange
for new *UIDSignature* and *signatureTimestamp*, using the method *accounts.exchangeUIDSignature*. If this succeeds, BPC has verified the user, retrieves the email and can issue an RSVP to the user.
The user now returns to the website with the RSVP, to get a user ticket.

## Webhooks

Gigya webhooks are push notifications of account events to BPC. These events are eg. *accountRegistered*, *accountUpdated* and *accountDeleted*.
The notification endpoint on BPC is */gigya/notifications*.

When a user registers on Gigya, the notification from Gigya will make sure the UID and email is registered in BPC. This will allow for permission-requests using the UID and email.

When a user is deleted on Gigya, the notification from Gigya will make sure the user is marked as deleted in BPC. This will disallow  permission-requests using the UID and email.

See more about Webhooks on [Gigya Documentation](https://developers.gigya.com/display/GD/Webhooks).

Important:

  * Make sure these webhooks are created on the Gigya Console for all Berlingske Media sites.
  * The User/App key must the same as the App Key BPC has set in as the ENV var `GIGYA_USER_KEY`.



# Setup

This section is only relevant when developing BPC.

## MongoDB

You can start with an empty database. However, to be able to register applications etc., we need the BPC Console. And this needs to be primed
 in the database including an admin user who can manage permissions etc. Use these MongoDB commands:

```
db.applications.insert({
  id: 'console',
  scope: ['admin', 'admin:*', 'admin:console'],
  delegate: false,
  key: 'something_long_and_random',
  algorithm: 'sha256',
  settings: {
    provider: 'google',
    disallowAutoCreationGrants: true
  }
})

db.grants.insert({
  id:'jhfgs294723ijsdhfsdfhskjh329423798wsdyre',
  app: 'console',
  user: 'dako@berlingskemedia.dk',
  scope: ['admin:*'],
  exp: null
})
```

### Indexed

The following indexes have been created manually:

```
db.applications.createIndex( { id: 1 })
db.grants.createIndex({ id: 1 })
db.grants.createIndex({ user: 1, app: 1 })
db.users.createIndex( { id: 1 })
db.users.createIndex( { email: 1 })
db.users.createIndex( { 'gigya.UID': 1 })
```


## Building and Running the Application

  1. Use `npm install` to install dependencies.
  2. Set environment variables.
  3. Use `gulp` to start the application (including debugger and file-watchers.)


## Debugging

When starting BPC using `gulp`, the debug flag is automatically set.

Start a new termimal and run `node debug localhost:5858` to start the debugger and attach to BPC.
Insert `debugger;` statements into the code to make a breakpoint.

On the `debug>` prompt, use commands like:

  * `repl`
  * `next`, `n`
  * `step`, `s`
  * `cont`, `c`
  * `out`, `o`
  * CTRL-C
  * `quit`

See official documentation for more info on the [Debugger](https://nodejs.org/dist/latest-v6.x/docs/api/debugger.html)


## Testing

BPC comes prepackaged with unit tests. You'll also need to ensure that you have
dev-dependencies installed (by running `npm install` without the `--production`
flag).

The test suite will run without a MongoDB database, and use a memory-based
mockup database instead if a lab test script is exported by the modules parent.
(This is a standard usage of `lab`. See [lab usage](https://github.com/hapijs/lab)).

The test assertions are written using `code` library. See [API reference](https://github.com/hapijs/code/blob/master/API.md).

Once these minor prerequisites are in place, simply run this command from the
command line, while in the BPC root directory;

```
npm run test
```

_Note: The mock database doesn't currently support features from MongoDB 3.2._
_Please be aware of this when writing your own tests._


## Environment Variable Reference

BPC supports the following environment variables:

  * `MONGODB_CONNECTION` - Connection string to the MongoDB. See [Connection String URI Format](https://docs.mongodb.com/manual/reference/connection-string/)
  * `GIGYA_APP_KEY` - application key to the Gigya API.
  * `GIGYA_USER_KEY` - user key to the Gigya API.
  * `GIGYA_SECRET_KEY` - secret to the Gigya API.
  * `ENCRYPTIONPASSWORD` - used by the Oz protocol for data encryption.
  * `PORT` - (optional) port number that the application should listen on. Default 8000.
  * `BPC_PUB_HOST` - (optional) when served behind e.g. a load balancer, set the public hostname for URL validation to work.
  * `BPC_PUB_PORT` - (optional) when served behind e.g. a load balancer, set the public TCP port for URL validation to work.


## Docker

Build the Docker image using the following command;

```
docker build -t berlingskemedia/bpc:latest .
```

Once the image is ready, you can run it as shown below - don't forget to set
the environment variables appropriately;

```
docker run \
  --env=MONGODB_CONNECTION=<value> \
  --env=GIGYA_APP_KEY=<value> \
  --env=GIGYA_USER_KEY=<value> \
  --env=GIGYA_SECRET_KEY=<value> \
  --env=ENCRYPTIONPASSWORD=<value> \
  --publish=80:8000 \
  -d berlingskemedia/bpc
```

Please see the environment variable reference below for complete details.

A Docker container should now be running and providing an API on port 8000
(or otherwise, if you've reconfigured the `publish` parameter).
