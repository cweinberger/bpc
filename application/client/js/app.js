$( document ).ready(function() {
  newUserTicket();
});

// $(document).on("click", "#loginDiv", function() {
//     gigya.accounts.showScreenSet({screenSet:'Default-RegistrationLogin'});
// });

// The function to run on the onLogin event
function onLoginEventHandler(response) {
  console.log('onLoginEventHandler', response);
  newUserTicket();
}

function onLogoutEventHandler(response){
  console.log('onLogoutEventHandler', response);
  $('#gigya-currentuser').text('');
  $('#gigya-currentuserpermissions').text('');
  $('#gigya-loginButton').show();
  $('#gigya-logoutButton').hide();
}



// Add the event handler
gigya.accounts.addEventHandlers({ onLogin: onLoginEventHandler});
gigya.accounts.addEventHandlers({ onLogout: onLogoutEventHandler});


function getUserTicket(rsvp, callback){
  $.ajax({
    type: 'POST',
    url: '/tickets',
    contentType: 'application/json; charset=utf-8',
    data: JSON.stringify({rsvp: rsvp}),
    success: [
      function(userTicket, status, jqXHR) {
        console.log('POST ticket sucess', userTicket, status);
      },
      callback
    ],
    error: function(jqXHR, textStatus, err) {
      console.error(textStatus, err.toString());
    }
  });
}


function newUserTicket(callback){
  gigya.accounts.getAccountInfo({
    callback: function(response){
      console.log('accounts.getAccountInfo', response);
      if (response.status === 'OK') {

        var ticket = readCookie('ticket');
        var rsvp = getUrlVar('rsvp');

        if (rsvp){
          getUserTicket(rsvp, function(){
            removeUrlVar('rsvp');
          });
        } else if(ticket){
          console.log('User has ticket!!!');
        } else {
          requestSso('GET', '/rsvp?app=test_sso_app&provider=gigya'.concat('&UID=', response.UID, '&UIDSignature=', response.UIDSignature, '&signatureTimestamp=', response.signatureTimestamp, '&email=', response.profile.email), {}, function(rsvp){
            console.log('RSVP', rsvp);
            getUserTicket(rsvp, function(ticket){
              removeUrlVar('rsvp');
            });
          });
        }

        $('#gigya-currentuser').text(response.profile.email);
        $('#gigya-loginButton').hide();
        $('#gigya-logoutButton').show();

      } else if (response.status === 'FAIL') {
        $('#gigya-logoutButton').hide();
      }
    }
  });
}

function refreshUserTicket(callback){
  $.ajax({
    type: 'GET',
    url: '/tickets',
    success: [
      function(data, status, jqXHR) {
        console.log('reissue', data, status);
      },
      callback
    ],
    error: function(jqXHR, textStatus, err) {
      console.log('Refresh user ticket failed');
      console.error(textStatus, err.toString());
      // deleteTicket();
    }
  });
}


function deleteUserTicket(callback){
  // This is not a global signout.
  $.ajax({
    type: 'DELETE',
    url: '/tickets',
    success: [
      function(data, status, jqXHR) {
        console.log('DELETE ticket sucess', data, status);
        location.reload();
      },
      callback
    ],
    error: function(jqXHR, textStatus, err) {
      console.error(textStatus, err.toString());
    }
  });
}


function getResources(callback){
  var resource = $('#public-resource');
  resource.text('');
  $.ajax({
    type: 'GET',
    url: '/resources',
    contentType: 'application/json; charset=utf-8',
    success: [
      function(data, status, jqXHR) {
        console.log('getResources', data, status);
        resource.text(data.message);
      },
      callback
    ],
    error: function(jqXHR, textStatus, err) {
      console.error(textStatus, err.toString());
    }
  });
}


function getProtectedResource(callback){
  var protectedResource = $('#protected-resource');
  protectedResource.text('');
  $.ajax({
    type: 'GET',
    url: '/resources/protected',
    contentType: 'application/json; charset=utf-8',
    // data: JSON.stringify(userTicket),
    success: [
      function(data, status, jqXHR) {
        console.log('getProtectedResource', data, status);
        protectedResource.text(data.message);
      },
      callback
    ],
    error: function(jqXHR, textStatus, err) {
      console.error(textStatus, err.toString());
      protectedResource.text('Ingen adgang');
    }
  });
}


function requestSso(type, path, payload, callback){
  if (callback === undefined && typeof path === 'function'){
    callback = path;
    path = '';
  }

  if (path === '/'){
    path = '';
  }

  $.ajax({
    type: type,
    url: 'http://localhost:8085'.concat(path),
    contentType: 'application/json; charset=utf-8',
    data: ['POST', 'PUT'].indexOf(type) > -1 && payload !== null ? JSON.stringify(payload) : null,
    xhrFields: {
      withCredentials: true
    },
    success: [
      callback
    ],
    error: function(jqXHR, textStatus, err) {
      console.error(textStatus, err.toString());
    }
  });
}
