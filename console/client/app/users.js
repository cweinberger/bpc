var $ = require('jquery');
var React = require('react');

module.exports = React.createClass({
  getInitialState: function() {
    return {
      users: []
    };
  },
  getUsers: function() {
    return $.ajax({
      type: 'GET',
      url: '/admin/users',
      contentType: "application/json; charset=utf-8",
      success: function(data, status){
        this.setState({users: data});
      }.bind(this),
      error: function(jqXHR, textStatus, err) {
        console.error(textStatus, err.toString());
      }
    });
  },
  componentDidMount: function() {
    this.getUsers();
  },
  render: function() {

    var users = this.state.users.map(function(user, index) {
      var permissions = user.Permissions instanceof Array
        ? user.Permissions.map(function(permission, index) {
            return (<li key={index}>{permission}</li>);
          })
        : null;

      return (
        <tr key={index}>
          <td className="col-xs-2">{user.UID}</td>
          <td className="col-xs-2">{user.email}</td>
          <td className="col-xs-10">
            <ul className="list-unstyled">
              {permissions}
            </ul>
          </td>
        </tr>
      );
    });

    return (
      <div className="users">
        <h3>Users</h3>
        <table className="table">
          <tbody>
            <tr>
              <th className="col-xs-2">UID</th>
              <th className="col-xs-2">Email</th>
              <th className="col-xs-8">Permissions</th>
            </tr>
            {users}
          </tbody>
        </table>
      </div>
    );
  }
});
