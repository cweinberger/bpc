# API Documentation

Generally, the API will return valid JSON data where a response body is
expected. Messages and errors will be contained in an object with the field
"message" containing a string explaining the situation.

GET and PUT requests return `200 OK`, POST requests return `201 Created`. Both
non-GET requests may respond with `409 Conflict` and responses with
`500 Internal Server Error` must be expected.

Cases where other types of response headers must be handled, are described as
part of the endpoint in question.


## Making authorized requests

If an API endpoint requires a ticket, this means that the request must be signed with a Hawk _Authorization_ header.

To generate a Hawk _Authorization_ header, see the following code example:

```
const Hawk = require('hawk');
var hawkHeader = Hawk.client.header(
  https://<BPC_SERVER_URL>,
  <METHOD GET|POST|etc.>,
  {
    credentials: {
      id: <ID>,
      key: <SECRET_KEY>,
      algorithm: 'sha256'
    },
    app: <APP_ID>
  }
).field;
```

Now the `field` attribute can be inserted into the _Authorization_ header of the HTTP request.

Some endpoints requires a ticket issued to an `app`. Some endpoints requires a `user` ticket. And others take both (`any`). In these cases use respective ticket to genereate the Hawk _Authorization_ header, by added the ticket in the `credentials` attribute.


## Table of contents

