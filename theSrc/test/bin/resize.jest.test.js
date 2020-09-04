const puppeteer = require('puppeteer')
const { snapshotTesting: { renderExamplePageTestHelper } } = require('rhtmlBuildUtils')
const loadWidget = require('../lib/loadWidget.helper')

const {
  configureImageSnapshotMatcher,
  puppeteerSettings,
  testSnapshots,
  jestTimeout,
} = renderExamplePageTestHelper

jest.setTimeout(jestTimeout)
configureImageSnapshotMatcher({ collectionIdentifier: 'resize' })

describe('resize', () => {
  let browser

  beforeEach(async () => {
    browser = await puppeteer.launch(puppeteerSettings)
  })

  afterEach(async () => {
    await browser.close()
  })

  test('basic resize', async function () {
    const { page } = await loadWidget({
      browser,
      configName: 'data.test_plan.abc_rbg',
      width: 300,
      height: 200,
    })

    await testSnapshots({ page, snapshotName: 'basic_initial' })

    const sizesToSnapshot = [
      { width: 275, height: 200 },
      { width: 275, height: 200 },
      { width: 250, height: 200 },
      { width: 225, height: 200 },
      { width: 225, height: 200 },
      { width: 400, height: 300 },
      { width: 500, height: 400 },
    ]

    for (const size of sizesToSnapshot) {
      const { width, height } = size
      await page.evaluate((width, height) => {
        window.resizeHook(width, height)
      }, width, height)

      await page.waitFor(1000)

      await testSnapshots({ page, snapshotName: `basic_after_resize_${width}x${height}` })
    }
    await page.close()
  })

  test('resize with wrapped titles, subtitles, and footer', async function () {
    const { page } = await loadWidget({
      browser,
      configName: 'data.test_plan.long_title_subtitle_footer',
      width: 600,
      height: 600,
    })

    await testSnapshots({ page, snapshotName: 'with_title_initial' })

    const sizesToSnapshot = [
      { width: 400, height: 600 },
      { width: 250, height: 600 },
    ]

    for (const size of sizesToSnapshot) {
      const { width, height } = size
      await page.evaluate((width, height) => {
        window.resizeHook(width, height)
      }, width, height)

      await page.waitFor(1000)

      await testSnapshots({ page, snapshotName: `with_title_after_resize_${width}x${height}` })
    }
    await page.close()
  })
})
