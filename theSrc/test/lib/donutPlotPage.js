
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
    await this.page.hover(`#donut-0segment${segmentIndex}`)
    const x = this.page.mouse._x // NB this is not supported and may break in future
    const y = this.page.mouse._y // NB this is not supported and may break in future

    await this.page.mouse.move(parseFloat(x) + xDelta, parseFloat(y) + yDelta)
  }

  async moveMouseOffDonut () {
    await this.page.mouse.move(-1000, -1000)
  }
}

module.exports = DonutPlotPage
