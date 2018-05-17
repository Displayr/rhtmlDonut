import _ from 'lodash'
import $ from 'jquery'
import math from '../math'

import { rectIntersect, rectXaboveY, rectXbelowY } from '../../geometryUtils'

// TODO this is from palmtrees labelUtils module
let idSeed = 0
function _getUniqueId () {
  return `wraptext-${++idSeed}`
}

function getLabelDimensionsUsingDivApproximation (inputString, fontSize = 12, fontFamily = 'sans-serif') {
  const uniqueId = _getUniqueId()
  const divWrapper = $(`<div id="${uniqueId}" style="display:inline-block; font-size: ${fontSize}px; font-family: ${fontFamily}">${inputString}</div>`)
  $(document.body).append(divWrapper)
  const { width, height } = document.getElementById(uniqueId).getBoundingClientRect()
  divWrapper.remove()
  return { width, height }
}

function getLabelDimensionsUsingSvgApproximation (parentContainer, inputString, fontSize = 12, fontFamily = 'sans-serif') {
  const uniqueId = _getUniqueId()

  const tempText = parentContainer.append('g')
    .attr('class', 'tempLabel')
    .attr('id', `tempLabel-${uniqueId}`)
    .append('text')
    .style('dominant-baseline', 'text-before-edge')
    .attr('x', 0)
    .attr('y', 0)
    .attr('dy', 0)

  tempText.append('tspan')
    .attr('x', 0)
    .attr('y', 0)
    .style('font-size', `${fontSize}px`)
    .style('font-family', fontFamily)
    .style('dominant-baseline', 'text-before-edge')
    .text(inputString)

  const {width, height} = tempText.node().getBBox()
  parentContainer.selectAll('.tempLabel').remove()
  return {width, height}
}

function wordTokenizer (inputString) {
  return inputString.split(' ').map(_.trim).filter((token) => !_.isEmpty(token))
}

function splitIntoLines (inputString, maxWidth, fontSize = 12, fontFamily = 'sans-serif') {
  let tokens = wordTokenizer(inputString)

  let currentLine = []
  let lines = []
  let token = null
  while (token = tokens.shift()) { // eslint-disable-line no-cond-assign
    currentLine.push(token)

    const { width } = getLabelDimensionsUsingDivApproximation(currentLine.join(' '), fontSize, fontFamily)
    if (width > maxWidth && currentLine.length > 1) {
      tokens.unshift(currentLine.pop())
      lines.push(`${currentLine.join(' ')}`)
      currentLine = []
    }
  }

  if (currentLine.length > 0) {
    lines.push(`${currentLine.join(' ')}`)
  }

  return lines
}

// http://stackoverflow.com/questions/19792552/d3-put-arc-labels-in-a-pie-chart-if-there-is-enough-space/19801529#19801529
function ptInArc (pt, innerR, outerR, stAngle, edAngle) {
  // Center of the arc is assumed to be 0,0
  // (pt.x, pt.y) are assumed to be relative to the center

  let dist = pt.x * pt.x + pt.y * pt.y
  let angle = math.toDegrees(Math.atan2(-pt.y, -pt.x))

  angle = (angle < 0) ? (angle + 360) : angle

  return (innerR * innerR <= dist) && (dist <= outerR * outerR) &&
    (stAngle <= angle) && (angle <= edAngle)
}

function labelToRect (label) {
  return {
    x: label.x || label.topLeftCoord.x,
    y: label.y || label.topLeftCoord.y,
    width: label.width,
    height: label.height
  }
}

function expandBy (label, padding = 0) {
  return {
    x: label.x - padding,
    y: label.y - padding,
    width: label.width + 2 * padding,
    height: label.height + 2 * padding
  }
}

function labelIntersect (label1, label2, within = 0) {
  return rectIntersect(expandBy(labelToRect(label1), within), labelToRect(label2))
}

function labelXaboveY (label1, label2) {
  return rectXaboveY(labelToRect(label1), labelToRect(label2))
}

function labelXbelowY (label1, label2) {
  return rectXbelowY(labelToRect(label1), labelToRect(label2))
}

module.exports = {
  getLabelDimensionsUsingDivApproximation,
  getLabelDimensionsUsingSvgApproximation,
  ptInArc,
  splitIntoLines,
  labelIntersect,
  labelXaboveY,
  labelXbelowY
}
