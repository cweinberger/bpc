$( document ).ready(function() {
    console.log( "ready!" );
    getGigyaAccountInfo();
});


// $(document).on("click", "#loginDiv", function() {
//     gigya.accounts.showScreenSet({screenSet:'Default-RegistrationLogin'});
// });

// The function to run on the onLogin event
function onLoginEventHandler(response) {
  console.log('onLoginEventHandler', response);

  getGigyaAccountInfo();
  checkGigyaPermissionsOnBackend(response.UID, response.UIDSignature, response.signatureTimestamp);

}

function onLogoutEventHandler(response){
  console.log('onLogoutEventHandler', response);
}


function getGigyaAccountInfo(){
  gigya.accounts.getAccountInfo({
    callback: function(response){
      console.log('getAccountInfo', response);
      if (response.status === 'OK') {
        $('#gigya-currentuser').text(response.profile.email);
        $('#gigya-loginButton').hide();
        $('#gigya-logoutButton').show();
        checkGigyaPermissionsOnBackend(response.UID, response.UIDSignature, response.signatureTimestamp);
      } else if (response.status === 'FAIL') {
        $('#gigya-logoutButton').hide();
      }
    }
  });
}

// Add the event handler
gigya.accounts.addEventHandlers({ onLogin: onLoginEventHandler});
gigya.accounts.addEventHandlers({ onLogout: onLogoutEventHandler});


function checkGigyaPermissionsOnBackend(UID, UIDSignature, signatureTimestamp, callback){
  var payload = {
    UID: UID,
    UIDSignature: UIDSignature,
    signatureTimestamp: signatureTimestamp,
    permissions: ['read:*']
  };

  $.ajax({
    type: 'POST',
    url: '/gigya/permissions',
    data: JSON.stringify(payload),
    contentType: "application/json; charset=utf-8",
    success: [
      function(data, status, jqXHR) {
        console.log('permissions response: ', data);
        $('#gigya-currentuserpermissions').text('OK');
      },
      callback
    ],
    error: function(jqXHR, textStatus, err) {
      console.error(textStatus, err.toString());
    }
  });
}


function logoutGigya(){
  gigya.accounts.logout({
    callback: function(data){
      console.log('logout', data);
      $('#gigya-currentuser').text('');
      $('#gigya-currentuserpermissions').text('');
      $('#gigya-loginButton').show();
      $('#gigya-logoutButton').hide();
    }
  });
}
