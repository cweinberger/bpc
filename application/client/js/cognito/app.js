


$(document).ready(function() {

  $('#aws-loginButton2').attr('href', 'http://berlingske-poc.local:8084/cognito.html?returnUrl=' + window.location.origin + window.location.pathname + '&app=test_sso_app');
  $('#aws-loginButton3').attr('href', 'http://berlingske-poc.local:8084/cognito?returnUrl=' + window.location.origin + window.location.pathname + '&app=test_sso_app');

  var rsvp = getUrlVar('rsvp');

  if (rsvp){
    loginUsingRsvp(rsvp, function(){
      removeUrlVar('rsvp');
    });
  }
});



function checkPermissionsOnBackend(payload, callback){

  // var payload = {
  //   username: awsUsername,
  //   // idToken: currentUser.signInUserSession.idToken.jwtToken,
  //   accessToken: awsAccessToken,
  //   // refreshToken: currentUser.signInUserSession.refreshToken.token,
  //   permissions: ['read:*']
  // };

  $.ajax({
    type: 'POST',
    url: 'http://berlingske-poc.local:8084/cognito/permissions',
    contentType: 'application/json; charset=utf-8',
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


function loginPost(){
  postToSso('/auth', {});
}


function logoutPost(){
  postToSso('/signout', {});
}


function tokenSignin(callback){
  postToSso('', {app: 'test_sso_app'}, function(rsvp, status, jqXHR){
    console.log('tokensignin', rsvp);

    loginUsingRsvp(rsvp, callback);
  });
}


function loginUsingRsvp(rsvp, callback){
  $.ajax({
    type: 'POST',
    url: '/login',
    contentType: 'application/json; charset=utf-8',
    data: JSON.stringify({rsvp: rsvp}),
    success: [
      function(userTicket, status, jqXHR) {
        console.log('/login sucess', userTicket, status);
      },
      callback
    ],
    error: function(jqXHR, textStatus, err) {
      console.error(textStatus, err.toString());
    }
  });
}


function getProfile(){
  $.ajax({
    type: 'GET',
    url: 'http://berlingske-poc.local:8084/cognito/profile',
    // url: 'http://127.0.0.1:8084/cognito'.concat(path),
    contentType: 'application/json; charset=utf-8',
    xhrFields: {
      withCredentials: true
    },
    success: [
      function(data, status, jqXHR) {
        console.log(data, status);
      }
    ],
    error: function(jqXHR, textStatus, err) {
      console.error(textStatus, err.toString());
    }
  });
}

function getUserProfile(){
  $.ajax({
    type: 'GET',
    url: '/login/userprofile',
    success: [
      function(data, status, jqXHR) {
        console.log(data, status);
      }
    ],
    error: function(jqXHR, textStatus, err) {
      console.error(textStatus, err.toString());
    }
  });
}


function getPermissionsPost(){
  var accessKeyId = readCookie('aws_accessKeyId');
  var secretKey = readCookie('aws_secretKey');
  var sessionToken = readCookie('aws_sessionToken');
  var identityId = readCookie('aws_identityId');
  var payload = {
    identityId: identityId,
    accessKeyId: accessKeyId,
    secretKey: secretKey,
    sessionToken: sessionToken,
    id: 'Mickey',
    scope: 'read',
    secret: 'fakesecret'
  };
  postToSso('/permissions', payload, function(data, status, jqXHR){

  });
}


function postToSso(path, payload, callback){
  if (callback === undefined && typeof path === 'function'){
    callback = path;
    path = '';
  }

  $.ajax({
    type: 'POST',
    url: 'http://berlingske-poc.local:8084/cognito'.concat(path),
    // url: 'http://127.0.0.1:8084/cognito'.concat(path),
    contentType: 'application/json; charset=utf-8',
    data: JSON.stringify(payload),
    xhrFields: {
      withCredentials: true
    },
    success: [
      function(data, status, jqXHR) {
        console.log(path, data, status);
        if (data.IdentityId){
          $('#aws-currentuser').text(data.IdentityId)
          createCookie('aws_identityId', data.IdentityId)
        }
        if (data.identityId){
          $('#aws-currentuser').text(data.identityId)
          createCookie('aws_identityId', data.identityId)
        }
        if (data.Permissions){
          $('#aws-currentuserpermissions').text(data.Permissions)
        }
        if(data.sessionToken){
          createCookie('aws_accessKeyId', data.data.Credentials.AccessKeyId)
          createCookie('aws_secretKey', data.data.Credentials.SecretKey)
          createCookie('aws_sessionToken', data.sessionToken)
        }
      },
      callback
    ],
    error: function(jqXHR, textStatus, err) {
      console.error(textStatus, err.toString());
    }
  });
}


function getResources(callback){
  $.ajax({
    type: 'GET',
    url: '/resources',
    contentType: 'application/json; charset=utf-8',
    success: [
      function(data, status, jqXHR) {
        console.log('getResources', data, status);
      },
      callback
    ],
    error: function(jqXHR, textStatus, err) {
      console.error(textStatus, err.toString());
    }
  });
}


function getProtectedResource(callback){
  $.ajax({
    type: 'GET',
    url: '/resources/userp',
    contentType: 'application/json; charset=utf-8',
    // data: JSON.stringify(userTicket),
    success: [
      function(data, status, jqXHR) {
        console.log('getProtectedResource', data, status);
        $('#aws-userp').text(data.message);
      },
      callback
    ],
    error: function(jqXHR, textStatus, err) {
      console.error(textStatus, err.toString());
    }
  });
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
