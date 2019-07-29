var gulp = require('gulp'),
    sass = require('gulp-sass'),
    autoprefixer = require('gulp-autoprefixer'),
    concat      = require('gulp-concat');

gulp.task('sass', function(){
    gulp.src('src/sass/*.+(sass|scss)')
        .pipe(sass())
        .pipe(autoprefixer(['last 15 versions', '> 1%', 'ie 8', 'ie 7'], { cascade: true }))
        .pipe(concat('style.css'))
        .pipe(gulp.dest('public'));
});

gulp.task('sass:watch', function () {
    gulp.watch('src/sass/*.+(sass|scss)', ['sass']);
});
