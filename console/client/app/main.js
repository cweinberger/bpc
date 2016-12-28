var $ = require('jquery');
var React = require('react');
var ReactDOM = require('react-dom');
var Applications = require('./applications');
var Grants = require('./grants');

var ConsoleApp = React.createClass({
  getInitialState: function() {
    return {
      loginurl: 'http://berlingske-poc.local:8084/cognito_login.html?returnUrl=' + window.location.origin + window.location.pathname + '&app=console'
    };
  },
  componentDidMount: function() {
    var rsvp = this.getSearchParameter('rsvp');

    if (rsvp) {
      this.loginUsingRsvp(rsvp, function(){
        this.setSearchParameter('rsvp', null);
      }.bind(this));
    } else {
      $.ajax({
        type: 'GET',
        url: '/login',
        contentType: 'application/json; charset=utf-8',
        success: [
          function(userTicket, status, jqXHR) {
            console.log('/login sucess', userTicket, status);
          }
        ],
        error: function(jqXHR, textStatus, err) {
          console.error(textStatus, err.toString());
          window.location = this.state.loginurl;
        }
      });
    }
  },
  getSearchParameter: function(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
  },
  setSearchParameter: function (key, value) {
    // remove the hash part before operating on the uri
    var uri = window.location.href;
    var i = uri.indexOf('#');
    var hash = i === -1 ? ''  : uri.substr(i);
         uri = i === -1 ? uri : uri.substr(0, i);

    var re = new RegExp("([?&])" + key + "=.*?(&|$)", "i");
    var separator = uri.indexOf('?') !== -1 ? "&" : "?";
    if (value === undefined || value === null) {
      uri = uri.replace(re, '$1' + '$2').replace('?&', '?');
      if (uri.endsWith('&')) {
        uri = uri.slice(0, -1);
      }
    } else if (uri.match(re)) {
      uri = uri.replace(re, '$1' + key + "=" + value + '$2');
    } else {
      uri = uri + separator + key + "=" + value;
    }
    var href = uri + hash;
    if (window.history.pushState) {
      window.history.pushState({path:href},'',href)
    }
  },
  loginUsingRsvp: function(rsvp, callback){
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
  },
  render: function() {



    return (
      <div className="container">
        <div className="nav">
          <a href="http://berlingske-poc.local:8084/cognito_login.html">Cognito login</a>
          |
          <a href="http://berlingske-poc-client.local:8085/cognito_application.html">Cognito application</a>
          |
          <a href="http://berlingske-poc.local:8084/gigya_login.html">Gigya login</a>
          |
          <a href="http://berlingske-poc-client.local:8085/gigya_application.html">Gigya application</a>
        </div>


        <h1>SSO POC - Oz Admin</h1>

        <br />
        <a href={this.state.loginurl}>Login</a>

        <Applications />
        <br />
        <br />
        <Grants />
      </div>
    );
  }
});

ReactDOM.render(
  <ConsoleApp />,
  document.getElementById('content')
);
