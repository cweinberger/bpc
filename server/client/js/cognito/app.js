$(document).ready(cognitoLoginInit);

window.fbAsyncInit = facebookLoginInit;

$(document).ready(function() {
  $('#aws-logoutButton').hide();

  var returnUrl = getUrlVar('returnUrl');

  if (returnUrl){
    // TODO
  }
});


// AWSCognito
// AmazonCognitoIdentity
AWS.config.region = 'eu-west-1';
// AWS.config.credentials = new AWS.CognitoIdentityCredentials({
//   IdentityPoolId: 'eu-west-1:2add6c33-59e3-4b5d-96d9-6285378c5922',
// });

var poolData = {
  UserPoolId : 'eu-west-1_hS9hPyLgW',
  ClientId : '5tv5te4df577992koo6mo7t6me',
  Paranoia : 7
};

var userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(poolData);

var appTicket;
var app = {
  id: 'sso_client',
  key: 'gk32fh4k4h42fk4hfsdk2ljd98djjllu',
  algorithm: 'sha256'
};

callSsoServer('POST', '/oz/app', {}, app, function(data, status, jqXHR) {
  console.log('getAppTicket result', data);
  appTicket = data;
});


function callSsoServer(type, path, data, credentials, callback){
  var url = 'http://berlingske-poc.local:8084'.concat(path)
  $.ajax({
    type: type,
    url: url,
    contentType: "application/json; charset=utf-8",
    data: JSON.stringify(data),
    headers: {
      'Authorization': hawk.client.header(url, type, {credentials: credentials, app: 'sso_client'}).field
    },
    success: callback,
    error: function(jqXHR, textStatus, err) {
      console.error(textStatus, err.toString());
    }
  });
}


function cognitoLoginInit(){
  var currentUser = userPool.getCurrentUser();
  if (currentUser != null) {
    console.log('currentUser', currentUser);
    $('#aws-currentuser').text(currentUser.username);

    currentUser.getSession(function(err, session) {
      if (err) {
        console.error(err);
        return;
      }

      console.log('AWS session', session);
      console.log('AWS session validity: ' + session.isValid());

      setUserPoolIdentityToken(currentUser.signInUserSession.idToken.jwtToken, function(){
      });
    });
  }
}


function facebookLoginInit(){
  FB.getLoginStatus(function(response) {
     console.log('getFBLoginStatus', response);
     if (response.status === 'connected') {

       setFacebookIdentityToken(response.authResponse.accessToken, function(){
       });

        // Logged into your app and Facebook.
        // $('#aws-loginButtonFacebook').hide();
        FB.api('/me', function(response) {
          console.log('FB me', JSON.stringify(response));
          $('#aws-currentuser').text(response.name);
        });
      } else if (response.status === 'not_authorized') {
        // The person is logged into Facebook, but not your app.
      } else {
        // The person is not logged into Facebook, so we're not sure if
        // they are logged into this app or not.
      }
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
      console.log('Cognito authentication success', result);

      $('#aws-currentuser').text(awsUsername);

      setUserPoolIdentityToken(result.idToken.jwtToken, function(){
      });
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


function awsFacebookLoginDone(response){
  console.log('awsFacebookLoginDone', response);

  FB.api('/me', function(response) {
    $('#aws-currentuser').text(response.name);
  });

  // Add the Facebook access token to the Cognito credentials login map.
  setFacebookIdentityToken(response.authResponse.accessToken, function(){
  });
}


function setIdentityLogins(logins, callback){
  // if (AWS.config.credentials === null){
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
      IdentityPoolId: 'eu-west-1:2add6c33-59e3-4b5d-96d9-6285378c5922',
      // RoleSessionName: 'web',
      Logins: logins
    });
    AWS.config.credentials.get(credentialsGetCallback(callback));
  // }
}


function setFacebookIdentityToken(accessToken, callback){
  // if (AWS.config.credentials === null){
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
      IdentityPoolId: 'eu-west-1:2add6c33-59e3-4b5d-96d9-6285378c5922',
      // RoleSessionName: 'web',
      Logins: {
        'graph.facebook.com': accessToken
      }
    });
    AWS.config.credentials.get(credentialsGetCallback(callback));
  // }
}


function updateFacebookIdentityToken(accessToken){
  AWS.config.credentials.params.Logins['graph.facebook.com'] = accessToken;
  AWS.config.credentials.refresh(credentialsRefreshCallback);
}


function setUserPoolIdentityToken(idToken, callback){
  // if (AWS.config.credentials === null){
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
      IdentityPoolId: 'eu-west-1:2add6c33-59e3-4b5d-96d9-6285378c5922',
      // RoleSessionName: 'web',
      Logins: {
        'cognito-idp.eu-west-1.amazonaws.com/eu-west-1_hS9hPyLgW': idToken
      }
    });
    AWS.config.credentials.get(credentialsGetCallback(callback));
  // }
}


function updateUserPoolIdentityToken(idToken){
  AWS.config.credentials.params.Logins['cognito-idp.eu-west-1.amazonaws.com/eu-west-1_hS9hPyLgW'] = idToken;
  AWS.config.credentials.refresh(credentialsRefreshCallback);
}


function credentialsGetCallback(callback){
  return function(error){
    if (error) {
      console.error(error);
    } else {
      console.log('AWS.config.credentials credentialsGetCallback', AWS.config.credentials);


      disableLoginControls();

      var payload = {
        Logins: AWS.config.credentials.params.Logins
      };

      $.ajax({
        type: 'POST',
        url: '/cognito/signin',
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify(payload),
        success: [
          function(data, status, jqXHR) {
            var returnUrl = getUrlVar('returnUrl');
            var app = getUrlVar('app');
            if (returnUrl && app){
              // Redirection to main page to generate rsvp and from there return to returnUrl
              window.location = '/cognito'.concat(window.location.search);
            } else if(returnUrl){
              window.location.href = decodeURIComponent(returnUrl);
            }
          },
          callback
        ],
        error: function(jqXHR, textStatus, err) {
          console.error(textStatus, err.toString());
        }
      });
    }
  }
}



function credentialsRefreshCallback(error){
  if (error) {
    console.error(error);
  } else {
    console.log('Successfully logged!');
  }
}



function signout(){
  $.ajax({
    type: 'POST',
    url: '/cognito/signout',
    contentType: "application/json; charset=utf-8",
    success: [
      function(data, status, jqXHR) {
        console.log('signout success');
        signoutFacebook();
        signoutCognito();
        disableLogoutControls();
      }
    ],
    error: function(jqXHR, textStatus, err) {
      console.error(textStatus, err.toString());
    }
  });
}


function signoutFacebook(callback){
  FB.logout(function(response){
    console.log('FB.logout', response);

    if (callback !== undefined && typeof callback === 'function'){
      callback(response);
    }
  });
}


function signoutCognito(callback){
  var currentUser = userPool.getCurrentUser();

  if(currentUser === null){
    return;
  }

  var userData = {
    Username : currentUser.username,
    Pool : userPool
  };

  var cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);

  cognitoUser.signOut();

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
  $('#aws-logoutButtonFacebook').hide();
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
  $('#aws-logoutButtonFacebook').show();
}
