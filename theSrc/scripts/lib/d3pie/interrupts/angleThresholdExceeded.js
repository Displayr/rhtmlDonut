const Interrupt = require('./base')

class AngleThresholdExceeded extends Interrupt {
  constructor (labelDatum, description = '') {
    super('')
    this.type = 'AngleThresholdExceeded'
    this.labelDatum = labelDatum
    this.description = description
  }
}

module.exports = AngleThresholdExceeded
