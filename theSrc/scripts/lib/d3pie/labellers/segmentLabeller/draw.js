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
    // NB inner labels are drawn over their own segment, and nothing listens to them --
    // addEventHandlers only binds labelGroup-outer -- so leaving them hit-testable meant a hover
    // landing on the label text was swallowed instead of highlighting the segment underneath.
    // Outer labels keep pointer-events, because they have handlers of their own and have no segment
    // beneath them to fall through to.
    .style('pointer-events', (labelType === 'outer') ? null : 'none')
    // TODO repeated code for segments, groupsegments, labels, grouplabels
    .style('cursor', 'pointer')
    .style('-webkit-touch-callout', 'none')
    .style('-webkit-user-select', 'none')
    .style('-khtml-user-select', 'none')
    .style('-moz-user-select', 'none')
    .style('-ms-user-select', 'none')
    .style('user-select', 'none')

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

const LABEL_FADE_IN_MS = 400

// How long the widget is still moving after draw() schedules the load animation. PieWrapper uses this
// to decide when rhtmlwidget-status=ready may be announced.
//
// NB this is `speed`, NOT `speed + LABEL_FADE_IN_MS`, because fadeInLabelsAndLines below is a no-op
// and nothing is animating during that extra 400ms:
//
//   * its first transition takes .labelGroup-outer to opacity 1, but drawLabelSet already sets those
//     same groups to opacity 1, so it tweens 1 to 1;
//   * its second selection, `g.<prefix>lineGroups`, matches nothing -- the elements are classed
//     <prefix>lineGroups-outer and <prefix>lineGroups-inner, and a class selector matches whole
//     tokens rather than prefixes -- and those groups are created at opacity 1 regardless.
//
// So the widget stops moving when the segments finish growing, at `speed`. Including the fade would
// delay ready, and therefore Displayr's export and the visual suite's snapshotDelay, by 400ms per
// initial render for a fade that never happens. It would also leave readyAfterAnimation.jest.test.js
// 400ms of slack, so it would pass even if ready were announced early -- it would not pin the
// boundary it exists to pin.
const totalLoadAnimationDuration = ({ effect, speed }) =>
  (effect === 'default') ? speed : 0

const fadeInLabelsAndLines = ({ canvas, animationConfig }) => {
  const { effect, speed } = animationConfig
  const { svg, cssPrefix } = canvas

  // fade in the labels when the load effect is complete - or immediately if there's no load effect
  let loadSpeed = (effect === 'default') ? speed : 1

  setTimeout(function () {
    let labelFadeInTime = (effect === 'default') ? LABEL_FADE_IN_MS : 1

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

const drawOuterLabelLines = ({ canvas, labels, labelMaxLineAngle, config }) => {
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
      labelMaxLineAngle,
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
  totalLoadAnimationDuration,
}
