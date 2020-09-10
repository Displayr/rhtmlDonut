import d3 from 'd3'
import _ from 'lodash'
import computeOuterConnectionLinePath from './computeOuterConnectionLinePath'
import { rotate } from '../../math'

const clearPrevious = (parentContainer, cssPrefix) => {
  parentContainer.selectAll(`.${cssPrefix}labels-outer`).remove()
  parentContainer.selectAll(`.${cssPrefix}labels-inner`).remove()
  parentContainer.selectAll(`.${cssPrefix}labels-extra`).remove() // TODO dont need
  parentContainer.selectAll(`.${cssPrefix}labels-group`).remove()
  parentContainer.selectAll(`.${cssPrefix}lineGroups-outer`).remove()
  parentContainer.selectAll(`.${cssPrefix}lineGroups-inner`).remove()
  parentContainer.selectAll(`.${cssPrefix}tooltips`).remove() // TODO shouldn't be done here. Also wont work any more (not in parentContainer)
  parentContainer.selectAll(`.${cssPrefix}gtooltips`).remove() // TODO shouldn't be done here. Also wont work any more (not in parentContainer)
}

const drawOuterLabels = (pie) => {
  drawLabelSet({
    outerContainer: pie.svg,
    cssPrefix: pie.cssPrefix,
    labelData: pie.outerLabelData,
    labelColor: pie.options.labels.segment.color,
    innerPadding: pie.options.labels.segment.innerPadding,
    labelType: 'outer',
  })
}

const drawInnerLabels = (pie) => {
  drawLabelSet({
    outerContainer: pie.svg,
    cssPrefix: pie.cssPrefix,
    labelData: pie.innerLabelData,
    labelColor: pie.options.labels.segment.color,
    innerPadding: pie.options.labels.segment.innerPadding,
    labelType: 'inner',
  })
}

const drawLabelSet = ({
  outerContainer,
  cssPrefix,
  labelData,
  labelColor,
  innerPadding,
  labelType,
}) => {
  let labelContainer = outerContainer.insert('g', `.${cssPrefix}labels-${labelType}`)
    .attr('class', `${cssPrefix}labels-${labelType}`)

  let labelGroup = labelContainer.selectAll(`.${cssPrefix}labelGroup-${labelType}`)
    .data(labelData)
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

const fadeInLabelsAndLines = (pie) => {
  // fade in the labels when the load effect is complete - or immediately if there's no load effect
  let loadSpeed = (pie.options.effects.load.effect === 'default') ? pie.options.effects.load.speed : 1
  setTimeout(function () {
    let labelFadeInTime = (pie.options.effects.load.effect === 'default') ? 400 : 1 // 400 is hardcoded for the present

    d3.selectAll('.' + pie.cssPrefix + 'labelGroup-outer')
      .transition()
      .duration(labelFadeInTime)
      .style('opacity', 1)

    d3.selectAll('g.' + pie.cssPrefix + 'lineGroups')
      .transition()
      .duration(labelFadeInTime)
      .style('opacity', 1)

    // once everything's done loading, trigger the onload callback if defined
    if (_.isFunction(pie.options.callbacks.onload)) {
      setTimeout(function () {
        try {
          pie.options.callbacks.onload()
        } catch (e) { }
      }, labelFadeInTime)
    }
  }, loadSpeed)
}

const drawOuterLabelLines = (pie) => {
  let basisInterpolationFunction = d3.svg.line()
    .x(d => d.x)
    .y(d => d.y)
    .interpolate('basis')

  const outerLabelLines = pie.outerLabelData.map(labelData => {
    const { path, pathType } = computeOuterConnectionLinePath({
      labelData,
      basisInterpolationFunction,
      canvasHeight: parseFloat(pie.options.size.canvasHeight),
      options: pie.options.labels.lines.outer,
    })

    return {
      id: labelData.id,
      color: labelData.color,
      path,
      pathType,
    }
  })

  let lineGroups = pie.svg.insert('g', `.${pie.cssPrefix}pieChart`) // meaning, BEFORE .pieChart
    .attr('class', `${pie.cssPrefix}lineGroups-outer`)
    .style('opacity', 1)

  let lineGroup = lineGroups.selectAll(`.${pie.cssPrefix}lineGroup`)
    .data(outerLabelLines)
    .enter()
    .append('g')
    .attr('class', d => `${pie.cssPrefix}lineGroup pathType-${d.pathType}`)
    .attr('id', d => `${pie.cssPrefix}lineGroup-${d.id}`)

  lineGroup.append('path')
    .attr('d', d => d.path)
    .attr('stroke', d => d.color)
    .attr('stroke-width', 1)
    .attr('fill', 'none')
    .style('opacity', 1)
    .style('display', 'inline')
}

const drawInnerLabelLines = (pie) => {
  pie.innerLabelLines = pie.innerLabelData
    .map(labelData => {
      return computeInnerLabelLine({
        pieCenter: pie.pieCenter,
        innerRadius: pie.innerRadius,
        labelData,
      })
    })

  let lineGroups = pie.svg.insert('g', `.${pie.cssPrefix}pieChart`) // meaning, BEFORE .pieChart
    .attr('class', `${pie.cssPrefix}lineGroups-inner`)
    .style('opacity', 1)

  let lineGroup = lineGroups.selectAll(`.${pie.cssPrefix}lineGroup`)
    .data(pie.innerLabelLines)
    .enter()
    .append('g')
    .attr('class', function (d) { return `${pie.cssPrefix}lineGroup ${pie.cssPrefix}lineGroup-${d[0].id}` })

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
  clearPrevious,
  drawOuterLabels,
  drawInnerLabels,
  drawOuterLabelLines,
  drawInnerLabelLines,
  fadeInLabelsAndLines,
}
