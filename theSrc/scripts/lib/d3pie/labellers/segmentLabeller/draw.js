import d3 from 'd3'
import _ from 'lodash'
import computeOuterConnectionLinePath from './computeOuterConnectionLinePath'
import { rotate } from '../../math'

const drawLabelSet = ({
  canvas,
  labels,
  labelColor,
  innerPadding,
  labelType,
}) => {
  const { svg, cssPrefix } = canvas
  let labelContainer = svg.insert('g', `.${cssPrefix}labels-${labelType}`)
    .attr('class', `${cssPrefix}labels-${labelType}`)

  let labelGroup = labelContainer.selectAll(`.${cssPrefix}labelGroup-${labelType}`)
    .data(labels)
    .enter()
    .append('g')
    .attr('id', function (d) { return `${cssPrefix}labelGroup${d.id}-${labelType}` })
    .attr('data-line-angle', d => (d.labelLineAngle) ? d.labelLineAngle.toFixed(3) : '')
    .attr('data-segmentangle', d => (d.segmentAngleMidpoint) ? d.segmentAngleMidpoint.toFixed(3) : '')
    .attr('data-index', function (d) { return d.id })
    .attr('class', `${cssPrefix}labelGroup-${labelType}`)
    .attr('transform', function ({ topLeftCoord }) { return `translate(${topLeftCoord.x},${topLeftCoord.y})` })
    .style('opacity', 1)

  labelGroup.append('text')
    .attr('id', function (d) { return `${cssPrefix}segmentMainLabel${d.id}-${labelType}` })
    .attr('class', `${cssPrefix}segmentMainLabel-outer`)
    .attr('x', 0)
    .attr('y', 0)
    .attr('dy', 0)
    .style('dominant-baseline', 'text-before-edge')
    .style('fill', labelColor)
    .each(function (d) {
      const textGroup = d3.select(this)
      _(d.labelTextLines).each((lineText, i) => {
        textGroup.append('tspan')
          .attr('x', 0)
          .attr('y', i * (d.fontSize + innerPadding))
          .style('font-size', function (d) { return d.fontSize + 'px' })
          .style('font-family', function (d) { return d.fontFamily })
          .style('dominant-baseline', 'text-before-edge')
          .text(lineText)
      })
    })
}

const fadeInLabelsAndLines = ({ canvas, animationConfig }) => {
  const { effect, speed } = animationConfig
  const { svg, cssPrefix } = canvas

  // fade in the labels when the load effect is complete - or immediately if there's no load effect
  let loadSpeed = (effect === 'default') ? speed : 1

  setTimeout(function () {
    let labelFadeInTime = (effect === 'default') ? 400 : 1 // 400 is hardcoded for the present

    svg.selectAll('.' + cssPrefix + 'labelGroup-outer')
      .transition()
      .duration(labelFadeInTime)
      .style('opacity', 1)

    svg.selectAll('g.' + cssPrefix + 'lineGroups')
      .transition()
      .duration(labelFadeInTime)
      .style('opacity', 1)
  }, loadSpeed)
}

const drawOuterLabelLines = ({ canvas, labels, config }) => {
  const { svg, cssPrefix } = canvas

  let basisInterpolationFunction = d3.svg.line()
    .x(d => d.x)
    .y(d => d.y)
    .interpolate('basis')

  const outerLabelLines = labels.map(labelData => {
    const { path, pathType } = computeOuterConnectionLinePath({
      labelData,
      basisInterpolationFunction,
      canvasHeight: parseFloat(canvas.height),
      options: config,
    })

    return {
      id: labelData.id,
      color: labelData.color,
      path,
      pathType,
    }
  })

  let lineGroups = svg.insert('g', `.${cssPrefix}pieChart`) // NB meaning, BEFORE .pieChart
    .attr('class', `${cssPrefix}lineGroups-outer`)
    .style('opacity', 1)

  let lineGroup = lineGroups.selectAll(`.${cssPrefix}lineGroup`)
    .data(outerLabelLines)
    .enter()
    .append('g')
    .attr('class', d => `${cssPrefix}lineGroup pathType-${d.pathType}`)
    .attr('id', d => `${cssPrefix}lineGroup-${d.id}`)

  lineGroup.append('path')
    .attr('d', d => d.path)
    .attr('stroke', d => d.color)
    .attr('stroke-width', 1)
    .attr('fill', 'none')
    .style('opacity', 1)
    .style('display', 'inline')
}

const drawInnerLabelLines = ({ canvas, labels }) => {
  const { svg, cssPrefix, pieCenter, innerRadius } = canvas
  const innerLabelLines = labels.map(labelData => computeInnerLabelLine({ pieCenter, innerRadius, labelData }))

  let lineGroups = svg.insert('g', `.${cssPrefix}pieChart`) // meaning, BEFORE .pieChart
    .attr('class', `${cssPrefix}lineGroups-inner`)
    .style('opacity', 1)

  let lineGroup = lineGroups.selectAll(`.${cssPrefix}lineGroup`)
    .data(innerLabelLines)
    .enter()
    .append('g')
    .attr('class', function (d) { return `${cssPrefix}lineGroup ${cssPrefix}lineGroup-${d[0].id}` })

  let lineFunction = d3.svg.line()
    .x(function (d) { return d.x })
    .y(function (d) { return d.y })
    .interpolate('basis')

  lineGroup.append('path')
    .attr('d', lineFunction)
    .attr('stroke', function (d) { return d[0].color })
    .attr('stroke-width', 1)
    .attr('fill', 'none')
    .style('opacity', 1)
    .style('display', 'inline')
}

const computeInnerLabelLine = ({ pieCenter, innerRadius, labelData }) => {
  const pointAtZeroDegrees = { x: pieCenter.x - innerRadius, y: pieCenter.y }
  let originCoords = rotate(pointAtZeroDegrees, pieCenter, labelData.angle)
  originCoords.id = labelData.id
  originCoords.color = labelData.color

  let end = labelData.lineConnectorCoord

  return [originCoords, end]
}

module.exports = {
  drawLabelSet,
  drawOuterLabelLines,
  drawInnerLabelLines,
  fadeInLabelsAndLines,
}
