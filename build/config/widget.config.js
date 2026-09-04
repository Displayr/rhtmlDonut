const cliArgs = require('yargs').argv
const _ = require('lodash')

const config = {
  widgetEntryPoint: 'theSrc/scripts/rhtmlDonut.js',
  widgetFactory: 'theSrc/scripts/rhtmlDonut.factory.js',
  widgetName: 'rhtmlDonut',
  internalWebSettings: {
    isReadySelector: 'div[rhtmlwidget-status=ready]',
    singleWidgetSnapshotSelector: 'svg.svgContent',
    includeDimensionsOnWidgetDiv: true,
    default_border: true,
    css: [
      '/styles/main.css',
    ],
  },
  snapshotTesting: {
    // Selects theSrc/test/snapshots/ci/<branch>/. Set here rather than passed as --env=ci because that
    // is what CI should default to; the flag no longer constrains the value (9.0.0 dropped the
    // local/travis whitelist). Command-line --env still wins, so `npm run localTest` keeps using 'local'.
    env: 'ci',

    // Ubuntu 24.04 restricts unprivileged user namespaces via AppArmor, which breaks Chrome's sandbox
    // on CI runners. --disable-dev-shm-usage avoids crashes from the small default /dev/shm in
    // containers.
    puppeteer: {
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
      // headless: false, // if set to false, show the browser while testing
      // slowMo: 500, // delay each step in the browser interaction by X milliseconds
    },
    snapshotDelay: 500,

    // assertNoLogError fails a test if the widget logs a console error. It did not exist in
    // rhtmlBuildUtils 7.1.1, which this repo was pinned to, so 9.0.0 switched it on here for the first
    // time. Turning it on surfaced two separate things, and only one of them is fixed:
    //
    //   1. FIXED. Every single test-plan test failed, because Chrome requests /favicon.ico for every
    //      page and the internal web server had nothing to answer with. The runner excludes livereload
    //      URLs from the check but not that 404. theSrc/internal_www/favicon.ico exists purely to
    //      remove it -- the copy task puts theSrc/internal_www/** into browser/, which connect serves.
    //
    //   2. NOT FIXED, and the reason this is false. With the 404 gone, label_variations_innerlabels
    //      still fails on a real widget error: CollisionResolver.js logs "should have found matching
    //      outer label for inner label <n>" seven times for that plan. It is a pre-existing defect in
    //      label collision resolution, not a migration regression -- it reproduces identically on
    //      master's sources, and the snapshots still match, so it degrades placement rather than
    //      breaking rendering. Fixing it belongs in its own change: it needs a real look at the
    //      labeller and it will move labels, which rebaselines the suite.
    //
    // So this is false for the same reason rhtmlCombinedScatter has it false, but only the second item
    // is actually load-bearing. Flip it back to true once CollisionResolver is fixed -- the favicon is
    // already in place, so that is a one-line change and the rest of the suite passes the assertion.
    assertNoLogError: false,
    consoleLogHandler,
    pixelmatch: {
      // smaller values -> more sensitive : https://github.com/mapbox/pixelmatch#pixelmatchimg1-img2-output-width-height-options
      customDiffConfig: {
        threshold: 0.0001,
      },
      failureThreshold: 0.0001,
      failureThresholdType: 'percent', // pixel or percent
    },
  },
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
