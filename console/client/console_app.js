$(document).ready(function() {

  $('#loginButton1').attr('href', 'http://berlingske-poc.local:8084/cognito_login.html?returnUrl=' + window.location.origin + window.location.pathname + '&app=console');

  var rsvp = getUrlVar('rsvp');

  if (rsvp){
    loginUsingRsvp(rsvp, function(){
      removeUrlVar('rsvp');
    });
  }
});

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

function getApplications(){
  $.ajax({
    type: 'GET',
    url: '/p/applications',
    contentType: "application/json; charset=utf-8",
    success: function(data, status){
      console.log('gg', data);
    },
    error: function(jqXHR, textStatus, err) {
      console.error(textStatus, err.toString());
    }
  });
}

function getGrants(){
  $.ajax({
    type: 'GET',
    url: '/p/grants',
    contentType: "application/json; charset=utf-8",
    success: function(data, status){
      console.log('gg', data);
    },
    error: function(jqXHR, textStatus, err) {
      console.error(textStatus, err.toString());
    }
  });
}
