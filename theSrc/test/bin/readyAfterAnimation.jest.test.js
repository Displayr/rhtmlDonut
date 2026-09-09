const puppeteer = require('puppeteer')
const { snapshotTesting: { renderExamplePageTestHelper } } = require('rhtmlBuildUtils')

const {
  getExampleUrl,
  jestTimeout,
  puppeteerSettings,
  waitForWidgetToLoad,
} = renderExamplePageTestHelper

jest.setTimeout(jestTimeout)

// rhtmlwidget-status=ready is what every consumer waits on: the visual suite's waitForWidgetToLoad,
// and Displayr's own export path. It used to be set synchronously the moment the load transition was
// SCHEDULED, so it claimed ready roughly 1.4 seconds before the donut stopped moving -- segments grow
// from zero over animation.speed, then the labels fade in over another 400ms.
//
// That is what made the first hover of every tooltip test unreliable: hover() picked a target from
// geometry that was still growing, and the browser does not re-fire mouseover for a stationary cursor
// when elements move underneath it. It also meant a screenshot taken snapshotDelay (500ms) after ready
// could catch a half-grown segment, which is exactly what the December 2021 baseline for
// a1_hover_over_segment_10 contains.
//
// This test watches the DOM per animation frame from before the widget renders, and asserts that
// nothing is still moving by the time ready is announced.
const observeReadyVersusAnimation = async (browser, url) => {
  const page = await browser.newPage()

  await page.evaluateOnNewDocument(() => {
    window.__animationProbe = { readyAt: null, lastChangeAt: null, sawGeometry: false }
    const start = performance.now()
    let lastSignature = null

    const tick = () => {
      const now = performance.now() - start
      const probe = window.__animationProbe

      const container = document.querySelector('div[rhtmlwidget-status]')
      if (probe.readyAt === null && container && container.getAttribute('rhtmlwidget-status') === 'ready') {
        probe.readyAt = now
      }

      // Everything that moves during the load animation: the segment and group-segment paths grow,
      // and the outer labels and their connector lines fade from opacity 0.
      const paths = [...document.querySelectorAll('path[id*="segment"]')].map(el => el.getAttribute('d')).join('|')
      const fades = [...document.querySelectorAll('[class*="labelGroup-outer"], g[class*="lineGroups"]')]
        .map(el => el.style.opacity).join('|')

      if (paths) {
        probe.sawGeometry = true
        const signature = paths + '#' + fades
        if (signature !== lastSignature) {
          lastSignature = signature
          probe.lastChangeAt = now
        }
      }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })

  await page.goto(url)
  // Comfortably longer than the ~1.4s the load animation takes, so the probe records it settling.
  await new Promise(resolve => setTimeout(resolve, 4000))

  const probe = await page.evaluate(() => window.__animationProbe)
  await page.close()
  return probe
}

describe('ready is announced only once the load animation has finished', () => {
  let browser

  beforeEach(async () => { browser = await puppeteer.launch(puppeteerSettings) })
  afterEach(async () => { await browser.close() })

  test('nothing is still animating when rhtmlwidget-status becomes ready', async function () {
    const probe = await observeReadyVersusAnimation(browser, getExampleUrl({
      configName: 'data.test_plan.groups_with_some_hidden_labels',
      width: 650,
      height: 650,
    }))

    expect(probe.sawGeometry).toBe(true)
    expect(probe.readyAt).not.toBeNull()
    expect(probe.lastChangeAt).not.toBeNull()

    // One animation frame of slack: the final tween frame and the attribute write can land in the
    // same frame, and the probe samples at frame granularity.
    const ONE_FRAME_MS = 17
    console.log(`ready announced ${(probe.readyAt - probe.lastChangeAt).toFixed(0)}ms after the last ` +
      `movement (ready t+${probe.readyAt.toFixed(0)}ms, last change t+${probe.lastChangeAt.toFixed(0)}ms)`)
    expect(probe.readyAt).toBeGreaterThanOrEqual(probe.lastChangeAt - ONE_FRAME_MS)
  })

  // Regression test for a failure mode the deferred ready introduced, and that did not exist while
  // ready was set synchronously: renderValue runs reset() -> setConfig() -> draw() inside a try, and
  // setConfig throws on invalid input, so draw() -- which cancels the pending timer -- is never
  // reached. A timer from the previous successful render would then stamp ready on a container now
  // showing only the error.
  test('a render that throws before draw() cancels the pending ready timer', async function () {
    const page = await browser.newPage()
    await page.goto(getExampleUrl({
      configName: 'data.test_plan.abc_rbg',
      width: 600,
      height: 400,
      rerenderControls: true,
    }))
    await page.waitForSelector('.example-0 .rerender-config')
    await waitForWidgetToLoad({ page })

    const statusOf = () => page.evaluate(() => {
      const el = document.querySelector('div[rhtmlwidget-status]')
      return el ? el.getAttribute('rhtmlwidget-status') : '(no widget div)'
    })
    // Set the field directly rather than typing it: the two rerenders have to happen inside one
    // animation window, and typing ~45 characters over CDP does not fit.
    const rerenderWith = async (configName) => {
      await page.evaluate((c) => { document.querySelector('.example-0 .rerender-config').value = c }, configName)
      await page.click('.rerender-button')
    }

    // A fresh successful render, purely to schedule a new ready timer and put the widget back into
    // 'loading'. Then, inside that window, a render whose setConfig throws.
    await rerenderWith('data.test_plan.abc_rbg')
    await rerenderWith('data.test_plan.errors.invalid_color_array_length')

    // Only meaningful if the first render's timer was still pending when the bad one landed.
    expect(await statusOf()).toBe('loading')

    await page.waitForSelector('.rhtml-error-container', { timeout: 10000 })
    // Comfortably past when the cancelled timer would have fired.
    await new Promise(resolve => setTimeout(resolve, 2000))

    const statusAfter = await statusOf()
    const showsError = await page.evaluate(() => !!document.querySelector('.rhtml-error-container'))
    await page.close()

    expect(showsError).toBe(true)
    expect(statusAfter).not.toBe('ready')
  })
})
