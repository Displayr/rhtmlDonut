const Interrupt = require('./base')

class UnexpectedCondition extends Interrupt {
  constructor (description = '') {
    super('')
    this.type = 'UnexpectedCondition'
    this.description = description
  }
}

module.exports = UnexpectedCondition
