const DonutPlot = require('../pageObjects/donutPlot')

module.exports = function () {
  this.Before(function () {
    this.context.donutPlot = new DonutPlot()
  })
}
