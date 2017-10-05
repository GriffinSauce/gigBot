/*
 *  Gulpfile
 */
var startOffset = new Date().getTime();
console.log('Starting Gulp');

// Modules
var gulp = require("gulp");
var server = require( 'gulp-develop-server');
var browserSync = require('browser-sync').create();
var reload      = browserSync.reload;

var end = new Date().getTime()-startOffset;
console.log('Modules loaded after '+end+' ms');

/*
 *  Main tasks
 *  Use these externally.
 */
gulp.task('default', ['watch']);

var options = {
    browserSync: {
        proxy: 'localhost:3200',
        files: ['public/**/*', '!public/**/*.css.map'],
        online: true,
        port: 3400,
        open: false,
        notify: true,
        ghostMode: false
    },
    server: {
        path: './app',
        env: {
            PORT: 3200,
            NODE_ENV: 'local',
        }
    }
};

gulp.task('watch', ['start'], function() {
    gulp.watch([
        "app.js",
        "server.js",
        "lib/**/*.js",
        "schemas/**/*.js",
        "services/**/*.js",
        "views/**/*.handlebars"
    ], server.restart);

    gulp.watch(['.rebooted', 'public/style.css']).on("change", browserSync.reload);
});

/*
 *  Development server
 */
gulp.task('start', function(cb) {
    server.listen(options.server, function( error ) {
        if (!error) {
            browserSync.init(options.browserSync, function(){
                cb();
            });
        }
    });
});
