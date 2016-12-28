var $ = require('jquery');
var React = require('react');

module.exports = React.createClass({
  getInitialState: function() {
    return {
      grants: []
    };
  },
  getGrants: function() {
    return $.ajax({
      type: 'GET',
      url: '/p/grants',
      contentType: "application/json; charset=utf-8",
      success: function(data, status){
        this.setState({grants: data});
      }.bind(this),
      error: function(jqXHR, textStatus, err) {
        console.error(textStatus, err.toString());
      }
    });
  },
  createGrant: function(grant) {
    var p = this.props.callBasUsingUserCreds('POST', '/applications/grants', grant);
    p.done(function(newGrant) {
      var grants = this.state.grants;
      grants.push(newGrant);
      this.setState({grants: grants});
    }.bind(this));
    return p;
  },
  updateGrant: function(grant, index) {
    var p = this.props.callBasUsingUserCreds('POST', '/applications/grants', grant);
    p.done(function(result) {
      var grants = this.state.grants;
      grants[index] = result;
      this.setState({grants: grants});
    }.bind(this));
    return p;
  },
  deleteGrant: function(grantId, index) {
    var p = this.props.callBasUsingUserCreds('DELETE', '/applications/grants', {id: grantId});
    p.done(function() {
      var grants = this.state.grants;
      grants.splice(index, 1);
      this.setState({grants: grants});
    }.bind(this));
    return p;
  },
  componentDidMount: function() {
    this.getGrants();
  },
  render: function() {

    var grants = this.state.grants.map(function(grant, index) {
      return (
        <Grant
          key={index}
          index={index}
          grant={grant}
          updateGrant={this.updateGrant}
          deleteGrant={this.deleteGrant} />
        );
    }.bind(this));

    return (
      <div className="grants">
        <h3>Grants</h3>
        {grants}
        <CreateGrant createGrant={this.createGrant} />
      </div>
    );
  }
});

var Grant = React.createClass({
  getInitialState: function() {
    return {
      newScope: '',
      grant: this.props.grant
    };
  },
  onChange: function(e) {
    var temp = {};
    temp[e.target.name] = e.target.value;
    this.setState(temp);
  },
  addScope: function(e) {
    e.preventDefault();
    if (this.state.newScope !== '') {
      var grant = this.state.grant;
      grant.scope.push(this.state.newScope);
      this.props.updateGrant(grant, this.props.index).done(function() {
        this.setState({newScope: ''});
      }.bind(this));
    }
  },
  removeScope: function(index) {
    var grant = this.state.grant;
    grant.scope.splice(index, 1);
    this.props.updateGrant(grant, this.props.index);
  },
  deleteGrant: function() {
    return this.props.deleteGrant(this.state.grant.id, this.props.index);
  },
  render: function() {
    var scopes = this.state.grant.scope
      ? this.state.grant.scope.map(function(s, i) {
          return (
            <div key={i}>
              {s}
              <span className="glyphicon glyphicon-remove-circle" aria-hidden="true" onClick={this.removeScope.bind(this, i)}></span>
            </div>);
        }.bind(this))
      : null;

    return (
      <div className="row">
        <div className="col-xs-2"><div>{this.state.grant.app}</div></div>
        <div className="col-xs-4"><div>{this.state.grant.user}</div></div>
        <div className="col-xs-3">
          {scopes}
          <form onSubmit={this.addScope}>
            <input
              type="text"
              name="newScope"
              value={this.state.newScope}
              onChange={this.onChange}
              placeholder="Add scope"/>
          </form>
        </div>
        <div className="col-xs-2">
          <button type="button" onClick={this.deleteGrant}>Delete grant</button>
        </div>
      </div>
    );
  }
});


var CreateGrant = React.createClass({
  getInitialState: function() {
    return {
      app: '',
      user: '',
      scope: []
    };
  },
  onChange: function(e) {
    var temp = {};
    temp[e.target.name] = e.target.value;
    this.setState(temp);
  },
  handleSubmit: function(e) {
    e.preventDefault();
    if (this.state.app !== '' && this.state.user !== '') {
      this.props.createGrant({app: this.state.app, user: this.state.user}).done(function() {
        this.setState({app: '', user: ''});
      }.bind(this));
    }
  },
  render: function() {
    return (
      <form onSubmit={this.handleSubmit}>
        <div className="row">
          <div className="col-xs-12">
            <input
              type="text"
              name="app"
              placeholder="Application ID"
              value={this.state.app}
              onChange={this.onChange} />
            <input
              type="text"
              name="user"
              placeholder="User email"
              value={this.state.user}
              onChange={this.onChange} />
            <button type="submit">Create grant</button>
          </div>
        </div>
      </form>
    );
  }
});
