const Interrupt = require('./base')

class AngleThresholdExceeded extends Interrupt {
  constructor (labelDatum) {
    super('')
    this.type = 'AngleThresholdExceeded'
    this.labelDatum = labelDatum
  }
}

module.exports = AngleThresholdExceeded
