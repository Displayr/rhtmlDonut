import d3 from 'd3'
import math from './math'
import * as rootLog from 'loglevel'
const colorLogger = rootLog.getLogger('tooltip')

let helpers = {

  // creates the SVG element
  addSVGSpace: function (pie) {
    let element = pie.element

    let svg = d3.select(element).append('g').attr('id', 'pie-container')

    return svg
  },

  processObj: function (obj, is, value) {
    if (typeof is === 'string') {
      return helpers.processObj(obj, is.split('.'), value)
    } else if (is.length === 1 && value !== undefined) {
      obj[is[0]] = value
      return obj[is[0]]
    } else if (is.length === 0) {
      return obj
    } else {
      return helpers.processObj(obj[is[0]], is.slice(1), value)
    }
  },

  getDimensions: function (idString) {
    const id = (idString && idString[0] === '#') ? idString.slice(1) : idString
    const el = document.getElementById(id)
    let w = 0
    let h = 0
    if (el) {
      let dimensions = el.getBBox()
      w = dimensions.width
      h = dimensions.height
    } else {
      console.error('error: getDimensions() ' + id + ' not found.')
    }
    return {w: w, h: h}
  },

  /**
   * This is based on the SVG coordinate system, where top-left is 0,0 and bottom right is n-n.
   * @param r1
   * @param r2
   * @returns {boolean}
   */
  rectIntersect: function (r1, r2) {
    let returnVal = (
      // r2.left > r1.right
      (r2.x > (r1.x + r1.w)) ||

      // r2.right < r1.left
      ((r2.x + r2.w) < r1.x) ||

      // r2.bottom < r1.top
      ((r2.y + r2.h) < r1.y) ||

      // r2.top > r1.bottom
      (r2.y > (r1.y + r1.h))
    )

    return !returnVal
  },

  increaseBrightness: function (hex, percent) {
    // strip the leading # if it's there
    hex = hex.replace(/^\s*#|\s*$/g, '')

    // convert 3 char codes --> 6, e.g. `E0F` --> `EE00FF`
    if (hex.length === 3) {
      hex = hex.replace(/(.)/g, '$1$1')
    }

    let r = parseInt(hex.substr(0, 2), 16)
    let g = parseInt(hex.substr(2, 2), 16)
    let b = parseInt(hex.substr(4, 2), 16)

    const adjustedColor = '#' +
      ((0 | (1 << 8) + r + (256 - r) * percent / 100).toString(16)).substr(1) +
      ((0 | (1 << 8) + g + (256 - g) * percent / 100).toString(16)).substr(1) +
      ((0 | (1 << 8) + b + (256 - b) * percent / 100).toString(16)).substr(1)

    colorLogger.debug(`adjust brightness: input: ${hex}, output: ${adjustedColor}, percent: ${percent}`)
    return adjustedColor
  },

  applySmallSegmentGrouping: function (data, smallSegmentGrouping) {
    let totalSize
    if (smallSegmentGrouping.valueType === 'percentage') {
      totalSize = math.getTotalPieSize(data) // TODO this is done in _init right after the fn call
    }

    // loop through each data item
    let newData = []
    let groupedData = []
    let totalGroupedData = 0
    for (let i = 0; i < data.length; i++) {
      if (smallSegmentGrouping.valueType === 'percentage') {
        let dataPercent = (data[i].value / totalSize) * 100
        if (dataPercent <= smallSegmentGrouping.value) {
          groupedData.push(data[i])
          totalGroupedData += data[i].value
          continue
        }
        data[i].isGrouped = false
        newData.push(data[i])
      } else {
        if (data[i].value <= smallSegmentGrouping.value) {
          groupedData.push(data[i])
          totalGroupedData += data[i].value
          continue
        }
        data[i].isGrouped = false
        newData.push(data[i])
      }
    }

    // we're done! See if there's any small segment groups to add
    if (groupedData.length) {
      newData.push({
        color: smallSegmentGrouping.color,
        label: smallSegmentGrouping.label,
        value: totalGroupedData,
        isGrouped: true,
        groupedData: groupedData
      })
    }

    return newData
  },

  // for debugging
  showLine: function (svg, coords, color = 'black', note = '') {
    const path = 'M' + coords.map(({x, y}) => `${x} ${y}`).join(' L')
    svg.append('path')
      .attr('d', path)
      .attr('stroke', color)
      .attr('stroke-width', 1)
      .attr('fill', 'none')
      .style('opacity', 1)
      .style('display', 'inline')
  },

  // for debugging
  showPoint: function (svg, coord, color = 'black', note = '') {
    svg.append('circle')
      .attr('cx', coord.x)
      .attr('cy', coord.y)
      .attr('r', 2)
      .style('fill', color)
      .attr('note', note)
  },

  // TODO use _.isFunction
  isFunction: function (functionToCheck) {
    let getType = {}
    return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]'
  },

  // TODO use _.isArray
  isArray: function (o) {
    return Object.prototype.toString.call(o) === '[object Array]'
  }
}

module.exports = helpers
