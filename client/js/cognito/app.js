
  // AWSCognito
  // AmazonCognitoIdentity

var poolData = {
  UserPoolId : 'eu-west-1_hS9hPyLgW',
  ClientId : '5tv5te4df577992koo6mo7t6me',
  Paranoia : 7
};

var userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(poolData);

AWS.config.region = 'eu-west-1';
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
  IdentityPoolId: 'eu-west-1:2add6c33-59e3-4b5d-96d9-6285378c5922',
});



$(document).ready(function() {

  $('#aws-loginButton2').attr('href', 'http://berlingske-poc.local:8084?returnUrl=' + window.location.origin + window.location.pathname);

  $('#aws-loginForm').show();
  $('#aws-logoutButton').hide();

  var awsAccessToken = getUrlVar('awsAccessToken');
  var awsIdToken = getUrlVar('awsIdToken');
  var awsRefreshToken = getUrlVar('awsRefreshToken');
  var currentUser = userPool.getCurrentUser();
  console.log('currentUser', currentUser);

  if (awsAccessToken){

    // createCookie('awsAccessToken', awsAccessToken, 30);
    // createCookie('awsIdToken', awsIdToken, 30);
    // createCookie('awsRefreshToken', awsRefreshToken, 30);
    loginAwsByQueryTokens(awsAccessToken, awsIdToken, awsRefreshToken, function (){

      var returnUrl = getUrlVar('returnUrl');
      if (returnUrl) {
        console.log('returnUrl returning', returnUrl);
        // window.location.href = decodeURI(returnUrl.concat('?awsAccessToken=', awsAccessToken, '&awsIdToken=', awsIdToken,  '&awsRefreshToken=', awsRefreshToken));
        window.location.href = decodeURI(returnUrl);
        return;
      }
    });

  } else if (currentUser != null) {

    currentUser.getSession(function(err, session) {
      if (err) {
        alert(err);
        return;
      }

      disableLoginControls();

      console.log('session', session);
      console.log('session validity: ' + session.isValid());

      var returnUrl = getUrlVar('returnUrl');
      if (returnUrl) {
        console.log('returnUrl returning', returnUrl);
        window.location.href = decodeURI(returnUrl);
        return;
      }

      /*Use the idToken for Logins Map when Federating User Pools with Cognito Identity or when passing through an Authorization Header to an API Gateway Authorizer*/
      // console.log('accessToken + ' + currentUser.signInUserSession.accessToken.jwtToken);
      // console.log('idToken + ' + currentUser.signInUserSession.idToken.jwtToken);
      // console.log('refreshToken + ' + currentUser.signInUserSession.refreshToken.token);

      // createCookie('awsAccessToken', currentUser.signInUserSession.accessToken.jwtToken, 30);
      // createCookie('awsIdToken', currentUser.signInUserSession.idToken.jwtToken, 30);

      setUserPoolIdentityToken(currentUser.signInUserSession.idToken.jwtToken);

      // Obtain AWS credentials
      AWS.config.credentials.get(function(){
        // Access AWS resources here.
        var accessKeyId = AWS.config.credentials.accessKeyId;
        var secretAccessKey = AWS.config.credentials.secretAccessKey;
        var sessionToken = AWS.config.credentials.sessionToken;
        var identityId = AWS.config.credentials.identityId;
        console.log('AWS.config.credentials User Pool', AWS.config.credentials);

        var p = {
          accessToken: currentUser.signInUserSession.accessToken.jwtToken,
          idToken: currentUser.signInUserSession.idToken.jwtToken,
          Logins: AWS.config.credentials.params.Logins
        };

        checkAwsPermissionsOnBackend(p);
      });

    });
  }
});

window.fbAsyncInit = function() {
  FB.getLoginStatus(function(response) {
     console.log('getFBLoginStatus', response);
     if (response.status === 'connected') {
        // Logged into your app and Facebook.
        // $('#aws-loginButtonFacebook').hide();
        FB.api('/me', function(response) {
          console.log('FB me', JSON.stringify(response));
        });
      } else if (response.status === 'not_authorized') {
        // The person is logged into Facebook, but not your app.
      } else {
        // The person is not logged into Facebook, so we're not sure if
        // they are logged into this app or not.
      }
  });
};



