class DonutPlot {
  segment (segmentIndex) {
    return element(by.id(`donut-0segment${segmentIndex}`))
  }

  groupSegment (segmentIndex) {
    return element(by.id(`donut-0gsegment${segmentIndex}`))
  }

  outerLabel (labelIndex) {
    return element(by.id(`donut-0labelGroup${labelIndex}-outer`))
  }
}

module.exports = DonutPlot
