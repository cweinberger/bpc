


$(document).ready(function() {

  $('#aws-loginButton2').attr('href', 'http://berlingske-poc.local:8084/cognito.html?returnUrl=' + window.location.origin + window.location.pathname);
  $('#aws-loginButton3').attr('href', 'http://berlingske-poc.local:8084/cognito?returnUrl=' + window.location.origin + window.location.pathname);

  var awsAccessToken = getUrlVar('awsAccessToken');
  var awsIdToken = getUrlVar('awsIdToken');
  var awsRefreshToken = getUrlVar('awsRefreshToken');

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
    url: 'http://berlingske-poc.local:8084/cognito/permissions',
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
