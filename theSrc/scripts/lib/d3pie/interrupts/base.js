class Interrupt extends Error {
  constructor () {
    super('')
    this.isInterrupt = true
    this.type = 'base'
  }
}

module.exports = Interrupt
