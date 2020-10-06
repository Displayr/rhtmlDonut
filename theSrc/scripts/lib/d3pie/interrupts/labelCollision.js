const Interrupt = require('./base')

class LabelCollision extends Interrupt {
  constructor (labelDatum, description = '') {
    super('')
    this.type = 'LabelCollision'
    this.labelDatum = labelDatum
    this.description = description
  }
}

module.exports = LabelCollision