function awsFacebookLoginDone(response){
  console.log('awsFacebookLoginDone', response);

  setFacebookIdentityToken(response.authResponse.accessToken);
  // Add the Facebook access token to the Cognito credentials login map.

  // Obtain AWS credentials
  AWS.config.credentials.get(function(){
    // Access AWS resources here.
    var accessKeyId = AWS.config.credentials.accessKeyId;
    var secretAccessKey = AWS.config.credentials.secretAccessKey;
    var sessionToken = AWS.config.credentials.sessionToken;
    var identityId = AWS.config.credentials.identityId;
    console.log('AWS.config.credentials Facebook', AWS.config.credentials);

    var p = {
      accessToken: response.authResponse.accessToken,
      // idToken: currentUser.signInUserSession.idToken.jwtToken,
      Logins: AWS.config.credentials.params.Logins
    };

    checkAwsPermissionsOnBackend(p);
  });
}


function translateRsvp(rsvp, callback){

  if (callback !== undefined && typeof callback === 'function'){
    callback();
  }
}



function loginAwsByQueryTokens(awsAccessToken, awsIdToken, awsRefreshToken, callback){

  disableLoginControls();

  // createCookie('awsAccessToken', awsAccessToken, 30);
  // createCookie('awsIdToken', awsIdToken, 30);
  // createCookie('awsRefreshToken', awsRefreshToken, 30);
  console.log('awsAccessToken', awsAccessToken);
  console.log('awsIdToken', awsIdToken);
  console.log('awsRefreshToken', awsRefreshToken);

  const payload = awsAccessToken.split('.')[1];
  const expiration = JSON.parse(sjcl.codec.utf8String.fromBits(sjcl.codec.base64url.toBits(payload)));

  var cognitoAccessToken = new AWSCognito.CognitoIdentityServiceProvider.CognitoAccessToken({ AccessToken: awsAccessToken });
  var cognitoIdToken = new AWSCognito.CognitoIdentityServiceProvider.CognitoIdToken({ IdToken: awsIdToken });
  var cognitoRefreshToken = new AWSCognito.CognitoIdentityServiceProvider.CognitoRefreshToken({ RefreshToken : awsRefreshToken });
  var cognitoUserSession = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserSession({ IdToken: cognitoIdToken, RefreshToken: cognitoRefreshToken, AccessToken: cognitoAccessToken });
  console.log('cognitoUserSession is valid', cognitoUserSession.isValid());

  var userData = {
    Username : expiration.username,
    Pool : userPool
  };

  var cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);
  console.log('cognitoUser', cognitoUser);
  cognitoUser.signInUserSession = cognitoUserSession;
  cognitoUser.cacheTokens();
  console.log('cognitoUser2', cognitoUser);

  var currentUser = userPool.getCurrentUser();
  console.log('currentUser 2', currentUser);


  checkAwsPermissionsOnBackend(expiration.username, awsAccessToken, function(){
  });

  if (callback !== undefined && typeof callback === 'function'){
    callback();
  }
}


function loginAwsByUsernameAndPassword(e){
  e.preventDefault();

  var awsUsername = document.getElementById('aws-username').value;
  var awsPassword = document.getElementById('aws-password').value;
  var newPassword = '87654321';

  var userData = {
    Username : awsUsername,
    Pool : userPool
  };

  var cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);

  var authenticationData = {
    Username : awsUsername,
    Password : awsPassword
  };

  var authenticationDetails = new AWSCognito.CognitoIdentityServiceProvider.AuthenticationDetails(authenticationData);

  cognitoUser.authenticateUser(authenticationDetails, {
    onSuccess: function (result) {
      console.log('AWS authentication success', result);

      disableLoginControls();

      setUserPoolIdentityToken(result.idToken.jwtToken);

      AWS.config.credentials.get(function(){
        // Access AWS resources here.
        var accessKeyId = AWS.config.credentials.accessKeyId;
        var secretAccessKey = AWS.config.credentials.secretAccessKey;
        var sessionToken = AWS.config.credentials.sessionToken;
        var identityId = AWS.config.credentials.identityId;
        console.log('AWS.config.credentials User Pool', AWS.config.credentials);
      });

      createCookie('awsAccessToken', result.accessToken.jwtToken, 30);
      createCookie('awsIdToken', result.idToken.jwtToken, 30);
      createCookie('awsRefreshToken', result.refreshToken.token, 30);

      var returnUrl = getUrlVar('returnUrl');
      if (returnUrl) {
        console.log('returnUrl returning', returnUrl);
        // window.location.href = decodeURI(returnUrl.concat('?awsAccessToken=', result.accessToken.jwtToken, '&awsIdToken=', result.idToken.jwtToken, '&awsRefreshToken=', result.refreshToken.token));
        window.location.href = decodeURI(returnUrl);
        return;
      }


      checkAwsPermissionsOnBackend(awsUsername, result.idToken.jwtToken);
      // console.log('accessToken + ' + result.accessToken.jwtToken);
      /*Use the idToken for Logins Map when Federating User Pools with Cognito Identity or when passing through an Authorization Header to an API Gateway Authorizer*/
      // console.log('idToken + ' + result.idToken.jwtToken);
      // console.log('refreshToken + ' + result.refreshToken.token);
    },

    onFailure: function(err) {
      alert(err);
    },

    // mfaRequired: function(codeDeliveryDetails) {
    //   // MFA is required to complete user authentication.
    //   // Get the code from user and call
    //   cognitoUser.sendMFACode(mfaCode, this)
    // },

    newPasswordRequired: function(userAttributes, requiredAttributes) {
      // User was signed up by an admin and must provide new
      // password and required attributes, if any, to complete
      // authentication.

      // Get these details and call
      cognitoUser.completeNewPasswordChallenge(newPassword, {}, this)
    }
  });
}


