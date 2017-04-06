function updateUsers() {
  db.users.find().forEach(function(user) {
    var permissions = user.Permissions;
    db.users.update({_id: user._id}, {$unset: {Permissions: true}, $set: {
      dataScopes: permissions,
      providerData: {},
      lastLogin: new ISODate()
    }});
  });
}
