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

// Add the event handler
gigya.accounts.addEventHandlers({ onLogin: onLoginEventHandler});
gigya.accounts.addEventHandlers({ onLogout: onLogoutEventHandler});


function tl(){
  gigya.accounts.getAccountInfo({
      callback: function(response){
      console.log('getAccountInfo', response);
      var data = {
        UID: response.UID,
        UIDSignature: response.UIDSignature,
        signatureTimestamp: response.signatureTimestamp
      };

      $.ajax({
        type: 'POST',
        url: '/gigya',
        contentType: 'application/json; charset=utf-8',
        data: JSON.stringify(data),
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
  });
}


function ti(){
  $.ajax({
    type: 'GET',
    url: '/gigya',
    contentType: 'application/json; charset=utf-8',
    data: JSON.stringify({}),
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
