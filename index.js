/*jshint node: true */
'use strict';

require('./server');
setTimeout(function(){
  // We wait so we know the sso server is up before requesting an appTicket
  require('./application');
}, 1000);
