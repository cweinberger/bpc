
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
  // $('#aws-loginForm').show();
  // $('#aws-logoutButton').hide();
  checkLoggedinUser();
});


function checkLoggedinUser(){

  console.log('AWS.config.credentials', AWS.config.credentials);

  if (AWS.config.credentials.params.IdentityId){

    disableLoginControls();

    $('#aws-currentuser').text(AWS.config.credentials.params.IdentityId);

    // Obtain AWS credentials
    AWS.config.credentials.get(function(){
      // Access AWS resources here.
      var accessKeyId = AWS.config.credentials.accessKeyId;
      var secretAccessKey = AWS.config.credentials.secretAccessKey;
      var sessionToken = AWS.config.credentials.sessionToken;
      var identityId = AWS.config.credentials.identityId;
      console.log('AWS.config.credentials User Pool', AWS.config.credentials);

      // var p = {
      //   accessToken: currentUser.signInUserSession.accessToken.jwtToken,
      //   idToken: currentUser.signInUserSession.idToken.jwtToken,
      //   Logins: AWS.config.credentials.params.Logins
      // };
      //
      // checkAwsPermissionsOnBackend(p);
    });
  } else {
    disableLogoutControls();
  }
}

var currentUser = userPool.getCurrentUser();
if (currentUser != null) {
  console.log('currentUser', currentUser);

  currentUser.getSession(function(err, session) {
    if (err) {
      alert(err);
      return;
    }

    console.log('AWS session', session);
    console.log('AWS session validity: ' + session.isValid());
  });
}

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
  // Add the Facebook access token to the Cognito credentials login map.
  setFacebookIdentityToken(response.authResponse.accessToken);
  disableLoginControls();
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
      setUserPoolIdentityToken(result.idToken.jwtToken);
      disableLoginControls();
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
  $.ajax({
    type: 'POST',
    url: '/cognito',
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




function signoutAws(callback){
  var currentUser = userPool.getCurrentUser();

  var userData = {
    Username : currentUser.username,
    Pool : userPool
  };

  var cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);

  cognitoUser.signOut();

  disableLogoutControls();

  if (callback !== undefined && typeof callback === 'function'){
    callback();
  }
}

function disableLoginControls(){
  $('#aws-loginForm').hide();
  $('#aws-loginButton2').hide();
  $('#aws-loginButton3').hide();
  $('#aws-loginButton4').hide();
  $('#aws-logoutButton').show();
  $('#aws-loginButtonFacebook').hide();
}


function disableLogoutControls(){
  $('#aws-currentuser').text('');
  $('#aws-currentuserpermissions').text('');
  $('#aws-loginForm').show();
  $('#aws-loginButton2').show();
  $('#aws-loginButton3').show();
  $('#aws-loginButton4').show();
  $('#aws-logoutButton').hide();
  $('#aws-loginButtonFacebook').show();
}
