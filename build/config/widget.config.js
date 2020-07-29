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
    consoleLogHandler: (msg, testName) => {},
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
