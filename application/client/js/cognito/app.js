


$(document).ready(function() {

  $('.aws-loginButton').attr('href', 'http://berlingske-poc.local:8084/cognito_login.html?returnUrl=' + window.location.origin + window.location.pathname + '&app=test_sso_app');
  // $('#aws-loginButton3').attr('href', 'http://berlingske-poc.local:8084/cognito?returnUrl=' + window.location.origin + window.location.pathname + '&app=test_sso_app');

  var ticket = readCookie('ticket');
  var rsvp = getUrlVar('rsvp');

  if (rsvp){
    getUserTicket(rsvp, function(){
      removeUrlVar('rsvp');
    });
  } else if(ticket){
    $('#aws-status').text('Du er logget ind');
  }
});


function deleteCookie(callback){
  // This is not a global signout.
  $.ajax({
    type: 'DELETE',
    url: '/ticket',
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


function getUserTicket(rsvp, callback){
  $.ajax({
    type: 'POST',
    url: '/ticket',
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


function validateUserTicket(callback){
  $.ajax({
    type: 'GET',
    url: '/ticket/validateuserticket',
    success: [
      function(data, status, jqXHR) {
        console.log('/validateuserticket', data, status);
      },
      callback
    ],
    error: function(jqXHR, textStatus, err) {
      console.error(textStatus, err.toString());
    }
  });
}



function getUserProfile(callback){
  $('#aws-currentuser').text('');
  $.ajax({
    type: 'GET',
    url: '/ticket/userprofile',
    success: [
      function(data, status, jqXHR) {
        console.log(data, status);
        if (data.name){
          $('#aws-currentuser').text(data.name);
        } else if(data['cognito:username']) {
          $('#aws-currentuser').text(data['cognito:username']);
        }
      },
      callback
    ],
    error: function(jqXHR, textStatus, err) {
      console.error(textStatus, err.toString());
    }
  });
}



// function postToSso(path, payload, callback){
//   if (callback === undefined && typeof path === 'function'){
//     callback = path;
//     path = '';
//   }
//   if (path === '/'){
//     path = '';
//   }
//
//   $.ajax({
//     type: 'POST',
//     url: 'http://berlingske-poc.local:8084/cognito'.concat(path),
//     // url: 'http://127.0.0.1:8084/cognito'.concat(path),
//     contentType: 'application/json; charset=utf-8',
//     data: JSON.stringify(payload),
//     xhrFields: {
//       withCredentials: true
//     },
//     success: [
//       function(data, status, jqXHR) {
//         if (data.IdentityId){
//           $('#aws-currentuser').text(data.IdentityId)
//         }
//         if (data.identityId){
//           $('#aws-currentuser').text(data.identityId)
//         }
//         if (data.Permissions){
//           $('#aws-currentuserpermissions').text(data.Permissions)
//         }
//       },
//       callback
//     ],
//     error: function(jqXHR, textStatus, err) {
//       console.error(textStatus, err.toString());
//     }
//   });
// }


function getResources(callback){
  var awsResource = $('#aws-resource');
  awsResource.text('');
  $.ajax({
    type: 'GET',
    url: '/resources',
    contentType: 'application/json; charset=utf-8',
    success: [
      function(data, status, jqXHR) {
        console.log('getResources', data, status);
        awsResource.text(data.message);
      },
      callback
    ],
    error: function(jqXHR, textStatus, err) {
      console.error(textStatus, err.toString());
    }
  });
}


function getProtectedResource(callback){
  var awsProtectedResource = $('#aws-protected-resource');
  awsProtectedResource.text('');
  $.ajax({
    type: 'GET',
    url: '/resources/protected',
    contentType: 'application/json; charset=utf-8',
    // data: JSON.stringify(userTicket),
    success: [
      function(data, status, jqXHR) {
        console.log('getProtectedResource', data, status);
        awsProtectedResource.text(data.message);
      },
      callback
    ],
    error: function(jqXHR, textStatus, err) {
      console.error(textStatus, err.toString());
      awsProtectedResource.text('Ingen adgang');
    }
  });
}