* [`GET /rsvp`](#get-rsvp)
* [`POST /rsvp`](#post-rsvp)
* [`POST /ticket/app`](#post-ticketapp)
* [`POST /ticket/user`](#post-ticketuser)
* [`POST /ticket/reissue`](#post-ticketreissue)
* [`GET /me`](#get-me)
* [`GET /permissions/{scope}`](#get-permissionsscope)
* [`GET /permissions/{user}/{scope}`](#get-permissionsuserscope)
* [`POST /permissions/{user}/{scope}`](#post-permissionsuserscope)
* [`PATCH /permissions/{user}/{scope}`](#patch-permissionsuserscope)
* [`GET /permissions/{provider}/{email}/{scope}`](#get-permissionsprovideremailscope)
* [`POST /permissions/{provider}/{email}/{scope}`](#post-permissionsprovideremailscope)
* [`GET /users`](#get-users)
* [`GET /users/{id}`](#get-usersid)
* [`DELETE /users/{id}`](#delete-usersid)
* [`POST /users/{id}/superadmin`](#) TODO
* [`DELETE /users/{id}/superadmin`](#) TODO
* [`GET /users/exists`](#get-usersexists)
* [`POST /users/register`](#post-usersregister)
* [`POST /users/update`](#post-usersupdate)
* [`POST /users/resetpassword`](#post-usersresetpassword)
* [`GET /users/search`](#get-userssearch)
* [`GET /gigya/search`](#get-gigyasearch)
* [`GET /gigya/exists`](#get-gigyaexists)
* [`POST /validate`](#post-validate)
* [`GET /applications`](#get-applications)
* [`POST /applications`](#post-applications)
* [`GET /applications/{id}`](#get-applicationsid)
* [`PUT /applications/{id}`](#put-applicationsid)
* [`DELETE /applications/{id}`](#delete-applicationsid)
* [`GET /applications/{id}/grants`](#get-applicationsidgrants)
* [`POST /applications/{id}/grants`](#post-applicationsidgrants)
* [`POST /applications/{id}/grants/{grantId}`](#post-applicationsidgrantsgrantid)
* [`DELETE /applications/{id}/grants/{grantId}`](#delete-applicationsidgrantsgrantid)
* [`GET /settings/{scope}`](#) TODO
* [`GET /settings/{scope}/{key}`](#) TODO
* [`PUT /settings/{scope}/{key}`](#) TODO
* [`GET /healthcheck`](#get-healthcheck)
* [`GET /version`](#get-version)




## [GET /rsvp]

* Query parameters: See [Joi validation object](../server/rsvp/index.js#L19)

If the user is validated and have a grant to the application, an RSVP is returned.
If `returnUrl` is specific, the user will be redirected to this URL with `rsvp` in the querystring.



## [POST /rsvp]

* Query parameters: _None_
* Payload: See [Joi validation object](../server/rsvp/index.js#L19)

Same as the equivalent GET request (see above).
The RSVP will be in the response body and `X-RSVP_TOKEN` header.

Example body request
```
    {
        "app":"bt_test",
        "provider":"gigya",
        "email":"btdk-test+123123@berlingskemedia.dk",
        "UID":"07f73e5305cc4db9ab8433e8ecf05ab2",
        "UIDSignature":"E2wHxyDxS1sclDCtGjM846P83Wc=",
        "signatureTimestamp":"1507038287"
    }
 ```
 
Example body response
```
Fe26.2**262b0f54c902bd8f8f1871462b716886533edc22fb7a280bf1e05e09c21949b3*NaIqNe-_Zi9HGzcVCVpn0w*YVoUM6EWLK9MrdhA1zeAAFK0Zi2jcSSaq28YnwR4QhQMwWSMuTXfgyEhSpNn5TlE8HDtdHyINqgLvpJll-XT63r_Py_bRASieSwB6EzTbimK403QW91u0R4Q6musw-cB**bf36148da5511f14ed1ee43bce74cb46743a177c4f9167a945aa71f569106092*jOoV6REn8tu88mfcV1Kmq00ui3uAO8A91zMFOPqk_eY
```


## [POST /ticket/app]

* Query parameters: _None_
* Payload: _None_
* Required Hawk Authorization header: Generated using the App ID and Secret.
* Required ticket type: _None_
* Required scope: _None_

Use this endpoint to get an `app` ticket, by making a request signed with the previously issued App ID and Secret. (I.e. the App ID and Secret you get from the BPC Console.)

Returns an application ticket if the application is valid. The ticket must be reissued before the expiration.


Example header request:

```
Authorization: Hawk id="bt_test", ts="1507038775", nonce="UoqYeH", mac="ly3GbgNeQkpiZuFbeHbq0N7H9Lx/csfBrlPsCJ8OMrc=", app="bt_test"
Content-Type: application/json
```

Example body response:

```
{
    "exp": 1507042153810,
    "app": "bt_test",
    "scope": [
        "profile"
    ],
    "key": "Rx7u6lXCLPDky8_Zlk25nN_eWfNFT1EI",
    "algorithm": "sha256",
    "id": "Fe26.2**a8e77f19e4bf53c0cf91aa0a0bd260b2bc1f8e58038a2fa3fb74c1983b682b1b*q58kU3GyjVeRgOK_BubnpA*ppOoKyzukvBpjaGISGxQx71CmrcINj6lFge7L1Hg86A73AAfgHtuDp-Rfy78GZl1qaiOLGJmw-zwpMpCPDW6vWeWgWyFY4JZcoXsYqya8luUvndJSz2vwoZSAAXMJcgF63zQ-doesv_k1AA0PZVH2LN4G6BsvABykVPPmYNTH78**74a69aba09a199933b2264e1d62f5182b0f8e34949fc36dab70de85e49456196*_vuEhEwl-Vlm2q-XMCGiVC0boZW8mKIFuMA2rFVTM4w"
}
```



## [POST /ticket/user]

* Payload:
  * `rsvp`: RSVP from user
* Required ticket type: `app`
* Required scope: _None_

This the request is valid, a user ticket is returned.






## [POST /ticket/reissue]

* Required ticket type: `any`
* Required scope: _None_

The ticket used to sign the request will be renewed with a new expiration time.

Example header request:

```
Authorization: Hawk id="Fe26.2**a8e77f19e4bf53c0cf91aa0a0bd260b2bc1f8e58038a2fa3fb74c1983b682b1b*q58kU3GyjVeRgOK_BubnpA*ppOoKyzukvBpjaGISGxQx71CmrcINj6lFge7L1Hg86A73AAfgHtuDp-Rfy78GZl1qaiOLGJmw-zwpMpCPDW6vWeWgWyFY4JZcoXsYqya8luUvndJSz2vwoZSAAXMJcgF63zQ-doesv_k1AA0PZVH2LN4G6BsvABykVPPmYNTH78**74a69aba09a199933b2264e1d62f5182b0f8e34949fc36dab70de85e49456196*_vuEhEwl-Vlm2q-XMCGiVC0boZW8mKIFuMA2rFVTM4w", ts="1507038697", nonce="g1Vsvz", mac="jWWUrEWhYfji7x2NSCTe3DhDw4CPeVYJEx1P6HyhPD8=", app="bt_test"
Content-Type: application/json
```

Example body response:

```
{
    "exp": 1507042297338,
    "app": "bt_test",
    "scope": [
        "profile"
    ],
    "key": "xtAaxFhTOb2ao24JWX_tbicU8Osjk6aH",
    "algorithm": "sha256",
    "id": "Fe26.2**11d5c3118ec8a57dc6f1c8e61dced1e45f1efb770ec611ec180ed1aa25d1227b*n9q6FmXBYK-yM3amSYe_pQ*jP4eFi_1GknPfIZi0Cd1dRSMTPzMUHyvgSQ63e6kZUfsgXTj-FoFqZiH5fNdKZtgO56tyKEJaXjJpMOSQ0bHakiPtBoD4MG4zFoeBiHN-uOM8nV1YIecxWIGEXQeWYnIfgx4Cb7UrPk20okB4CL-sxNXr6DsgKk0FJBhNqEmWnA**a67aef2f3ca63e4305e336addd85178da25138a5c82b0437e9b1f95df3c678e3*Ee3DUqfBVPRCBX86aMTaADzV1FdkO3hdj21qZAtjwVw"
}
```



## [GET /me]

* Query parameters: _None_
* Required ticket type: `user`
* Required scope: _None_

Returns user profile data.






## [GET /permissions/{scope}]

* Query parameters: _None_
* Required ticket type: `user`
* Required scope: `{params.scope}`

Gets the user permissions. The user is the ticket, with which the request has been signed.






## [GET /permissions/{user}/{scope}]

* Query parameters: _None_
* Required ticket type: `app`
* Required scope: `{params.scope}`, `admin`


Gets the user permissions. The users ID is in the request parameters.

Example request headers:

```
Authorization: Hawk id="Fe26.2**a8e77f19e4bf53c0cf91aa0a0bd260b2bc1f8e58038a2fa3fb74c1983b682b1b*q58kU3GyjVeRgOK_BubnpA*ppOoKyzukvBpjaGISGxQx71CmrcINj6lFge7L1Hg86A73AAfgHtuDp-Rfy78GZl1qaiOLGJmw-zwpMpCPDW6vWeWgWyFY4JZcoXsYqya8luUvndJSz2vwoZSAAXMJcgF63zQ-doesv_k1AA0PZVH2LN4G6BsvABykVPPmYNTH78**74a69aba09a199933b2264e1d62f5182b0f8e34949fc36dab70de85e49456196*_vuEhEwl-Vlm2q-XMCGiVC0boZW8mKIFuMA2rFVTM4w", ts="1507038697", nonce="g1Vsvz", mac="jWWUrEWhYfji7x2NSCTe3DhDw4CPeVYJEx1P6HyhPD8=", app="bt_test"
Content-Type: application/json
```

Example reponse_

```
{"sso_uid":"3050037","permission_113":false,"permission_130":false,"PAID_ARTILCE":true}
```

## [POST /permissions/{user}/{scope}]

* Query parameters: _None_
* Required ticket type: `app`
* Required scope: `{params.scope}`, `admin`

Sets the user permissions. The users ID is in the request parameters.




## [PATCH /permissions/{user}/{scope}]

* Query parameters: _None_
* Required ticket type: `app`
* Required scope: `{params.scope}`, `admin`

Updates the user permissions. The users ID is in the request parameters.

To update the permissions, the MongoDB update operator syntax can be used to change fields and arrays.
See more about MongoDB Update Operators here: [https://docs.mongodb.com/manual/reference/operator/update/](https://docs.mongodb.com/manual/reference/operator/update/)

The following operators are not allowed (will be ignored):

* `$setOnInsert`
* `$isolated`
* `$pushAll`

Lets assume a user has the following data in a scope:

```
{ "test_integer": 1, "test_float": 7, "test_object": { "test_array": [ 100 ] } }
```

To increase the _test_integer_ with the value 2, use the operator `$inc`. Works with positive and negative numbers.
To multiply the _test_float_ with the value 0.5 (halve), use the operator `$mul`.

Example payload:

```
{
  $inc: { "test_integer": 2 },
  $mul: { "test_float": 0.5 }
}
```

The resulting data will be like:

```
{ "test_integer": 3, "test_float": 3.5, "test_object": { "test_array": [ 100 ] } }
```

Fields and arrays inside objects can also to used in operators. To do this, use the MongoDB _Embedded Document_ syntax style.

Example:

```
{ $addToSet: { "test_object.test_array": 200 } }
```

The resulting data will be like:

```
{ "test_integer": 3, "test_float": 3.5, "test_object": { "test_array": [ 100, 200 ] } }
```


## [GET /permissions/{provider}/{email}/{scope}]

* Query parameters: _None_
* Required ticket type: `app`
* Required scope: `{params.scope}`, `admin`


Gets the user permissions. The parameter `provider` is either _gigya_ or _google_ and `email` must be an email address.


## [POST /permissions/{provider}/{email}/{scope}]

* Query parameters: _None_
* Required ticket type: `app`
* Required scope: `{params.scope}`, `admin`

Sets the user permissions. The parameter `provider` is either _gigya_ or _google_ and `email` must be an email address.






## [GET /users]

* Query parameters:
  * `email`: A valid email address
  * `provider`: 'gigya' (default) or 'google'
* Required ticket type: `any`
* Required scope: `admin`, `users`

Returns a list of all users currently created in BPC. Deleted users are omitted.






## [GET /users/{id}]

* Query parameters: _None_
* Required ticket type: `any`
* Required scope: `admin`, `users`

Looks up the user with the given id (UID).






## [DELETE /users/{id}]

**TEMPORARY**: This endpoint will eventually be removed.
Instead, in the future, users are deleted directly in Gigya and webhooks will call BPC to mark them as deleted.

* Query parameters: _None_
* Required ticket type: `any`
* Required scope: `admin`, `users`

Deletes the user with the given id (UID). This call will attempt to delete the
user from Gigya, and if successful, mark the local user as deleted.




## [GET /users/exists]

**OBSOLETE**: Use endpoint `GET /gigya/exists` instead.




## [POST /users/register]

**TEMPORARY**: This endpoint will eventually be removed.
Only Drupal SSO is allowed to use this endpoint.
To create a user, use the corresponding enpoint on Drupal SSO.
Instead, in the future, users must be created using the Gigya API.

* Query parameters: _None_
* Required ticket type: `any`
* Required scope: `admin`, `users`

Registers a new Gigya user account.

Example POST request:

```
{
  "email": "johndoe@berlingskemedia.dk",
  "password": "my-secret-password",
  "profile": {
    "firstName": "John",
    "lastName": "Doe"
  },
  "data": {
    "terms": true
  }
}
```

Returns the user object as stored in Gigya.

Profile fields are directly matched to their corresponding whitelisted fields in
Gigya. Please note the restrictions here; only a limited set of fields are
allowed.



## [POST /users/update]

**TEMPORARY**: This endpoint will eventually be removed.
Instead, in the future, user profile updates must be made using the Gigya Web SDK.



## POST /users/resetpassword

**TEMPORARY**: This endpoint will eventually be removed.
Instead, in the future, user password reset must be made using the Gigya API.



## [GET /users/search]

**OBSOLETE**: Use endpoint `GET /gigya/search` instead.



## GET /gigya/search

**TEMPORARY**: This endpoint will eventually be removed.
Instead, in the future, to search must be made using the Gigya API.

* Query parameters:
  * `query` - SQL-style Gigya query to search by
* Required ticket type: `any`
* Required scope: `admin`, `users`

Returns all Gigya results matching the query. Note that Gigya has an upper limit
of 5000 accounts in the result set, which also takes effect in the API.

Example query: `SELECT * FROM accounts WHERE profile.email = "johndoe@berlingskemedia.dk"`

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


## GET /gigya/exists

**TEMPORARY**: This endpoint will eventually be removed.
Instead, in the future, requests to check if emails exists must be made using the Gigya API.

* Query parameters:
  * `email` - email address to check
* Required ticket type: `any`
* Required scope: `admin`, `users`

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




## [POST /validate]

* Query parameters: _None_
* Required ticket type: `app`
* Required scope: _None_

This endpoint is used to validate requests in an app-to-app authentication scheme.

When we need to secure an API, we can use BPC.
Let's image an application callled *ApplicationA* needs to make authenticated requests to an API called *ApiB*.
*ApplicationA* has already received it's app ticket from BPC. In case *ApplicationA* has any users, these will propably also have a user ticket.
These same tickets and Hawk can be used to authenticated requests to *ApiB*. Just like when making authenticated requests to BPC, the Hawk authentication header is generated using the ticket and adding it to the Authorization HTTP header.
When *ApiB* receives requests with the Hawk authentication header, these request can validated by making another request from *ApiB* to BPC, containing details about the request from *ApplicationA*. The validation can be specified to be of:
* A valid ticket (default)
* A valid ticket issued to a specific app
* A valid ticket issued to a specific user
* A valid ticket containing a scope

Example payload:

```
{
  method: 'get',
  url: '/resource/1234',
  headers:
  {
    host: 'exampleapi.com',
    authorization: 'Hawk id="Fe26.2**9e4*tWfFBw*V5-[SHORTENED]-sQ**7e413*gr62g", ts="1499698964", nonce="xTovQC", mac="GL4PSU3DwJQ+hHAH9NbKnxGEyhQNJON781YYrobEQAQ=", app="application_a"' }
  },
  scope: [ 'test_scope' ],
  app: 'application_a',
  user: '1234'
}
```

If the validation succeeds, BPC responds with a `200 OK`. If else a `401 Unauthorized`.




## [GET /applications]

* Query parameters: _None_
* Required ticket type: `user`
* Required scope: `admin`

This endpoint is used to get a list all of applications.
This can only be done by an admin (aka. console user).





## [POST /applications]

* Query parameters: _None_
* Required ticket type: `user`
* Required scope: `admin`

This endpoint is used to create a new application.
This can only be done by an admin (aka. console user).
When inserting a new application, the user, who performs the action will automatically become an application-admin.






## [GET /applications/{id}]

* Query parameters: _None_
* Required ticket type: `user`
* Required scope: `admin:{params.id}`, `admin:*`

This endpoint is used to get details on a specific application.
This can only be done either by an application-admin or a super-admin.





## [PUT /applications/{id}]

* Query parameters: _None_
* Required ticket type: `user`
* Required scope: `admin:{params.id}`, `admin:*`

This endpoint is used to update a specific application.
This can only be done either by an application-admin or a super-admin.





## [DELETE /applications/{id}]

* Query parameters: _None_
* Required ticket type: `user`
* Required scope: `admin:{params.id}`, `admin:*`

This endpoint is used to remove a specific application.
This can only be done either by an application-admin or a super-admin.





## [GET /applications/{id}/grants]

* Query parameters: _None_
* Required ticket type: `user`
* Required scope: `admin:{params.id}`, `admin:*`

This endpoint is used to list all grants for a specific application.
This can only be done either by an application-admin or a super-admin.





## [POST /applications/{id}/grants]

* Query parameters: _None_
* Required ticket type: `user`
* Required scope: `admin:{params.id}`, `admin:*`

This endpoint is used to create a specific grant.
This can only be done either by an application-admin or a super-admin.





## [POST /applications/{id}/grants/{grantId}]

* Query parameters: _None_
* Required ticket type: `user`
* Required scope: `admin:{params.id}`, `admin:*`

This endpoint is used to update a specific grant.
This can only be done either by an application-admin or a super-admin.






## [DELETE /applications/{id}/grants/{grantId}]

* Query parameters: _None_
* Required ticket type: `user`
* Required scope: `admin:{params.id}`, `admin:*`

This endpoint is used to remove a specific grant.
This can only be done either by an application-admin or a super-admin.




## [GET /healthcheck]

* Query parameters: _None_

Check if the API is up and running. Mostly used by Pingdom and similar
availability services. Returns 200 OK and a confirmation message.




## [GET /version]

* Query parameters: _None_

Returns an object with information about the application:

```
{
  "name": "bpc",
  "version": "1.0.0",
  "description": "Berlingske Media Oz-based SSO Permissions Center (BPC)",
  "license": "ISC"
}
```
