const wrapInPromiseAndLogErrors = function (fn) {
  return new Promise((resolve, reject) => {
    fn().then(resolve)
      .catch((err) => {
        console.log(err)
        reject(err)
      })
  }).catch((err) => {
    console.log(err)
    throw err
  })
}

module.exports = function () {
  this.When(/^I hover and move within segment ([0-9]+).*$/, function (segmentIndex) {
    return wrapInPromiseAndLogErrors(() => {
      return browser.actions()
        .mouseMove(this.context.donutPlot.segment(segmentIndex))
        .mouseMove({ x: parseInt(2), y: parseInt(2) })
        .perform()
    })
  })

  this.When(/^I hover over segment ([0-9]+).*$/, function (segmentIndex) {
    return wrapInPromiseAndLogErrors(() => {
      return browser.actions()
        .mouseMove(this.context.donutPlot.segment(segmentIndex))
        .perform()
    })
  })

  this.When(/^I hover over group segment ([0-9]+).*$/, function (segmentIndex) {
    return wrapInPromiseAndLogErrors(() => {
      return browser.actions()
        .mouseMove(this.context.donutPlot.groupSegment(segmentIndex))
        .perform()
    })
  })

  this.When(/^I move the mouse off the donut$/, function () {
    return wrapInPromiseAndLogErrors(() => {
      return browser.actions()
        .mouseMove({ x: -1000, y: -1000 })
        .perform()
    })
  })

  this.When(/^I hover over label ([0-9]+).*$/, function (labelIndex) {
    return wrapInPromiseAndLogErrors(() => {
      return browser.actions()
        .mouseMove(this.context.donutPlot.outerLabel(labelIndex))
        .perform()
    })
  })
}