function setFacebookIdentityToken(accessToken){
  AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: 'eu-west-1:2add6c33-59e3-4b5d-96d9-6285378c5922',
    RoleSessionName: 'web',
    Logins: {
      'graph.facebook.com': accessToken
    }
  });
}

function updateFacebookIdentityToken(accessToken){
  AWS.config.credentials.params.Logins['graph.facebook.com'] = accessToken;
  AWS.config.credentials.refresh(credentialsRefreshCallback);
}

function setUserPoolIdentityToken(idToken){
  AWS.config.credentials = new AWS.CognitoIdentityCredentials({
		IdentityPoolId: 'eu-west-1:2add6c33-59e3-4b5d-96d9-6285378c5922',
    RoleSessionName: 'web',
		Logins: {
			'cognito-idp.eu-west-1.amazonaws.com/eu-west-1_hS9hPyLgW': idToken
		}
	});
}

function updateUserPoolIdentityToken(idToken){
  AWS.config.credentials.params.Logins['cognito-idp.eu-west-1.amazonaws.com/eu-west-1_hS9hPyLgW'] = idToken;
  AWS.config.credentials.refresh(credentialsRefreshCallback);
}

function credentialsRefreshCallback(error){
  if (error) {
    console.error(error);
  } else {
    console.log('Successfully logged!');
  }
}

function checkAwsPermissionsOnBackend(payload, callback){

  // var payload = {
  //   username: awsUsername,
  //   // idToken: currentUser.signInUserSession.idToken.jwtToken,
  //   accessToken: awsAccessToken,
  //   // refreshToken: currentUser.signInUserSession.refreshToken.token,
  //   permissions: ['read:*']
  // };

  $.ajax({
    type: 'POST',
    url: '/cognito/permissions',
    contentType: "application/json; charset=utf-8",
    data: JSON.stringify(payload),
    xhrFields: {
      withCredentials: true
    },
    success: [
      function(data, status, jqXHR) {
        // console.log(data, status);
        $('#aws-currentuserpermissions').text('OK');
      },
      callback
    ],
    error: function(jqXHR, textStatus, err) {
      console.error(textStatus, err.toString());
    }
  });
}


function postToSso(callback){
  var payload = {
    id: 'Mickey',
    scope: 'read',
    secret: 'fakesecret'
  };

  $.ajax({
    type: 'POST',
    url: 'http://berlingske-poc.local:8084/cognito',
    contentType: "application/json; charset=utf-8",
    data: JSON.stringify(payload),
    xhrFields: {
      withCredentials: true
    },
    success: [
      function(data, status, jqXHR) {
        console.log(data, status);
        translateRsvp(data);
      },
      callback
    ],
    error: function(jqXHR, textStatus, err) {
      console.error(textStatus, err.toString());
    }
  });
}


function signoutAws(callback){
  var currentUser = userPool.getCurrentUser();

  var userData = {
    Username : currentUser.username,
    Pool : userPool
  };

  var cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);

  cognitoUser.signOut();
  eraseCookie('awsAccessToken');
  eraseCookie('awsIdToken');
  eraseCookie('awsRefreshToken');
  disableLogoutControls();

  if (callback !== undefined && typeof callback === 'function'){
    callback();
  }
}

function disableLoginControls(){
  var currentUser = userPool.getCurrentUser();
  $('#aws-currentuser').text(currentUser.username);
  $('#aws-loginForm').hide();
  $('#aws-loginButton2').hide();
  $('#aws-loginButton3').hide();
  $('#aws-loginButton4').hide();
  $('#aws-logoutButton').show();
}


function disableLogoutControls(){
  $('#aws-currentuser').text('');
  $('#aws-currentuserpermissions').text('');
  $('#aws-loginForm').show();
  $('#aws-loginButton2').show();
  $('#aws-loginButton3').show();
  $('#aws-loginButton4').show();
  $('#aws-logoutButton').hide();
}
