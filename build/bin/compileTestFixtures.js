// Bundles theSrc/test/utils/addTestFixturesToWindow.js into browser/js/, where
// theSrc/internal_www/test/computeLabelLineMaxAngleCoords.html loads it as /js/addTestFixturesToWindow.js.
//
// This was a gulp task registered from gulpfile.js. rhtmlBuildUtils 9.0.0 dropped gulp, and compileES6
// never used the gulp instance it was handed, so the port is just the call plus a callback that sets
// the exit code.
const path = require('path')
const { lib: { compileES6 } } = require('rhtmlBuildUtils')

const projectRoot = path.join(__dirname, '../..')

compileES6({
  entryPointFile: path.join(projectRoot, 'theSrc/test/utils/addTestFixturesToWindow.js'),
  destinationDirectory: path.join(projectRoot, 'browser/js/'),
  callback: (error) => {
    if (error) {
      console.error(error)
      process.exitCode = 1
    }
  },
})
