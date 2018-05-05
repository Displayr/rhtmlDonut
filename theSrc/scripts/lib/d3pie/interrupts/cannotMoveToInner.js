const Interrupt = require('./base')

class CannotMoveToInner extends Interrupt {
  constructor (labelDatum) {
    super('')
    this.type = 'CannotMoveToInner'
    this.labelDatum = labelDatum
  }
}

module.exports = CannotMoveToInner
