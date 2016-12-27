const gulp = require('gulp');
const spawn = require('child_process').spawn;

var server;
var application;

gulp.task('default', ['server', 'application']);

gulp.task('start_server', function() {
  if (server) {
    server.kill();
  }
  server = spawn('node', ['./server/index.js'], {stdio: 'inherit'});
});

gulp.task('server', ['start_server'], function () {
  gulp.watch(['./server/**/*.js'], ['start_server']);
});

gulp.task('start_application', function() {
  if (application) {
    application.kill();
  }
  application = spawn('node', ['./application/index.js'], {stdio: 'inherit'});
});

gulp.task('application', ['start_application'], function () {
  gulp.watch(['./application/**/*.js'], ['start_application']);
});
