$( document ).ready(function() {
    getGigyaAccountInfo();
});

gigya.accounts.addEventHandlers({ onLogin: onLoginEventHandler});
gigya.accounts.addEventHandlers({ onLogout: onLogoutEventHandler});

function onLoginEventHandler(response) {
  console.log('onLoginEventHandler', response);
  getGigyaAccountInfo();
}

function onLogoutEventHandler(response){
  console.log('onLogoutEventHandler', response);
  $('#gigya-currentuser').text('');
  $('#gigya-currentuserpermissions').text('');
  $('#gigya-loginButton').show();
  $('#gigya-logoutButton').hide();
}

function getGigyaAccountInfo(){
  gigya.accounts.getAccountInfo({
    callback: function(response){
      console.log('accounts.getAccountInfo', response);
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
