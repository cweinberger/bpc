var $ = require('jquery');
var React = require('react');
var ReactDOM = require('react-dom');
var Applications = require('./applications');
var Application = require('./application');


var ConsoleApp = React.createClass({
  getInitialState: function() {
    return {
      loggedIn: false,
      authenticated: false,
      userprofile: {},
      appId: null,
      loginurl: 'http://berlingske-poc.local:8084/cognito_login.html?returnUrl=' + window.location.origin + window.location.pathname + '&app=console'
    };
  },
  componentWillMount: function() {
    var rsvp = this.getSearchParameter('rsvp'),
        loginurl = this.state.loginurl;

    if (rsvp) {
      this.getUserTicket(rsvp, function(){
        this.setSearchParameter('rsvp', null);
        this.validateUserTicket();
      }.bind(this));
    } else {
      this.validateUserTicket();
    }
  },
  validateUserTicket: function(){
    return $.ajax({
      type: 'GET',
      url: '/ticket',
      contentType: 'application/json; charset=utf-8',
      success: [
        function(userTicket, status, jqXHR) {
          console.log('GET ticket success', userTicket, status);
          this.setState({ authenticated: true, loggedIn: true });
          this.getUserProfile();
        }.bind(this)
      ],
      error: function(jqXHR, textStatus, err) {
        console.error(textStatus, err.toString());
        // The user is logged in, but just not an admin
        if(jqXHR.status === 403){
          this.setState({ loggedIn: true });
          this.getUserProfile();
        }
        // window.location.href = loginurl;
      }.bind(this)
    });
  },
  getUserTicket: function(rsvp, callback){
    $.ajax({
      type: 'POST',
      url: '/ticket',
      contentType: 'application/json; charset=utf-8',
      data: JSON.stringify({rsvp: rsvp}),
      success: [
        function(userTicket, status, jqXHR) {
          console.log('POST ticket success', userTicket, status);
          this.setState({ authenticated: true, loggedIn: true });
        }.bind(this),
        callback
      ],
      error: function(jqXHR, textStatus, err) {
        console.error(textStatus, err.toString());
        // The user is logged in, but just not an admin
        if(jqXHR.status === 403){
          this.setState({ loggedIn: true });
        }
      }.bind(this)
    });
  },
  deleteUserTicket: function(callback){
    $.ajax({
      type: 'DELETE',
      url: '/ticket',
      success: [
        function(data, status, jqXHR) {
          console.log('DELETE signout success', data, status);
          this.setState({ authenticated: false, loggedIn: false });
        }.bind(this),
        callback
      ],
      error: function(jqXHR, textStatus, err) {
        console.error(textStatus, err.toString());
      }
    });
  },
  getUserProfile: function(callback){
    $.ajax({
      type: 'GET',
      url: '/ticket/userprofile',
      success: [
        function(data, status, jqXHR) {
          console.log('GET userprofile', data, status);
          this.setState({userprofile: data});
        }.bind(this),
        callback
      ],
      error: function(jqXHR, textStatus, err) {
        console.error(textStatus, err.toString());
      }
    });
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
  selectApplication: function(id){
    console.log('selectApplication', id);
    this.setState({ appId: id });
  },
  closeApplication: function(){
    console.log('closeApplication');
    this.setState({ appId: null });
  },
  render: function() {



    return (
      <div className="container">

        <h1>SSO POC - Oz Admin</h1>
        <div>
          {this.state.loggedIn !== true
            ? <a className="btn btn-default" href={this.state.loginurl}>Login</a>
            : <div>
                <button type="button" className="btn btn-warning" onClick={this.deleteUserTicket}>Slet cookie</button>
                <p>{this.state.userprofile.email}</p>
              </div>
          }
        </div>
        <div>
          {this.state.loggedIn === true && this.state.authenticated !== true
            ? <p>Du har ikke de fornødne rettigheder</p>
            : null
          }
        </div>
        <br />
        {this.state.appId === null
          ? <Applications selectApplication={this.selectApplication} />
          : <Application app={this.state.appId} closeApplication={this.closeApplication} />
        }
      </div>
    );
  }
});

ReactDOM.render(
  <ConsoleApp />,
  document.getElementById('content')
);
