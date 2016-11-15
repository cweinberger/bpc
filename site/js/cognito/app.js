
  // AWSCognito
  // AmazonCognitoIdentity

$( document ).ready(function() {
    console.log( "ready!" );
    loginAws();
});

var poolData = {
  UserPoolId : 'eu-west-1_hS9hPyLgW',
  ClientId : '5tv5te4df577992koo6mo7t6me',
  Paranoia : 7
};

var userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(poolData);


function loginAws(){
  var currentUser = userPool.getCurrentUser();
  console.log('currentUser', currentUser);

  if (currentUser != null) {
    currentUser.getSession(function(err, session) {
      if (err) {
        alert(err);
        return;
      }
      console.log('session', session);
      console.log('session validity: ' + session.isValid());

      /*Use the idToken for Logins Map when Federating User Pools with Cognito Identity or when passing through an Authorization Header to an API Gateway Authorizer*/
      console.log('accessToken + ' + currentUser.signInUserSession.accessToken.jwtToken);
      console.log('idToken + ' + currentUser.signInUserSession.idToken.jwtToken);
      console.log('refreshToken + ' + currentUser.signInUserSession.refreshToken.token);

      $('#aws-currentuser').html('<p>Username: ' + currentUser.username + '</p>');
      checkPermissionsOnBackend(currentUser.username, currentUser.signInUserSession.accessToken.jwtToken, function(){
      });
    });
  } else {
    var awsLoginForm = document.getElementById('aws-login-form');
  }
}


function loginAwsByUsernameAndPassword(){

  var awsUsername = document.getElementById('aws-username').value;
  var awsPassword = document.getElementById('aws-password').value;
  awsUsername = 'dako';
  awsPassword = '87654321';
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
      $('#aws-currentuser').html('<p>Username: ' + awsUsername + '</p>');
      checkPermissionsOnBackend(awsUsername, result.accessToken.jwtToken);
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


function checkPermissionsOnBackend(username, accessToken, callback){

  var payload = {
    username: username,
    // idToken: currentUser.signInUserSession.idToken.jwtToken,
    accessToken: accessToken,
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
        $('#aws-currentuserpermissions').html('<p>Permissions OK</p>');
      },
      callback
    ],
    error: function(jqXHR, textStatus, err) {
      console.error(textStatus, err.toString());
    }
  });

  // $.ajax({
  //     url: '/permissions',
  //     dataType: 'json',
  //     cache: true,
  //     success: [
  //       function(xhr, status, err) {
  //         console.error(xhr, status, err.toString());
  //       }
  //     ],
  //     error: function(xhr, status, err) {
  //       console.error(xhr, status, err.toString());
  //     }
  //   });
}


function signoutAws(callback){
  var currentUser = userPool.getCurrentUser();

  var userData = {
    Username : currentUser.username,
    Pool : userPool
  };

  var cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);

  cognitoUser.signOut();

  $('#aws-currentuser').html('<p>Username: </p>');
  $('#aws-currentuserpermissions').html('<p></p>');

  if (callback !== undefined && typeof callback === 'function'){
    callback();
  }
}
