
  // AWSCognito
  // AmazonCognitoIdentity

$( document ).ready(function() {

  $('#aws-loginForm').show();
  $('#aws-logoutButton').hide();

  var awsAccessToken = getUrlVar('awsAccessToken');
  var awsIdToken = getUrlVar('awsIdToken');
  var currentUser = userPool.getCurrentUser();
  console.log('currentUser', currentUser);


  if (awsAccessToken){

    createCookie('awsAccessToken', awsAccessToken, 30);
    createCookie('awsIdToken', awsIdToken, 30);
    loginAwsByAccessToken(awsAccessToken, awsIdToken);

  } else if (currentUser != null) {

    currentUser.getSession(function(err, session) {
      if (err) {
        alert(err);
        return;
      }
      console.log('session', session);
      console.log('session validity: ' + session.isValid());

      var returnUrl = getUrlVar('returnUrl');
      if (returnUrl) {
        console.log('returnUrl returning', returnUrl);
        window.location.href = decodeURI(returnUrl.concat('?awsAccessToken=', currentUser.signInUserSession.accessToken.jwtToken, '&awsIdToken=', currentUser.signInUserSession.idToken.jwtToken));
        return;
      }

      /*Use the idToken for Logins Map when Federating User Pools with Cognito Identity or when passing through an Authorization Header to an API Gateway Authorizer*/
      // console.log('accessToken + ' + currentUser.signInUserSession.accessToken.jwtToken);
      // console.log('idToken + ' + currentUser.signInUserSession.idToken.jwtToken);
      // console.log('refreshToken + ' + currentUser.signInUserSession.refreshToken.token);

      createCookie('awsAccessToken', currentUser.signInUserSession.accessToken.jwtToken, 30);
      createCookie('awsIdToken', currentUser.signInUserSession.idToken.jwtToken, 30);

      disableLoginControls();
      // $('#aws-currentuser').text(currentUser.username);
      // $('#aws-loginForm').hide();
      // $('#aws-loginButton2').hide();
      // $('#aws-loginButton3').hide();
      // $('#aws-logoutButton').show();
      checkAwsPermissionsOnBackend(currentUser.username, currentUser.signInUserSession.accessToken.jwtToken, function(){
      });
    });
  }
});

var poolData = {
  UserPoolId : 'eu-west-1_hS9hPyLgW',
  ClientId : '5tv5te4df577992koo6mo7t6me',
  Paranoia : 7
};

var userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(poolData);

function gotoSso1(){
  window.location.href = 'http://berlingske-poc.local:8084?returnUrl=' + window.location.origin + '/' + window.location.pathname;
}

function gotoSso2(){
  window.location.href = 'http://berlingske-poc.local:8084/cognito?returnUrl=' + window.location.origin + '/' + window.location.pathname;
}

function disableLoginControls(){
  var currentUser = userPool.getCurrentUser();
  $('#aws-currentuser').text(currentUser.username);
  $('#aws-loginForm').hide();
  $('#aws-loginButton2').hide();
  $('#aws-loginButton3').hide();
  $('#aws-logoutButton').show();
}

function disableLogoutControls(){
  $('#aws-currentuser').text('');
  $('#aws-currentuserpermissions').text('');
  $('#aws-loginForm').show();
  $('#aws-loginButton2').show();
  $('#aws-loginButton3').show();
  $('#aws-logoutButton').hide();
}

function loginAwsByAccessToken(awsAccessToken, awsIdToken){

  createCookie('awsAccessToken', awsAccessToken, 30);
  createCookie('awsIdToken', awsIdToken, 30);
  console.log('awsAccessToken', awsAccessToken);
  console.log('awsIdToken', awsIdToken);

  const payload = awsAccessToken.split('.')[1];
  const expiration = JSON.parse(sjcl.codec.utf8String.fromBits(sjcl.codec.base64url.toBits(payload)));

  var cognitoAccessToken = new AWSCognito.CognitoIdentityServiceProvider.CognitoAccessToken({ AccessToken: awsAccessToken });
  var cognitoIdToken = new AWSCognito.CognitoIdentityServiceProvider.CognitoIdToken({ IdToken: awsIdToken });
  var cognitoRefreshToken = new AWSCognito.CognitoIdentityServiceProvider.CognitoRefreshToken({ RefreshToken : '' });
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

  disableLoginControls();

  checkAwsPermissionsOnBackend(expiration.username, awsAccessToken, function(){
  });
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
      console.log('AWS authentication success');

      var returnUrl = getUrlVar('returnUrl');
      if (returnUrl) {
        console.log('returnUrl returning', returnUrl);
        window.location.href = decodeURI(returnUrl.concat('?awsAccessToken=', result.accessToken.jwtToken, '&awsIdToken=', result.idToken.jwtToken));
        return;
      }

      disableLoginControls();
      // $('#aws-currentuser').text(awsUsername);
      // $('#aws-loginForm').hide();
      // $('#aws-loginButton2').hide();
      // $('#aws-loginButton3').hide();
      // $('#aws-logoutButton').show();

      createCookie('awsAccessToken', result.accessToken.jwtToken, 30);
      createCookie('awsIdToken', result.idToken.jwtToken, 30);
      console.log('awsAccessToken + ' + result.accessToken.jwtToken);

      checkAwsPermissionsOnBackend(awsUsername, result.accessToken.jwtToken);
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


function checkAwsPermissionsOnBackend(awsUsername, awsAccessToken, callback){

  var payload = {
    username: awsUsername,
    // idToken: currentUser.signInUserSession.idToken.jwtToken,
    accessToken: awsAccessToken,
    // refreshToken: currentUser.signInUserSession.refreshToken.token,
    permissions: ['read:*']
  };

  $.ajax({
    type: 'POST',
    url: '/cognito/permissions',
    data: JSON.stringify(payload),
    contentType: "application/json; charset=utf-8",
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


function signoutAws(callback){
  var currentUser = userPool.getCurrentUser();

  var userData = {
    Username : currentUser.username,
    Pool : userPool
  };

  var cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);

  cognitoUser.signOut();
  disableLogoutControls();
  // $('#aws-currentuser').text('');
  // $('#aws-currentuserpermissions').text('');
  //
  // $('#aws-loginForm').show();
  // $('#aws-loginButton2').show();
  // $('#aws-loginButton3').show();
  // $('#aws-logoutButton').hide();

  if (callback !== undefined && typeof callback === 'function'){
    callback();
  }
}
