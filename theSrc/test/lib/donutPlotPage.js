class DonutPlotPage {
  constructor (page) {
    this.page = page
  }

  async segment (segmentIndex) {
    return this.page.$(`#donut-0segment${segmentIndex}`)
  }

  async groupSegment (segmentIndex) {
    return this.page.$(`#donut-0gsegment${segmentIndex}`)
  }

  async outerLabel (labelIndex) {
    return this.page.$(`#donut-0labelGroup${labelIndex}-outer`)
  }

  async hoverOverSegment (segmentIndex) {
    return this.page.hover(`#donut-0segment${segmentIndex}`)
  }

  async hoverOverGroupSegment (segmentIndex) {
    return this.page.hover(`#donut-0gsegment${segmentIndex}`)
  }

  async hoverOverLabel (labelIndex) {
    return this.page.hover(`#donut-0labelGroup${labelIndex}-outer`)
  }

  async hoverOverSegmentThenMove (segmentIndex, xDelta, yDelta) {
    // NB this used to hover and then read page.mouse._x/_y, with a comment noting that was
    // unsupported. puppeteer 24 does not expose them. clickablePoint() is what hover() uses to choose
    // its point, so moving there is the same hover, and the delta is applied from a point we know.
    const segment = await this.segment(segmentIndex)
    const { x, y } = await segment.clickablePoint()

    await this.page.mouse.move(x, y)
    await this.page.mouse.move(x + xDelta, y + yDelta)
  }

  async moveMouseOffDonut () {
    await this.page.mouse.move(-1000, -1000)
  }
}

module.exports = DonutPlotPage
