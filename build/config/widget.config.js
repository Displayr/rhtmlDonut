const cliArgs = require('yargs').argv
const _ = require('lodash')

const config = {
  widgetEntryPoint: 'theSrc/scripts/rhtmlDonut.js',
  widgetFactory: 'theSrc/scripts/rhtmlDonut.factory.js',
  widgetName: 'rhtmlDonut',
  internalWebSettings: {
    isReadySelector: 'g[rhtmlDonut-status=ready]',
    singleWidgetSnapshotSelector: 'svg.svgContent',
    includeDimensionsOnWidgetDiv: true,
    default_border: true,
    css: [
      '/styles/main.css'
    ]
  },
  snapshotTesting: {
    snapshotDelay: 500,
    // consoleLogHandler: (msg, testName) => console.log(msg._text), // this will get all the output
    consoleLogHandler, // this will only output the stats lines
    pixelmatch: {
      // smaller values -> more sensitive : https://github.com/mapbox/pixelmatch#pixelmatchimg1-img2-output-width-height-options
      customDiffConfig: {
        threshold: 0.0001
      },
      failureThreshold: 0.0001,
      failureThresholdType: 'percent' // pixel or percent
    }
  }
}

const commandLineOverides = _.omit(cliArgs, ['_', '$0'])
const mergedConfig = _.merge(config, commandLineOverides)

module.exports = mergedConfig

function consoleLogHandler (msg, testName) {
  const statsLineString = _(msg.args())
    .map(arg => _.result(arg, 'toString', ''))
    .filter(arg => arg.match(/totalDuration/))
    .first()

  if (statsLineString) {
    const statsStringMatch = statsLineString.match('^JSHandle:(.+)$')
    if (statsStringMatch) {
      const stats = JSON.parse(statsStringMatch[1])
      console.log(JSON.stringify(_.assign(stats, { scenario: testName })))
    }
  }
}
