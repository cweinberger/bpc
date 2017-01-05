const gulp = require('gulp');
const spawn = require('child_process').spawn;

var server;
var application;
var consoleApp;
var webpack;


gulp.task('default', ['webpack_watch', 'watch'], function(){

  start_server();

  setTimeout(function() {
    start_console();
    start_application();
  }, 2000);
});


gulp.task('start_server', start_server);
gulp.task('start_application', start_application);
gulp.task('start_console', start_console);


gulp.task('webpack_watch', function() {
  if (webpack) {
    webpack.kill();
  }
  webpack = spawn('webpack', ['--watch'], {stdio: 'inherit'});
});


gulp.task('watch', function(){
  gulp.watch(['./application/*.js'], ['start_application']);
  gulp.watch(['./server/*.js'], ['start_server']);
  gulp.watch(['./console/*.js'], ['start_console']);
});


function start_server(){
  if (server) {
    server.kill();
  }
  server = spawn('node', ['./server/index.js'], {stdio: 'inherit'});
}


function start_console(){
  if (consoleApp) {
    consoleApp.kill();
  }
  consoleApp = spawn('node', ['./console/index.js'], {stdio: 'inherit'});
}


function start_application(){
  if (application) {
    application.kill();
  }
  application = spawn('node', ['./application/index.js'], {stdio: 'inherit'});
}
