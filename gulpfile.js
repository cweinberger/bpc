const gulp = require('gulp');
const spawn = require('child_process').spawn;

var server;
var application;
var consoleApp;

gulp.task('default', ['server', 'application', 'console']);

gulp.task('start_server', function() {
  if (server) {
    server.kill();
  }
  server = spawn('node', ['./server/index.js'], {stdio: 'inherit'});
});

gulp.task('server', ['start_server'], function (done) {
  gulp.watch(['./server/**/*.js'], ['start_server']);
  setTimeout(function() {
    done();
  }, 1000);
});

gulp.task('start_application', ['server'], function() {
  if (application) {
    application.kill();
  }
  application = spawn('node', ['./application/index.js'], {stdio: 'inherit'});
});

gulp.task('application', ['start_application'], function () {
  gulp.watch(['./application/**/*.js'], ['start_application']);
});


gulp.task('start_console', ['server'], function() {
  if (consoleApp) {
    consoleApp.kill();
  }
  consoleApp = spawn('node', ['./console/index.js'], {stdio: 'inherit'});
});

gulp.task('console', ['start_console'], function () {
  gulp.watch(['./console/**/*.js'], ['start_console']);
});
