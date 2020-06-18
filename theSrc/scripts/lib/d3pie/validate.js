import helpers from './helpers'

/* global HTMLElement */
/* global SVGElement */

const validate = {

  // called whenever a new pie chart is created
  initialCheck: function (pie) {
    const cssPrefix = pie.cssPrefix
    const element = pie.element
    let options = pie.options

    // confirm element is either a DOM element or a valid string for a DOM element
    if (!(element instanceof HTMLElement || element instanceof SVGElement)) {
      console.error('d3pie error: the first d3pie() param must be a valid DOM element (not jQuery) or a ID string.')
      return false
    }

    // confirm the CSS prefix is valid. It has to be at least one character long and contain only alphanumeric or _- characters
    if (!(/[a-zA-Z][a-zA-Z0-9_-]*$/.test(cssPrefix))) {
      console.error(`d3pie error: invalid options.misc.cssPrefix: '${cssPrefix}'`)
      return false
    }

    // confirm some data has been supplied
    if (!helpers.isArray(options.data.content)) {
      console.error('d3pie error: invalid config structure: missing data.content property.')
      return false
    }
    if (options.data.content.length === 0) {
      console.error('d3pie error: no data supplied.')
      return false
    }

    // clear out any invalid data. Each data row needs a valid positive number and a label
    let data = []
    for (let i = 0; i < options.data.content.length; i++) {
      if (typeof options.data.content[i].value !== 'number' || isNaN(options.data.content[i].value)) {
        console.error('not valid: ', options.data.content[i])
        continue
      }
      if (options.data.content[i].value <= 0) {
        console.log('not valid - should have positive value: ', options.data.content[i])
        continue
      }
      data.push(options.data.content[i])
    }
    pie.options.data.content = data

    return true
  }
}

module.exports = validate
