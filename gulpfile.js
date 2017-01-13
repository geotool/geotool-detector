'use strict';

var gulp         = require('gulp');
var babel        = require('gulp-babel');
var browserify   = require('gulp-browserify');
var clean        = require('gulp-clean');
var concat       = require('gulp-concat');
var plumber      = require('gulp-plumber');
var rename       = require('gulp-rename');
var uglify       = require('gulp-uglify');
var webserver    = require('gulp-webserver');
var runSequence  = require('run-sequence');

gulp.task('clean', function() {
	return gulp.src( 'build/debug', {read: false} )
			.pipe(plumber())
			.pipe(clean());
});

gulp.task('copy-html', function() {
		return gulp.src([
				'test/app/index.html'
			])
			.pipe(plumber())
			.pipe(gulp.dest('build/debug'));
});

gulp.task('copy-js', function() {
		return gulp.src([
				'lib/*.js',
				'index.js'
			], { base: './' })
			.pipe(plumber())
			.pipe(gulp.dest('build/debug/js'));
});

gulp.task('babel', function() {
		return gulp.src('build/debug/js/*.js')
			.pipe(plumber())
			.pipe(babel())
			.pipe(gulp.dest('build/debug/js'));
});

gulp.task('browserify', function() {
		return gulp.src('build/debug/js/index.js')
			.pipe(plumber())
			.pipe(browserify())
			.pipe(rename('geotool-detector.js'))
			.pipe(gulp.dest('build/debug/js'));
});

gulp.task('uglify', function() {
		return gulp.src('build/debug/js/geotool-detector.js')
			.pipe(concat('geotool-detector.min.js'))
			.pipe(uglify())
			.pipe(gulp.dest('build/debug/js'));
});

gulp.task('deploy', function() {
	return gulp.src([
			'build/debug/js/geotool-detector*.js',
			'build/debug/index.html'
		], { base: 'build/debug' })
		.pipe(gulp.dest('dist'));
});

gulp.task('build', function(callback) {
	runSequence('clean', ['copy-js', 'copy-html'], 'babel', 'browserify', 'uglify', 'deploy', callback);
});

gulp.task('run', function() {
	gulp.src('./dist').pipe(webserver({
		host: '0.0.0.0',
		port: 8888,
		livereload: {
			enable: true,
			port: 38888
		},
		open: (function() {
			return 'http://localhost:8888/index.html'
		})()
	}));
});

gulp.task('default', ['build', 'run']);
