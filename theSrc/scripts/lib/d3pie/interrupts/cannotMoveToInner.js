const Interrupt = require('./base')

class CannotMoveToInner extends Interrupt {
  constructor (labelDatum, description = '') {
    super('')
    this.type = 'CannotMoveToInner'
    this.labelDatum = labelDatum
    this.description = description
  }
}

module.exports = CannotMoveToInner
