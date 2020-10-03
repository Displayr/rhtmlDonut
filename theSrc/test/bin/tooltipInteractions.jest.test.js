const puppeteer = require('puppeteer')
const { snapshotTesting: { renderExamplePageTestHelper } } = require('rhtmlBuildUtils')
const loadWidget = require('../lib/loadWidget.helper')

const {
  configureImageSnapshotMatcher,
  puppeteerSettings,
  testSnapshots,
  jestTimeout,
} = renderExamplePageTestHelper

// custom pixelmatch threshold as several tests conssitently have a few 1000 pixel diff
configureImageSnapshotMatcher({
  collectionIdentifier: 'tooltip_interaction',
  pixelMatchConfig: {
    failureThreshold: 8000,
    failureThresholdType: 'pixel', // pixel or percent
  }
})

jest.setTimeout(jestTimeout)

describe('tooltip_interaction', () => {
  let browser

  beforeEach(async () => {
    browser = await puppeteer.launch(puppeteerSettings)
  })

  afterEach(async () => {
    await browser.close()
  })

  test('user can hover over the segments and see hilighting and tooltips', async function () {
    const { page, donutPlot } = await loadWidget({
      browser,
      configName: 'data.test_plan.groups_with_some_hidden_labels',
      width: 650,
      height: 650,
    })

    await donutPlot.hoverOverSegment(10)
    await testSnapshots({ page, snapshotName: 'A1_hover_over_segment_10_segment_highlighted_no_tooltip' })

    await donutPlot.hoverOverSegment(7)
    await testSnapshots({ page, snapshotName: 'A2_hover_over_segment_7_segment_highlighted_get_a_tooltip' })

    await donutPlot.hoverOverSegmentThenMove(7, 7, 2)
    await testSnapshots({ page, snapshotName: 'A3_hover_over_segment_7_and_move_segment_highlighted_tooltip_follows' })

    await donutPlot.moveMouseOffDonut()
    await testSnapshots({ page, snapshotName: 'A4_hover_off_donut' })

    await donutPlot.hoverOverSegment(11)
    await testSnapshots({ page, snapshotName: 'A5_hover_over_segment_11_segment_and_label_are_hilighted' })

    await donutPlot.hoverOverLabel(12)
    await testSnapshots({ page, snapshotName: 'A6_hover_over_label_12_segment_and_label_are_hilighted' })

    await page.close()
  })

  test('user can hover over the group segments and see tooltips', async function () {
    const { page, donutPlot } = await loadWidget({
      browser,
      configName: 'data.test_plan.simple_groups',
      width: 190,
      height: 190,
    })

    await donutPlot.hoverOverGroupSegment(0)
    await testSnapshots({ page, snapshotName: 'B1_hover_over_group_segment_0_no_tooltip' })

    await donutPlot.hoverOverGroupSegment(2)
    await testSnapshots({ page, snapshotName: 'B2_hover_over_group_segment_2_see_a_tooltip' })

    await page.close()
  })

  test('tooltip wrapping default settings', async function () {
    const { page, donutPlot } = await loadWidget({
      browser,
      configName: 'data.test_plan.tooltip_base',
      width: 1000,
      height: 550,
    })

    await donutPlot.hoverOverSegment(29)
    await testSnapshots({ page, snapshotName: 'C1A_segment_tooltip_wrapping_default_settings' })

    await donutPlot.hoverOverGroupSegment(2)
    await testSnapshots({ page, snapshotName: 'C2A_group_segment_tooltip_wrapping_default_settings' })

    await page.close()
  })

  test('tooltip wrapping settings at max 10 percent', async function () {
    const { page, donutPlot } = await loadWidget({
      browser,
      configName: 'data.test_plan.tooltip_base|config.tooltip_wrapping_max_10_percent',
      width: 1000,
      height: 550,
    })

    await donutPlot.hoverOverSegment(29)
    await testSnapshots({ page, snapshotName: 'C1B_segment_tooltip_wrapping_short_wrapping' })

    await donutPlot.hoverOverGroupSegment(2)
    await testSnapshots({ page, snapshotName: 'C2B_group_segment_tooltip_wrapping_short_wrapping' })

    await page.close()
  })

  test('tooltip styling is configurable', async function () {
    const { page, donutPlot } = await loadWidget({
      browser,
      configName: 'data.test_plan.tooltip_base|config.tooltip_pink_georgia_36',
      width: 1000,
      height: 550,
    })

    await donutPlot.hoverOverSegment(29)
    await testSnapshots({ page, snapshotName: 'C1C_segment_tooltip_styling' })

    await donutPlot.hoverOverGroupSegment(2)
    await testSnapshots({ page, snapshotName: 'C2C_group_segment_tooltip_styling' })

    await page.close()
  })

  test('tooltip autocoloring', async function () {
    const { page, donutPlot } = await loadWidget({
      browser,
      configName: 'data.test_plan.tooltip_base|config.tooltip_auto_color',
      width: 1000,
      height: 550,
    })

    await donutPlot.hoverOverSegment(29)
    await testSnapshots({ page, snapshotName: 'D1_segment_autocolor' })

    await donutPlot.hoverOverSegment(26)
    await testSnapshots({ page, snapshotName: 'D2_segment_autocolor_tooltip_should_be_different_color' })

    await donutPlot.hoverOverGroupSegment(2)
    await testSnapshots({ page, snapshotName: 'D3_group_segment_autocolor' })

    await donutPlot.hoverOverGroupSegment(4)
    await testSnapshots({ page, snapshotName: 'D4_group_segment_autocolor_tooltip_should_be_different_color' })

    await page.close()
  })
})
