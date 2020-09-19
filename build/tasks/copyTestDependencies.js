// TODO the method for knowing when we are done is crude and
// relies on author to keep requiredCount and all calls to incrementFinishCount up to date

module.exports = function (gulp) {
  return function (done) {
    let finishedCount = 0
    const requiredCount = 1
    const incrementFinishedCount = () => finishedCount++

    // only used directly in browser by test files
    const internalWebServerDependencies = [
      'node_modules/d3/d3.js',
      'node_modules/lodash/lodash.js',
    ]

    gulp.src(internalWebServerDependencies)
      .pipe(gulp.dest('browser/external/'))
      .on('finish', incrementFinishedCount)


    const intervalHandle = setInterval(() => {
      if (finishedCount >= requiredCount) {
        clearInterval(intervalHandle)
        done()
      }
    }, 20)
  }
}
