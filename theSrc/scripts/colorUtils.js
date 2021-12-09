import _ from 'lodash'
import colorName from 'color-name'

const isHexColor = color => /^#[a-fA-F0-9]{6}$/.test(color) || /^#[a-fA-F0-9]{8}$/.test(color)
const isValidColorName = color => _.has(colorName, _.result(color, 'toLowerCase', null))
const convertIntToTwoDigitHex = n => n > 15 ? n.toString(16) : '0' + n.toString(16)
const getHexColorFromString = color => {
  if (isValidColorName(color)) {
    const [red, green, blue] = colorName[color.toLowerCase()]
    return `#${convertIntToTwoDigitHex(red)}${convertIntToTwoDigitHex(green)}${convertIntToTwoDigitHex(blue)}`
  }
  throw new Error(`Cannot convert '${color}' to #rrggbb format`)
}

module.exports = {
  isHexColor,
  isValidColorName,
  getHexColorFromString,
}
