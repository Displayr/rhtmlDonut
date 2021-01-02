import PieWrapper from './PieWrapper'
import DisplayError from './DisplayError'

module.exports = function (element) {
  let instance = new PieWrapper(element)
  return {
    renderValue (inputConfig) {
      try {
        instance.reset()
        instance.setConfig(inputConfig)
        instance.draw()
      } catch (error) {
        DisplayError.displayErrorMessage(element, error)
      }
    },
    resize () {
      try {
        instance.draw()
      } catch (error) {
        DisplayError.displayErrorMessage(element, error)
      }
    },
  }
}
