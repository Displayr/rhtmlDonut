import d3 from 'd3'
import segments from '../segments'
import math from '../math'
import { ptInArc } from './labelUtils'
import * as rootLog from 'loglevel'
const labelLogger = rootLog.getLogger('label')

let labels = {

  doLabelling: function (pie) {
    labels.add(pie)
    labels.positionGroupLabels(pie)
  },

  add: function (pie) {
    pie.groupLabelData = []

    let groupLabelGroup = pie.svg.append('g')
      .attr('class', pie.cssPrefix + 'labels-group')
      .selectAll('.' + pie.cssPrefix + 'labelGroup-group')
      .data(pie.options.groups.content)
      .enter()
      .append('g')
      .attr('id', function (d, i) { return pie.cssPrefix + 'labelGroup' + i + '-group' })
      .attr('data-index', function (d, i) { return i })
      .attr('class', pie.cssPrefix + 'labelGroup-group')
      .style('opacity', 1)
      .append('text')
      .attr('x', 0)
      .attr('y', 0)
      .attr('text-anchor', 'middle')
      .style('font-size', pie.options.groups.minFontSize + 'px')
      .style('font-family', pie.options.groups.font)
      .style('fill', pie.options.groups.fontColor)
      .style('font-weight', pie.options.groups.fontWeight)
      .attr('id', function (d, i) { return pie.cssPrefix + 'segmentMainLabel' + i + '-group' })
      .attr('class', pie.cssPrefix + 'segmentMainLabel-group')
      .attr('dy', '.35em')

    groupLabelGroup.append('tspan')
      .attr('x', 0)
      .attr('y', 0)
      .attr('dy', 0)
      .text(function (d) {
        return d.label + ':  '
      })

    groupLabelGroup.append('tspan')
      .attr('dy', 0)
      .text(function (d, i) {
        let val
        if (pie.options.data.display === 'percentage') {
          val = pie.options.data.dataFormatter(d.value / pie.totalValue * 100)
        } else {
          val = pie.options.data.dataFormatter(d.value)
        }
        if (pie.options.labels.segment.prefix) {
          val = pie.options.labels.segment.prefix + val
        }
        if (pie.options.labels.segment.suffix) {
          val = val + pie.options.labels.segment.suffix
        }
        return val
      })
  },

  positionGroupLabels: function (pie) {
    let checkBounds = function (bb, labelData) {
      const { stAngle, edAngle, label: labelText, x: labelX, y: labelY } = labelData
      let center = {
        x: labelX - pie.pieCenter.x,
        y: labelY - pie.pieCenter.y,
      }

      let r1 = 0
      let r2 = pie.innerRadius

      const topLeftPoint = { x: center.x + bb.x, y: center.y + bb.y }
      const topLeftPointIsInsideArc = ptInArc(topLeftPoint, r1, r2, stAngle, edAngle)
      const topRightPointIsInsideArc = ptInArc({ x: topLeftPoint.x + bb.width, y: topLeftPoint.y }, r1, r2, stAngle, edAngle)
      const bottomLeftIsInsideArc = ptInArc({ x: topLeftPoint.x, y: topLeftPoint.y + bb.height }, r1, r2, stAngle, edAngle)
      const bottomRightIsInsideArc = ptInArc({ x: topLeftPoint.x + bb.width, y: topLeftPoint.y + bb.height }, r1, r2, stAngle, edAngle)

      labelLogger.debug(`checkBounds on group label ${labelText}`)
      labelLogger.debug(`  topLeftPointIsInsideArc: ${topLeftPointIsInsideArc}`)
      labelLogger.debug(`  topRightPointIsInsideArc: ${topRightPointIsInsideArc}`)
      labelLogger.debug(`  bottomLeftIsInsideArc: ${bottomLeftIsInsideArc}`)
      labelLogger.debug(`  bottomRightIsInsideArc: ${bottomRightIsInsideArc}`)

      const labelIsContainedWithinArc = (
        topLeftPointIsInsideArc &&
        topRightPointIsInsideArc &&
        bottomLeftIsInsideArc &&
        bottomRightIsInsideArc
      )
      labelData.hide = !labelIsContainedWithinArc
    }

    pie.svg.selectAll('.' + pie.cssPrefix + 'labelGroup-group')
      .each(function (d, i) {
        return labels.getGroupLabelPositions(pie, i)
      })

    let stAngle = 0
    let groupSize = pie.options.groups.fontSize
    d3.selectAll('.' + pie.cssPrefix + 'labelGroup-group')
      .attr('transform', function (d, i) {
        let x, y
        x = pie.groupLabelData[i].x
        y = pie.groupLabelData[i].y
        return 'translate(' + x + ',' + y + ')'
      })
      .each(function (d, i) {
        let bb = this.getBBox()

        pie.groupLabelData[i].stAngle = stAngle
        pie.groupLabelData[i].edAngle = stAngle + math.toDegrees(pie.groupArc.endAngle()(d))
        pie.groupLabelData[i].wrapped = false
        checkBounds(bb, pie.groupLabelData[i])

        if (pie.groupLabelData[i].hide) {
          let thisText = d3.select('#' + pie.cssPrefix + 'segmentMainLabel' + i + '-group')

          thisText.selectAll('tspan')
            .attr('x', 0)
            .attr('dy', function (d, i) {
              let tspans = d3.select(this.parentNode).selectAll('tspan')[0]
              if (i === tspans.length - 1) {
                let tspanLast = tspans[tspans.length - 2]
                return parseFloat(tspanLast.getAttribute('dy')) + 1.1 + 'em'
              } else {
                return this.getAttribute('dy')
              }
            })

          pie.groupLabelData[i].wrapped = true

          bb = this.getBBox()
          checkBounds(bb, pie.groupLabelData[i])
        }

        stAngle = pie.groupLabelData[i].edAngle
      })
      .style('display', function (d, i) {
        return pie.groupLabelData[i].hide ? 'none' : 'inline'
      })
      .each(function (d, i) {
        let thisText = d3.select('#' + pie.cssPrefix + 'segmentMainLabel' + i + '-group')
        let currSize = parseFloat(thisText.style('font-size'))

        while (currSize < groupSize && !pie.groupLabelData[i].hide) {
          currSize += 1
          thisText.style('font-size', currSize + 'px')
          let bb = this.getBBox()
          checkBounds(bb, pie.groupLabelData[i])

          if (pie.groupLabelData[i].hide) {
            // if already wrapped, undo text size increase
            if (pie.groupLabelData[i].wrapped) {
              currSize -= 1
              thisText.style('font-size', currSize + 'px')
              bb = this.getBBox()
              checkBounds(bb, pie.groupLabelData[i])
              break
            } else {
              // try wrapping
              thisText.selectAll('tspan')
                .attr('x', 0)
                .attr('dy', function (d, i) {
                  let tspans = d3.select(this.parentNode).selectAll('tspan')[0]
                  if (i === tspans.length - 1) {
                    let tspanLast = tspans[tspans.length - 2]
                    return parseFloat(tspanLast.getAttribute('dy')) + 1.1 + 'em'
                  } else {
                    return this.getAttribute('dy')
                  }
                })

              bb = this.getBBox()
              checkBounds(bb, pie.groupLabelData[i])

              if (pie.groupLabelData[i].hide) {
                currSize -= 1
                thisText.style('font-size', currSize + 'px')
                thisText.selectAll('tspan')[0][1].removeAttribute('x')
                thisText.selectAll('tspan')[0][1].removeAttribute('dy')
                bb = this.getBBox()
                checkBounds(bb, pie.groupLabelData[i])
              }
              break
            }
          }
        }
      })
      .style('display', function (d, i) {
        return pie.groupLabelData[i].hide ? 'none' : 'inline'
      })
  },

  getGroupLabelPositions: function (pie, i) {
    let labelGroupNode = d3.select('#' + pie.cssPrefix + 'labelGroup' + i + '-group').node()
    if (!labelGroupNode) {
      return
    }
    let labelGroupDims = labelGroupNode.getBBox()

    let angle = segments.getSegmentAngle(i, pie.options.groups.content, pie.totalValue, { midpoint: true })

    let pointAt90Degrees = { x: pie.pieCenter.x, y: pie.pieCenter.y - pie.innerRadius * 0.6 }
    let newCoords = math.rotate(pointAt90Degrees, pie.pieCenter, angle - 90)

    pie.groupLabelData[i] = {
      i: i,
      x: newCoords.x,
      y: newCoords.y,
      w: labelGroupDims.width,
      h: labelGroupDims.height,
    }
  },
}

module.exports = labels
