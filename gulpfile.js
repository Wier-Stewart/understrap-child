// Defining base pathes
var basePaths = {
    node: './node_modules/', //vendor sources: gitignore
    vendor: './vendor/', //copy here from node_modules via gulp copy-assets: gitignore
    dev: './src/', //local sass & js to be minified: commit
    dev_scripts: './src/scripts/',
    dev_styles: './src/styles/',
    dev_images: './src/img/',
    js: './js/', // final compiled files included in theme: optionally commit
    css: './css/',  // final compiled files included in theme: optionally commit
    img: './img/',  // final compiled files included in theme: optionally commit
};

//just to make this obvious for gulp watch
var rebuildWatchFiles = [
    basePaths.dev_scripts,
    basePaths.dev_styles
];

// browser-sync watched files
// automatically reloads the page when files changed
var browserSyncWatchFiles = [
    './css/*.min.css',
    './js/*.min.js',
    './*.php'
];
// browser-sync options
// see: https://www.browsersync.io/docs/options/
var browserSyncOptions = {
    proxy: "localhost/understrap/",
    notify: false
};

// Defining requirements
var fs = require('fs');
var gulp = require('gulp');
var plumber = require('gulp-plumber');
var sass = require('gulp-sass');
var watch = require('gulp-watch');
var cssnano = require('gulp-cssnano');
var rename = require('gulp-rename');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var merge2 = require('merge2');
var imagemin = require('gulp-imagemin');
var ignore = require('gulp-ignore');
var rimraf = require('gulp-rimraf');
var clone = require('gulp-clone');
var merge = require('gulp-merge');
var sourcemaps = require('gulp-sourcemaps');
var browserSync = require('browser-sync').create();
var del = require('del');
var cleanCSS = require('gulp-clean-css');
var gulpSequence = require('gulp-sequence')

function swallowError(self, error) {
    console.log(error.toString())

    self.emit('end')
}

//task for Continuous Integration server to run
gulp.task('ci',  [ 'maybe-copy-assets', 'images', 'styles', 'scripts'], function() { });
// Run:
// gulp sass + cssnano + rename
// Prepare the min.css for production (with 2 pipes to be sure that "child-theme.css" == "child-theme.min.css")
gulp.task('scss-for-prod', function() {
    var source =  gulp.src('./sass/*.scss')
        .pipe(plumber({ errorHandler: function (error) { swallowError(this, error); } }))
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(sass());

    var pipe1 = source.pipe(clone())
        .pipe(sourcemaps.write(undefined, { sourceRoot: null }))
        .pipe(gulp.dest('./css'))
        .pipe(rename('custom-editor-style.css'))
        .pipe(gulp.dest('./css'));

    var pipe2 = source.pipe(clone())
        .pipe(plumber({ errorHandler: function (error) { swallowError(this, error); } }))
        .pipe(cssnano())
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest('./css'));

    return merge(pipe1, pipe2);
});

gulp.task('maybe-copy-assets', function(){
  try{
    fs.accessSync("./vendor/sass/bootstrap4/bootstrap.scss");
  }catch(err){
    gulp.start('copy-assets');
  }
});

// Run:
// gulp sourcemaps + sass + reload(browserSync)
// Prepare the child-theme.css for the development environment
gulp.task('scss-for-dev', function() {
    gulp.src( basePaths.dev_styles+'*/*.scss')
        .pipe(plumber({ errorHandler: function (error) { swallowError(this, error); } }))
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(sass())
        .pipe(sourcemaps.write(undefined, { sourceRoot: null }))
        .pipe(gulp.dest('./css'))
});

gulp.task('watch-scss', [], function () {
//  gulp.task('watch-scss', ['browser-sync'], function () {
    gulp.watch([ basePaths.dev_styles+'**/*.scss'], ['scss-for-dev']);
});

// Run:
// gulp sass
// Compiles SCSS files in CSS
gulp.task('sass', function () {
    var stream = gulp.src(basePaths.dev_styles+'*.scss' ) //plz include all includes in here. the end.
        .pipe(plumber({
            errorHandler: function (err) {
                console.log(err);
                this.emit('end');
            }
        }))
        .pipe(sass())
        .pipe(gulp.dest('./css'))
        .pipe(rename('custom-editor-style.css'))
    return stream;
});

// Run:
// gulp watch
// Starts watcher. Watcher runs gulp sass task on changes
gulp.task('watch', ['maybe-copy-assets'], function () {
    gulp.watch([ basePaths.dev_styles +'**/*.scss', basePaths.css], ['styles']);
    gulp.watch([ basePaths.dev_scripts +'**/*.js' , './scripts/*', basePaths.js,'!js/child-theme.js','!js/child-theme.min.js'], ['scripts']);
});

// Run:
// gulp imagemin
// Running image optimizing task
gulp.task('images', function(){
    gulp.src('./src/img/**')
    .pipe(imagemin())
    .pipe(gulp.dest('img'))
});

// Run:
// gulp nanocss
// Minifies CSS files
gulp.task('cssnano', ['cleancss'], function(){
  return gulp.src('./css/*.css')
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(plumber({ errorHandler: function (error) { swallowError(self, error); } }))
    .pipe(rename({suffix: '.min'}))
    .pipe(cssnano({discardComments: {removeAll: true}}))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('./css/'));
});

gulp.task('minify-css', function() {
  return gulp.src('./css/child-theme.css')
  .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(cleanCSS({compatibility: '*'}))
    .pipe(plumber({
            errorHandler: function (err) {
                console.log(err);
                this.emit('end');
            }
        }))
    .pipe(rename({suffix: '.min'}))
     .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('./css/'));
});

