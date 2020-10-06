const Interrupt = require('./base')

class LabelPushedOffCanvas extends Interrupt {
  constructor (labelDatum, description = '') {
    super('')
    this.type = 'LabelPushedOffCanvas'
    this.labelDatum = labelDatum
    this.description = description
  }
}

module.exports = LabelPushedOffCanvas
