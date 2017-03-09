# Berlingske Permission Central (BPC)

This is the server (REST-based API) for the SSO solution that replaces
the previous BOND-based SSO solution.

![poc gigya 1](https://cloud.githubusercontent.com/assets/6349363/23746906/027f6946-04be-11e7-8f6c-419e95cb5bbc.png)


## Description

Single Sign-On (SSO) is implemented using Gigya RaaS and Site Groups. Websites
and apps use Gigyas SDK to show a login screen to the user. Gigya has support
for showing different screensets depending on what device the user is on.

Gigya RaaS (Registration-as-a-Service) means our Gigya platform is a
cloud-hosted platform. RaaS has the support for Social Logins as standard.

Gigya Site Groups enables one unified user account database in Gigya across
mutiple sites and apps. This means the user only needs one account to access
all Berlingske Media websites and apps, even though the user might be
presented with different login screens with different media brandings.

After creating an account in Gigya or logging in to an existing account, the
user is identified and authenticated. Is this point, the user has no
authorizations or permissions. The user is simply an identified guest.

This is where the BPC comes in. BPC is a permission-service to securely exchange
user permissions to the website or app. For example, when a user signs into
b.dk, the website uses BPC to verify if the user has an active subscription or
the paid-article count is depleted.

BPC uses an open source solution, Oz, which is based on the OAuth 1.0 protocol.
Oz provides access scopes, delegation, credential refresh, stateless server
scalability, self-expiring credentials, secret rotation, and a really solid
authentication foundation.

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

After the user has signed in with Gigya on the website, the website request user
permission securely from BPC. The secure exchange of permissions is done by
encrypted tickets.

The workflow goes like this:

0. The website is registered with BPC and is issued a client ID and secret.
   This is done once per website or app.
1. The website gets an app ticket from BPC used it's client ID and secret.
2. The user visits the website. The user is unauthenticated.
3. The user signs in with Gigya on the website.
4. The applications sends the user to BPC with the client ID and Gigya ID.
5. BPC validates the user with Gigya, grant is automatically created and stored
   and a RSVP is issued.
6. The user is sent back to the website with the RSVP.
7. The website uses it's app ticket and the RSVP to get an user ticket from BPC.
8. The application stores the user ticket in e.g. a browser cookie.
9. For each user action on the website can be validated for sufficient
   permissions using the user ticket with BPC.


## Application

An application is a website or mobile app.

Each application must be registered in BPC. By registering, the app is given an
client ID and a secret. These must stored in the application itself.


## User

A user is a customer and/reader of a Berlingske Media brand. He/she is
identified by an email or social media login.


## Permission

A permission is an indication of whether or not the user is entitled to a given
artifact. A permissions is bound within a scope to the user account. The
permissions and artifact is defined in the domain of the application. BPC has no
knowledge about permissions or it's usage. It can be a string value, boolean or
integer.


## Grant

TODO


## Scope

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


## RSVP


## Ticket


## BPC console

The BPC console is a special application for managing BPC. It enabled it's users
register other applications in BPC, set scopes and administer users.


# Setup

## Building and Running the Application

Build the Docker image using the following command;

```
docker build -t berlingskemedia/bpc:latest .
```

Once the image is ready, you can run it as shown below - don't forget to set
the environment variables appropriately;

```
docker run \
  --env=PORT=80 \
  --env=MONGODB_HOST=<value> \
  --env=MONGODB_PORT=<value> \
  --env=MONGODB_DATABASE=<value> \
  --env=GIGYA_APP_KEY=<value> \
  --env=GIGYA_USER_KEY=<value> \
  --env=GIGYA_SECRET_KEY=<value> \
  --env=ENCRYPTIONPASSWORD=<value> \
  --publish=80:80 \
  -d \
  berlingskemedia/bpc
```

Please see the environment variable reference below for complete details.

A Docker container should now be running and providing an API on port 80
(or otherwise, if you've reconfigured the `publish` parameter).


## MongoDB

You can almost start with an empty database. However, it needs to be primed
with an admin scope and corresponding admin user who can manage permissions etc.

```
db.applications.insert({
  id: 'console',
  scope: ['admin', 'admin:*'],
  delegate: false,
  key: 'something_long_and_random',
  algorithm: 'sha256',
  settings: {}})

db.grants.insert({
  id:'jhfgs294723ijsdhfsdfhskjh329423798wsdyre',
  app: 'console',
  user: 'eu-west-1:dd8890ba-fe77-4ba6-8c9d-5ee0efeed605',
  scope: ['admin:*']})
```

# Environment Variable Reference

BPC supports the following environment variables:

  * `PORT` - port number that the application should listen on.
  * `MONGODB_HOST` - host name or IP address of server running MongoDB. If
    replica sets are used, this would be a comma-separated list of hostnames for
    each server in the set.
  * `MONGODB_PORT` - port number to connect to MongoDB on.
  * `MONGODB_DATABASE` - name of database to use on MongoDB.
  * `MONGODB_REPLSET` - name of MongoDB replica set (optional).
  * `MONGODB_READPREFERENCE` - type of MongoDB read preference if using replica
    sets (optional). Refer to the MongoDB documentation for choices. The default
    is `primaryPreferred`.
  * `GIGYA_APP_KEY` - application key to the Gigya API.
  * `GIGYA_USER_KEY` - user key to the Gigya API.
  * `GIGYA_SECRET_KEY` - secret to the Gigya API.
  * `ENCRYPTIONPASSWORD` - used by the Oz protocol for data encryption.

If not using replica sets, `MONGODB_REPLSET` and `MONGODB_READPREFERENCE` can
be ignored.
