# SSO Poc

## /etc/hosts

127.0.0.1       berlingske-poc.local
127.0.0.1       berlingske-poc-client.local

## MongoDB

db.applications.insert({
  id: 'test_sso_app',
  scope: [],
  delegate: false,
  key: 'hkj23h4kjh423kjhfsdkklj3983jkldl',
  algorithm: 'sha256'})

db.grants.insert({
  id:'f96a48fd0503832253548b34f3b65add16d54c2e',
  app: 'test_sso_app',
  user: 'eu-west-1:dd8890ba-fe77-4ba6-8c9d-5ee0efeed605',
  scope: []})

db.grants.insert({
  id:'739cd477fbfcd75980e3174ad912d899bd225af4',
  app: 'test_sso_app',
  user: 'eu-west-1:f34b49cd-695f-4d07-acd8-02e06174fa6b',
  scope: []})