gulp.task('cleancss', function() {
  return gulp.src('./css/*.min.css', { read: false }) // much faster
    .pipe(ignore('child-theme.css'))
    .pipe(rimraf());
});

gulp.task('styles', function(callback){ gulpSequence( 'sass', 'minify-css')(callback) });

// Run:
// gulp browser-sync
// Starts browser-sync task for starting the server.
gulp.task('browser-sync', function() {
    browserSync.init(browserSyncWatchFiles, browserSyncOptions);
});

// Run:
// gulp watch-bs
// Starts watcher with browser-sync. Browser-sync reloads page automatically on your browser
gulp.task('watch-bs', ['browser-sync', 'watch'], function () { });

// Run:
// gulp scripts.
// Uglifies and concat all JS files into one
gulp.task('scripts', function() {
    var scripts = [

        // Start - All BS4 stuff
//        basePaths.vendor + 'js/bootstrap4/bootstrap.js',

        // End - All BS4 stuff

//        basePaths.vendor + 'js/skip-link-focus-fix.js',
//        basePaths.vendor + 'js/navigation.js',
        //most likely want basePaths.vendor + 'js/jquery.js' too
        basePaths.dev_scripts +'**/*'

    ];
  gulp.src(scripts)
    .pipe(concat('child-theme.min.js'))
    .pipe(uglify().on('error', function(e){
            console.log(e);
         }))
    .pipe(gulp.dest('./js/'));

  gulp.src(scripts)
    .pipe(concat('child-theme.js'))
    .pipe(gulp.dest('./js/'));
});

// Deleting any file inside the /src folder
gulp.task('clean-vendor', function () {
  return del(['vendor/**/*',]);
});

// Run:
// gulp copy-assets.
// Copy all needed dependency assets files from bower_component assets to themes /js, /scss and /fonts folder. Run this task after bower install or bower update


// Copy all Bootstrap JS files
gulp.task('copy-assets', function() {
// NOTE: All sass goes in vendor-sass. rewriting ./src/sass is a very bad plan.

////////////////// All Bootstrap 4 Assets /////////////////////////
// Copy all Bootstrap JS files
    gulp.src(basePaths.node + 'bootstrap/dist/js/**/*.js')
    .pipe(gulp.dest(basePaths.dev_scripts + '/bootstrap4'));

// Copy all Bootstrap SCSS files
    gulp.src(basePaths.node + 'bootstrap/scss/**/*.scss')
       .pipe(gulp.dest(basePaths.vendor + '/sass/bootstrap4'));
////////////////// End Bootstrap 4 Assets /////////////////////////

// Copy all UnderStrap SCSS files
    gulp.src(basePaths.node + 'understrap/sass/**/*.scss')
       .pipe(gulp.dest(basePaths.vendor + '/sass/understrap'));

// Copy all Font Awesome Fonts
    gulp.src(basePaths.node + 'font-awesome/fonts/**/*.{ttf,woff,woff2,eof,svg}')
        .pipe(gulp.dest('./fonts'));

// Copy all Font Awesome SCSS files
    gulp.src(basePaths.node + 'font-awesome/scss/*.scss')
        .pipe(gulp.dest(basePaths.vendor + '/sass/fontawesome'));

// Note: We're using Google's jQuery CDN instead.
// Copy jQuery  // NOTE: this is full, slim & core.js
    gulp.src(basePaths.node + 'jquery/dist/*.js')
        .pipe(gulp.dest(basePaths.vendor + '/js'));

// _s SCSS files
    gulp.src(basePaths.node + 'undescores-for-npm/sass/**/*.scss')
        .pipe(gulp.dest(basePaths.vendor + '/sass/underscores'));

// _s JS files:
    gulp.src([basePaths.node + 'undescores-for-npm/js/*.js', '!' + basePaths.node + 'undescores-for-npm/js/customizer.js'])
        .pipe(gulp.dest( basePaths.dev_scripts  ));


// Copy Popper JS files
    gulp.src(basePaths.node + 'popper.js/dist/umd/popper.min.js')
        .pipe(gulp.dest(basePaths.js));

    gulp.src(basePaths.node + 'popper.js/dist/umd/popper.js')
        .pipe(gulp.dest(basePaths.js));


//move sass into ./src/sass: WS only  -- committed.
//    gulp.src('sass/**/*')
//        .pipe(gulp.dest(basePaths.dev_styles ));
      del(['sass/**/*',]); //moved & committed 'em into src/styles'


});

// Run
// gulp dist
// Copies the files to the /dist folder for distributon
gulp.task('dist', ['clean-dist'], function() {
    gulp.src(['**/*','!bower_components','!bower_components/**','!node_modules','!node_modules/**','!src','!src/**','!dist','!dist/**','!sass','!sass/**','!readme.txt','!readme.md','!package.json','!gulpfile.js','!CHANGELOG.md','!.travis.yml','!jshintignore', '!codesniffer.ruleset.xml', '*'])
    .pipe(gulp.dest('dist/'))
});

// Deleting any file inside the /src folder
gulp.task('clean-dist', function () {
  return del(['dist/**/*',]);
});

// Run
// gulp dist-product
// Copies the files to the /dist folder for distributon
gulp.task('dist-product', ['clean-dist-product'], function() {
    gulp.src(['**/*','!bower_components','!bower_components/**','!node_modules','!node_modules/**','!dist','!dist/**', '*'])
    .pipe(gulp.dest('dist-product/'))
});

// Deleting any file inside the /src folder
gulp.task('clean-dist-product', function () {
  return del(['dist-product/**/*',]);
});



// Default Task
gulp.task('default', ['maybe-copy-assets','styles', 'scripts', 'images', 'watch-bs']);
