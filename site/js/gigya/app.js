
$( document ).ready(function() {
    getGigyaAccountInfo();
});


// $(document).on("click", "#loginDiv", function() {
//     gigya.accounts.showScreenSet({screenSet:'Default-RegistrationLogin'});
// });

// The function to run on the onLogin event
function onLoginEventHandler(response) {
  console.log('onLoginEventHandler', response);

  getGigyaAccountInfo();
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

        var payload = {
          UID: response.UID,
          UIDSignature: response.UIDSignature,
          signatureTimestamp: response.signatureTimestamp,
          permissions: ['read:*']
        };

        checkGigyaPermissionsOnBackend(payload);

      } else if (response.status === 'FAIL') {
        $('#gigya-logoutButton').hide();
      }
    }
  });
}

// Add the event handler
gigya.accounts.addEventHandlers({ onLogin: onLoginEventHandler});
gigya.accounts.addEventHandlers({ onLogout: onLogoutEventHandler});


function checkGigyaPermissionsOnBackend(payload, callback){
  $.ajax({
    type: 'POST',
    url: '/gigya',
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


function gigyaFacebookLoginDone(response){
  console.log('gigyaFacebookLoginDone', response);
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
