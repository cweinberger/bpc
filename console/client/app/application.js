var $ = require('jquery');
var React = require('react');
var Grants = require('./grants');

module.exports = React.createClass({
  getInitialState: function() {
    return {
      newScope: '',
      application: {}
    };
  },
  getApplication: function() {
    return $.ajax({
      type: 'GET',
      url: '/admin/applications/'.concat(this.props.app),
      success: function(data, status){
        console.log('application', data);
        this.setState({application: data});
      }.bind(this),
      error: function(jqXHR, textStatus, err) {
        console.error(textStatus, err.toString());
      }
    });
  },
  updateApplication: function() {
    return $.ajax({
      type: 'PUT',
      url: '/admin/applications/'.concat(this.props.app),
      contentType: "application/json; charset=utf-8",
      data: JSON.stringify(this.state.application),
      success: function(data, status){
        this.setState({application: data});
      }.bind(this),
      error: function(jqXHR, textStatus, err) {
        console.error(textStatus, err.toString());
      }
    });
  },
  deleteApplication: function() {
    return $.ajax({
      type: 'DELETE',
      url: '/admin/applications/'.concat(this.props.app),
      contentType: "application/json; charset=utf-8",
      success: function(data, status){
        this.props.closeApplication();
      }.bind(this),
      error: function(jqXHR, textStatus, err) {
        console.error(textStatus, err.toString());
      }
    });
  },
  addScope: function(e) {
    e.preventDefault();
    var application = Object.assign(this.state.application);
    application.scope.push(this.state.newScope);
    this.setState({application: application});
    this.setState({newScope: ''});
  },
  removeScope: function(index) {
    var application = this.state.application;
    application.scope.splice(index, 1);
    this.setState({application: application});
  },
  componentWillMount: function() {
    this.getApplication();
   },
  render: function() {
    console.log('cc', this.state.application);

    var scopeList = this.state.application !== undefined && this.state.application.scope !== undefined
      ? this.state.application.scope.map(function(s, index){
          return (<li key={index}>{s}</li>);
        })
      : null;

    return (
      <div>
        <div className="row">
          <div className="col-xs-2">
            <input className="btn btn-default" type="button" value="Tilbage" onClick={this.props.closeApplication} />
            </div>
            <div className="col-xs-2 col-xs-offset-8">
            {['console'].indexOf(this.state.application.id) === -1
              ? <button className="btn btn-danger" type="button" onClick={this.deleteApplication}>Delete app</button>
              : null
            }
          </div>
        </div>
        <div className="row">
          <div className="col-xs-12">
            <dl className="dl-horizontal">
              <dt>Application ID</dt>
              <dd>{this.state.application.id}</dd>
              <dt>Application Key</dt>
              <dd>{this.state.application.key}</dd>
            </dl>
          </div>
        </div>
        <div className="row">
          <div className="col-xs-12">
            <h2>Scope</h2>
            <ul className="list-unstyled">
              {scopeList}
            </ul>
          </div>
        </div>
        <div className="row">
          <div className="col-xs-12">
            <Grants app={this.props.app} />
          </div>
        </div>
      </div>
    );
  }
});
