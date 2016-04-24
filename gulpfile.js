/*
 *  Gulpfile
 */
var startOffset = new Date().getTime();
console.log('Starting Gulp');

// Modules
var gulp = require("gulp");
var nodemon = require("gulp-nodemon");

var end = new Date().getTime()-startOffset;
console.log('Modules loaded after '+end+' ms');

/*
 *  Main tasks
 *  Use these externally.
 */
gulp.task('default', ['start']);

gulp.task('start', function () {
    nodemon({
        script: 'app.js'
        , ext: 'js handlebars'
        , env: { 'NODE_ENV': 'local' }
    });
});
