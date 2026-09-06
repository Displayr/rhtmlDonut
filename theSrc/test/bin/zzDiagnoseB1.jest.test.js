// TEMPORARY DIAGNOSTIC -- delete once the b1 hover question is answered.
//
// b1_hover_over_group_segment_0_no_tooltip highlights locally now that the group label is
// pointer-events:none, but the CI-regenerated baseline still shows the segment unhighlighted. This
// logs what is actually under the point hover() aims at, on the runner.
const puppeteer = require('puppeteer')
const { snapshotTesting: { renderExamplePageTestHelper } } = require('rhtmlBuildUtils')

const {
  getExampleUrl,
  jestTimeout,
  puppeteerSettings,
  waitForWidgetToLoad,
} = renderExamplePageTestHelper

jest.setTimeout(jestTimeout)

describe('diagnoseB1', () => {
  let browser
  beforeEach(async () => { browser = await puppeteer.launch(puppeteerSettings) })
  afterEach(async () => { await browser.close() })

  test('report what covers the group segment hover point', async function () {
    const page = await browser.newPage()
    await page.goto(getExampleUrl({ configName: 'data.test_plan.simple_groups', width: 190, height: 190 }))
    await waitForWidgetToLoad({ page })

    const before = await page.evaluate(() => {
      const seg = document.getElementById('donut-0gsegment0')
      const svg = document.querySelector('svg.svgContent')
      const s = svg.getBoundingClientRect()
      const b = seg.getBoundingClientRect()
      const cx = b.x + b.width / 2, cy = b.y + b.height / 2

      const describe = (el) => el
        ? el.tagName + (el.id ? '#' + el.id : '') + (el.getAttribute('class') ? '.' + el.getAttribute('class') : '')
        : 'null'

      const stack = document.elementsFromPoint(cx, cy).slice(0, 6).map(describe)

      // Every element whose box contains the point, with its computed pointer-events.
      const covering = [...document.querySelectorAll('svg.svgContent *')]
        .filter(el => {
          const r = el.getBoundingClientRect()
          return r.width > 0 && r.height > 0 && cx >= r.x && cx <= r.x + r.width && cy >= r.y && cy <= r.y + r.height
        })
        .map(el => describe(el) + ' [pe=' + getComputedStyle(el).pointerEvents + ']')

      return {
        pointInImage: [Math.round(cx - s.x), Math.round(cy - s.y)],
        hitStack: stack,
        covering: covering.slice(0, 25),
        coveringCount: covering.length,
      }
    })

    console.log('B1DIAG point in image coords: ' + JSON.stringify(before.pointInImage))
    console.log('B1DIAG elementsFromPoint (top first): ' + JSON.stringify(before.hitStack))
    console.log('B1DIAG boxes containing the point (' + before.coveringCount + '):')
    before.covering.forEach(c => console.log('B1DIAG   ' + c))

    const fill = () => page.evaluate(() => document.getElementById('donut-0gsegment0').style.fill || '(none)')
    const mouse = () => page.evaluate(() => window.__lastMouse || '(no mousemove seen)')
    await page.evaluate(() => {
      window.__mouseEvents = []
      const seg = document.getElementById('donut-0gsegment0')
      for (const type of ['mouseover', 'mouseout', 'mousemove']) {
        seg.addEventListener(type, (e) => {
          window.__mouseEvents.push(type + '@' + Math.round(e.clientX) + ',' + Math.round(e.clientY))
          window.__lastMouse = Math.round(e.clientX) + ',' + Math.round(e.clientY)
        })
      }
    })

    // Replicate exactly what testSnapshots does, reading the fill at each step.
    await page.hover('#donut-0gsegment0')
    console.log('B1DIAG 1. immediately after hover()      : ' + await fill())

    await new Promise(resolve => setTimeout(resolve, 500)) // snapshotDelay
    console.log('B1DIAG 2. after snapshotDelay 500ms      : ' + await fill())

    const widgets = await page.$$('svg.svgContent, .rhtml-error-container')
    console.log('B1DIAG 3. widgets matched                : ' + widgets.length)
    console.log('B1DIAG 4. after page.$$                  : ' + await fill())

    for (const w of widgets) {
      await w.screenshot({ encoding: 'base64' })
    }
    console.log('B1DIAG 5. AFTER element screenshot       : ' + await fill())
    console.log('B1DIAG    last mouse position seen by seg: ' + await mouse())
    console.log('B1DIAG    events on segment              : ' +
      JSON.stringify(await page.evaluate(() => window.__mouseEvents)))
    console.log('B1DIAG    scrollY / body size            : ' +
      JSON.stringify(await page.evaluate(() => [window.scrollY, document.body.scrollWidth, document.body.scrollHeight, window.innerWidth, window.innerHeight])))

    await page.close()
    expect(true).toBe(true)
  })
})
