// Copies the libraries that theSrc/internal_www/test/computeLabelLineMaxAngleCoords.html loads directly
// from /external/ in the browser, rather than through the widget bundle.
//
// This was a gulp task. The gulp version tracked completion by polling a counter on a 20ms interval with
// a hand-maintained "requiredCount" -- see the TODO it carried. Copying synchronously removes the need
// to track completion at all.
const fs = require('fs')
const path = require('path')

const projectRoot = path.join(__dirname, '../..')
const destinationDirectory = path.join(projectRoot, 'browser/external')

const dependencies = [
  'node_modules/d3/d3.js',
  'node_modules/lodash/lodash.js',
]

fs.mkdirSync(destinationDirectory, { recursive: true })

for (const dependency of dependencies) {
  const source = path.join(projectRoot, dependency)
  const destination = path.join(destinationDirectory, path.basename(dependency))
  fs.copyFileSync(source, destination)
  console.log(`copied ${dependency} -> browser/external/${path.basename(dependency)}`)
}
