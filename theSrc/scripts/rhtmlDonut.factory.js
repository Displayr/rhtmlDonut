import PieWrapper from './PieWrapper'

module.exports = function (element) {
  let instance = new PieWrapper()
  return {
    renderValue (inputConfig) {
      instance.setConfig(inputConfig)
      instance.draw(element)
    },
    resize () {
      instance.resize(element)
    }
  }
}
