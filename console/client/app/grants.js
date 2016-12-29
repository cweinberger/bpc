var $ = require('jquery');
var React = require('react');

module.exports = React.createClass({
  getInitialState: function() {
    return {
      validScopes: [],
      grants: []
    };
  },
  getApplicationScopes: function() {
    return $.ajax({
      type: 'GET',
      // url: '/admin/grants',
      url: '/admin/applications/'.concat(this.props.app, '/scope'),
      contentType: "application/json; charset=utf-8",
      success: function(data, status){
        console.log('validScopes', data);
        this.setState({validScopes: data});
      }.bind(this),
      error: function(jqXHR, textStatus, err) {
        console.error(textStatus, err.toString());
      }
    });
  },
  getGrants: function() {
    return $.ajax({
      type: 'GET',
      // url: '/admin/grants',
      url: '/admin/applications/'.concat(this.props.app, '/grants'),
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
    return $.ajax({
      type: 'POST',
      url: '/admin/applications/'.concat(this.props.app, '/grants'),
      contentType: "application/json; charset=utf-8",
      data: JSON.stringify(grant),
      success: function(data, status){
        var grants = this.state.grants;
        grants.push(data);
        this.setState({grants: grants});
      }.bind(this),
      error: function(jqXHR, textStatus, err) {
        console.error(textStatus, err.toString());
      }
    });
  },
  updateGrant: function(grant, index) {
    return $.ajax({
      type: 'PUT',
      // url: '/admin/grants/'.concat(grant.id),
      url: '/admin/applications/'.concat(this.props.app, '/grants/', grant.id),
      contentType: "application/json; charset=utf-8",
      data: JSON.stringify(grant),
      success: function(data, status){
        var grants = this.state.grants;
        grants[index] = data;
        this.setState({grants: grants});
      }.bind(this),
      error: function(jqXHR, textStatus, err) {
        console.error(textStatus, err.toString());
      }
    });
  },
  deleteGrant: function(grantId, index) {
    return $.ajax({
      type: 'DELETE',
      url: '/admin/applications/'.concat(this.props.app, '/grants/', grantId),
      success: function(data, status){
        var grants = this.state.grants;
        grants.splice(index, 1);
        this.setState({grants: grants});
      }.bind(this),
      error: function(jqXHR, textStatus, err) {
        console.error(textStatus, err.toString());
      }
    });
  },
  componentDidMount: function() {
    this.getGrants();
    this.getApplicationScopes();
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
      <input type="button" value="Tilbage" onClick={this.props.closeApplication} />
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
      if (!(grant.scope instanceof Array)){
        grant.scope = [];
      }
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
    this.props.deleteGrant(this.state.grant.id, this.props.index);
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
    if (this.state.user !== '') {
      this.props.createGrant({user: this.state.user}).done(function() {
        this.setState({user: ''});
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
              name="user"
              placeholder="User"
              value={this.state.user}
              onChange={this.onChange} />
            <button type="submit">Add user</button>
          </div>
        </div>
      </form>
    );
  }
});
