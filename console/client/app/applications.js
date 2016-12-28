var $ = require('jquery');
var React = require('react');

module.exports = React.createClass({
  getInitialState: function() {
    return {
      applications: []
    };
  },
  getApplications: function() {
    return $.ajax({
      type: 'GET',
      url: '/p/applications',
      contentType: "application/json; charset=utf-8",
      success: function(data, status){
        this.setState({applications: data});
      }.bind(this),
      error: function(jqXHR, textStatus, err) {
        console.error(textStatus, err.toString());
      }
    });
  },
  createApplication: function(application) {
    return $.ajax({
      type: 'POST',
      url: '/p/applications',
      contentType: "application/json; charset=utf-8",
      data: JSON.stringify(application),
      success: function(data, status){
        var apps = this.state.applications;
        apps.push(newApp);
        this.setState({applications: apps});
      }.bind(this),
      error: function(jqXHR, textStatus, err) {
        console.error(textStatus, err.toString());
      }
    });
  },
  updateApplication: function(application, index) {
    return $.ajax({
      type: 'PUT',
      url: '/p/applications'.concat(application.id),
      contentType: "application/json; charset=utf-8",
      data: JSON.stringify(application),
      success: function(data, status){
        var applications = this.state.applications;
        applications[index] = result;
        this.setState({applications: applications});
      }.bind(this),
      error: function(jqXHR, textStatus, err) {
        console.error(textStatus, err.toString());
      }
    });
  },
  deleteApplication: function(appId, index) {
    console.log('deleteApplication', appId, index);
    return $.ajax({
      type: 'DELETE',
      url: '/p/applications'.concat(appId),
      contentType: "application/json; charset=utf-8",
      success: function(data, status){
        var applications = this.state.applications;
        applications.splice(index, 1);
        this.setState({applications: applications});
      }.bind(this),
      error: function(jqXHR, textStatus, err) {
        console.error(textStatus, err.toString());
      }
    });
  },
  componentDidMount: function() {
    this.getApplications();
  },
  render: function() {

    var applications = this.state.applications.map(function(application, index) {
      return (
        <Application
          key={index}
          index={index}
          application={application}
          updateApplication={this.updateApplication}
          deleteApplication={this.deleteApplication} />
        );
    }.bind(this));

    return (
      <div className="applications">
        <h3>Applications</h3>
        {applications}
        <CreateApplication createApplication={this.createApplication} />
      </div>
    );
  }
});

var Application = React.createClass({
  getInitialState: function() {
    return {
      newScope: '',
      application: this.props.application
    };
  },
  onChange: function(e) {
    var temp = {};
    temp[e.target.name] = e.target.value;
    this.setState(temp);
  },
  addScope: function(e) {
    e.preventDefault();
    var application = this.state.application;
    application.scope.push(this.state.newScope);
    this.props.updateApplication(application, this.props.index).done(function() {
      this.setState({newScope: ''});
    }.bind(this));
  },
  removeScope: function(index) {
    var application = this.state.application;
    application.scope.splice(index, 1);
    this.props.updateApplication(application, this.props.index);
  },
  deleteApplication: function() {
    this.props.deleteApplication(this.state.application.id, this.props.index);
  },
  render: function() {
    var scopes = this.state.application.scope
      ? this.state.application.scope.map(function(s, i) {
        return (
          <div key={i}>
          {s}
          <span className="glyphicon glyphicon-remove-circle" aria-hidden="true" onClick={this.removeScope.bind(this, i)}></span>
          </div>);
        }.bind(this))
      : null;

    return (
      <div className="row">
        <div className="col-xs-2"><div>{this.state.application.id}</div></div>
        <div className="col-xs-5"><div>{this.state.application.key}</div></div>
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
        <div className="col-xs-1">
        {['console', 'sso_client'].indexOf(this.state.application.id) === -1
          ? <button type="button" onClick={this.deleteApplication}>Delete</button>
          : null
        }
        </div>
      </div>);
  }
});

var CreateApplication = React.createClass({
  getInitialState: function() {
    return {
      value: ''
    };
  },
  onChange: function(e) {
    this.setState({value: e.target.value});
  },
  handleSubmit: function(e) {
    e.preventDefault();
    if (this.state.value !== '') {
      this.props.createApplication({id: this.state.value}).done(function() {
        this.setState({value: ''});
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
              name="id"
              placeholder="Application ID"
              value={this.state.value}
              onChange={this.onChange} />
            <button type="submit">Create application</button>
          </div>
        </div>
      </form>
    );
  }
});
