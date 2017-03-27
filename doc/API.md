# API Documentation

Generally, the API will return valid JSON data where a response body is
expected. Messages and errors will be contained in an object with the field
"message" containing a string explaining the situation.

GET and PUT requests return `200 OK`, POST requests return `201 Created`. Both
non-GET requests may respond with `409 Conflict` and responses with
`500 Internal Server Error` must be expected.

Cases where other types of response headers must be handled, are described as
part of the endpoint in question.


**Table of contents**

* [`GET /healthcheck`](#get-healthcheck)
* [`GET /version`](#get-version)
* [`GET /users`](#get-users)
* [`POST /users/register`](#register-user)
* [`POST /users/delete`](#delete-user)
* [`GET /users/search`](#search-user)
* [`GET /users/schema`](#get-user-schema)
* [`GET /users/exists`](#user-exists)
* [`GET /users/{id}`](#get-user)

<a name="get-healthcheck" />
## [GET /healthcheck]

Query parameters: _None_

Check if the API is up and running. Mostly used by Pingdom and similar
availability services. Returns 200 OK and a confirmation message.


<a name="get-version" />
## [GET /version]

Query parameters: _None_

Returns an object with information about the application:

```
{
  "name": "bpc",
  "version": "1.0.0",
  "description": "Berlingske Media Oz-based SSO Permissions Center (BPC)",
  "license": "ISC"
}
```


<a name="get-users" />
## [GET /users]

Query parameters: _None_

Returns a list of all users currently created in BPC. Deleted users are omitted.


<a name="register-user" />
## [POST /users/register]

Query parameters: _None_

Registers a new Gigya account and creates a user in the local database which is
a direct match to the corresponding Gigya account, but containing selected data.

Example POST request:

```
{
	"email": "camj@berlingskemedia.dk",
	"password": "my-secret-password",
	"profile": {
		"firstName": "Camilla",
		"lastName": "Julie Jensen"
	}
}
```

Returns the user object as stored in the database.

Profile fields are directly matched to their corresponding whitelisted fields in
Gigya. Please note the restrictions here; only a limited set of fields are
allowed.


<a name="delete-user" />
## [DELETE /users/{id}]

Query parameters: _None_

Deletes the user with the given id (UID). This call will attempt to delete the
user from Gigya, and if successful, mark the local user as deleted.


<a name="search-user" />
## [GET /users/search]

Query parameters:

  * `query` - SQL-style Gigya query to search by

Returns all Gigya results matching the query. Note that Gigya has an upper limit
of 5000 accounts in the result set, which also takes effect in the API.

Example query: `SELECT * FROM accounts WHERE profile.email = "camj@berlingskemedia.dk"`

Example result:

```
{
  "results": [
    {
      "data": {},
      "lastUpdatedTimestamp": 1490603944224,
      "socialProviders": "site",
      "password": { ... },
      "iRank": 0,
      "created": "2017-03-27T08:39:04.181Z",
      "lastLoginTimestamp": 1490603944318,
      "oldestDataUpdated": "2017-03-27T08:39:04.224Z",
      "isLockedOut": false,
      "profile": { ... },
      "isVerified": false,
      "createdTimestamp": 1490603944181,
      "identities": [ ... ],
      "lastUpdated": "2017-03-27T08:39:04.224Z",
      "emails": { ... },
      "isRegistered": true,
      "regSource": "",
      "lastLoginLocation": { ... },
      "isActive": true,
      "lastLogin": "2017-03-27T08:39:04.318Z",
      "oldestDataUpdatedTimestamp": 1490603944224,
      "UID": "64d9620306bd400088dc2e4235a0fe79",
      "registered": "2017-03-27T08:39:04.238Z",
      "rbaPolicy": { ... },
      "loginIDs": { ... },
      "registeredTimestamp": 1490603944238,
      "loginProvider": "site"
    }
  ],
  "objectsCount": 1,
  "totalCount": 1,
  "statusCode": 200,
  "errorCode": 0,
  "statusReason": "OK",
  "callId": "c940815ac3434663b9e82db99add5d74",
  "time": "2017-03-27T09:27:13.940Z"
}
```


<a name="get-user-schema" />
## [GET /users/schema]

Query parameters: _None_

Returns the user schema from Gigya. This is the template for what a user object
should look like.

Example result:

```
{
  "profileSchema": {
    "fields": { ... },
    "unique": [],
    "dynamicSchema": false
  },
  "dataSchema": { ... },
  "statusCode": 200,
  "errorCode": 0,
  "statusReason": "OK",
  "callId": "f22339a682c44485bf2ecadfb3ef3797",
  "time": "2017-03-27T10:33:17.469Z"
}
```


<a name="user-exists" />
## [GET /users/exists]

Query parameters:

  * `email` - email address to check

Checks with Gigya if the given email address is taken or not.

Example result:

```
{
  "isAvailable": false,
  "statusCode": 200,
  "errorCode": 0,
  "statusReason": "OK",
  "callId": "ca9726cd04174c2c9e1a0686c9dd79f5",
  "time": "2017-03-27T10:44:47.274Z"
}
```


<a name="get-user" />
## [GET /users/{id}]

Query parameters: _None_

Looks up the user with the given id (UID).


<a name="create-user" />
## [POST /users] **Deprecated**

Query parameters: _None_

Creates a new (local) user without creating anything in Gigya. This endpoint
might be useful for certain situations.
