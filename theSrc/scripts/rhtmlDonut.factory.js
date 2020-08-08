import PieWrapper from './PieWrapper'
import DisplayError from './DisplayError'

module.exports = function (element) {
  let instance = new PieWrapper()
  return {
    renderValue (inputConfig) {
      try {
        instance.setConfig(inputConfig)
        instance.draw(element)
      } catch (error) {
        DisplayError.displayErrorMessage(element, error)
      }
    },
    resize () {
      try {
        instance.resize(element)
      } catch (error) {
        DisplayError.displayErrorMessage(element, error)
      }
    }
  }
}
