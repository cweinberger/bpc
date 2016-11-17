
  // AWSCognito
  // AmazonCognitoIdentity

$( document ).ready(function() {
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

      $('#aws-currentuser').text(currentUser.username);
      $('#aws-loginForm').hide();
      $('#aws-logoutButton').show();
      checkAwsPermissionsOnBackend(currentUser.username, currentUser.signInUserSession.accessToken.jwtToken, function(){
      });
    });
  } else {
    $('#aws-loginForm').show();
    $('#aws-logoutButton').hide();
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
      console.log('AWS authentication success');
      $('#aws-currentuser').text(awsUsername);
      $('#aws-loginForm').hide();
      $('#aws-logoutButton').show();
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


function checkAwsPermissionsOnBackend(username, accessToken, callback){

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

  $('#aws-currentuser').text('');
  $('#aws-currentuserpermissions').text('');

  $('#aws-loginForm').show();
  $('#aws-logoutButton').hide();

  if (callback !== undefined && typeof callback === 'function'){
    callback();
  }
}
