const gulp = require('gulp');
const spawn = require('child_process').spawn;

var server;

gulp.task('default', ['start_server', 'watch']);

gulp.task('start_server', function (){
  if (server) {
    server.kill();
  }
  server = spawn('node', ['--debug', './server/index.js'], {stdio: 'inherit'});
});

gulp.task('watch', function(){
  gulp.watch(['./server/**/*.js'], ['start_server']);
});
