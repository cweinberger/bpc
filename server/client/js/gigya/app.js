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
      } else if (response.status === 'FAIL') {
        $('#gigya-logoutButton').hide();
      }
    }
  });
}

// Add the event handler
gigya.accounts.addEventHandlers({ onLogin: onLoginEventHandler});
gigya.accounts.addEventHandlers({ onLogout: onLogoutEventHandler});



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
