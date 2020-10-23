import d3 from 'd3'
import math from '../math'
import { ptInArc } from './labelUtils'
import { labelLogger } from '../../logger'
import getSegmentAngle from '../segmentsGetSegmentAngleHelper'
import _ from 'lodash'

// TODO convert this._settings.valuesDisplay === 'percentage' and pie.options.data.display to something less dumb
// TODO this is due for a rewrite. Amazed it works. Probably does not with large group names
class GroupLabeller {
  constructor ({
    canvas,
    interactionController,
    config,
    dataPoints,
    dataFormatter,
    displayPercentage,
    labelPrefix,
    labelSuffix,
    groupArcCalculator,
  }) {
    this.canvas = canvas
    this.interactionController = interactionController
    this.groupArcCalculator = groupArcCalculator
    this.groupData = []

    this.config = {
      labelPrefix,
      labelSuffix,
      dataFormatter,
      displayPercentage,
      ...config,
    }

    this.totalValue = _(dataPoints).map('value').sum()
  }

  clearPreviousFromCanvas () {
    const { svg, cssPrefix } = this.canvas
    svg.selectAll(`.${cssPrefix}labels-group`).remove()
    svg.selectAll(`.${cssPrefix}labelGroup-group`).remove()
  }

  draw () {
    const { cssPrefix, svg } = this.canvas
    this.groupData = []

    let groupLabelGroup = svg.append('g')
      .attr('class', `${cssPrefix}labels-group`)
      .selectAll(`.${cssPrefix}labelGroup-group`)
      .data(this.config.content)
      .enter()
      .append('g')
      .attr('id', (d, i) => `${cssPrefix}labelGroup${i}-group`)
      .attr('class', `${cssPrefix}labelGroup-group`)
      .attr('data-index', (d, i) => i)
      .style('opacity', 1)
      .append('text')
      .attr('class', cssPrefix + 'segmentMainLabel-group')
      .attr('id', (d, i) => `${cssPrefix}segmentMainLabel${i}-group`)
      .attr('x', 0)
      .attr('y', 0)
      .attr('text-anchor', 'middle')
      .style('font-size', this.config.minFontSize + 'px')
      .style('font-family', this.config.font)
      .style('fill', this.config.fontColor)
      .style('font-weight', this.config.fontWeight)
      .attr('dy', '.35em')
      // TODO repeated code for segments, groupsegments, labels, grouplabels
      .style('cursor', 'pointer')
      .style('-webkit-touch-callout', 'none')
      .style('-webkit-user-select', 'none')
      .style('-khtml-user-select', 'none')
      .style('-moz-user-select', 'none')
      .style('-ms-user-select', 'none')
      .style('user-select', 'none')

    groupLabelGroup.append('tspan')
      .attr('x', 0)
      .attr('y', 0)
      .attr('dy', 0)
      .text(d => `${d.label}:  `)

    groupLabelGroup.append('tspan')
      .attr('dy', 0)
      .text((d, i) => {
        let val
        if (this.config.displayPercentage) {
          val = this.config.dataFormatter(d.value / this.totalValue * 100)
        } else {
          val = this.config.dataFormatter(d.value)
        }
        if (this.config.labelPrefix) {
          val = this.config.labelPrefix + val
        }
        if (this.config.labelSuffix) {
          val = val + this.config.labelSuffix
        }
        return val
      })

    this.positionGroupLabels()
  }

  checkBounds (i) {
    const { cssPrefix, innerRadius, pieCenter, svg } = this.canvas
    const el = svg.select(`#${cssPrefix}labelGroup${i}-group`)
    let bb = el.node().getBBox()

    const labelData = this.groupData[i]
    const { stAngle, edAngle, label: labelText, x: labelX, y: labelY } = labelData
    let center = {
      x: labelX - pieCenter.x,
      y: labelY - pieCenter.y,
    }

    let r1 = 0
    let r2 = innerRadius

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

  positionGroupLabels () {
    const { cssPrefix, svg } = this.canvas

    svg.selectAll(`.${cssPrefix}labelGroup-group`)
      .each((d, i) => this.getGroupLabelPosition(i))

    let stAngle = 0
    let groupSize = this.config.fontSize
    d3.selectAll(`.${cssPrefix}labelGroup-group`)
      .attr('transform', (d, i) => {
        let x = this.groupData[i].x
        let y = this.groupData[i].y
        return `translate(${x},${y})`
      })
      .each((d, i) => {
        this.groupData[i].stAngle = stAngle
        this.groupData[i].edAngle = stAngle + math.toDegrees(this.groupArcCalculator.endAngle()(d))
        this.groupData[i].wrapped = false

        this.checkBounds(i)

        if (this.groupData[i].hide) {
          let thisText = d3.select(`#${cssPrefix}segmentMainLabel${i}-group`)

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

          this.groupData[i].wrapped = true
          this.checkBounds(i)
        }

        stAngle = this.groupData[i].edAngle
      })
      .style('display', (d, i) => this.groupData[i].hide ? 'none' : 'inline')
      .each((d, i) => {
        let thisText = d3.select(`#${cssPrefix}segmentMainLabel${i}-group`)
        let currSize = parseFloat(thisText.style('font-size'))

        while (currSize < groupSize && !this.groupData[i].hide) {
          currSize += 1
          thisText.style('font-size', currSize + 'px')
          this.checkBounds(i)

          if (this.groupData[i].hide) {
            // if already wrapped, undo text size increase
            if (this.groupData[i].wrapped) {
              currSize -= 1
              thisText.style('font-size', currSize + 'px')
              this.checkBounds(i)
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

              this.checkBounds(i)

              if (this.groupData[i].hide) {
                currSize -= 1
                thisText.style('font-size', currSize + 'px')
                thisText.selectAll('tspan')[0][1].removeAttribute('x')
                thisText.selectAll('tspan')[0][1].removeAttribute('dy')
                this.checkBounds(i)
              }
              break
            }
          }
        }
      })
      .style('display', (d, i) => this.groupData[i].hide ? 'none' : 'inline')
  }

  getGroupLabelPosition (i) {
    const { cssPrefix, innerRadius, pieCenter } = this.canvas
    let labelGroupNode = d3.select(`#${cssPrefix}labelGroup${i}-group`).node()
    if (!labelGroupNode) {
      return
    }
    let labelGroupDims = labelGroupNode.getBBox()
    let angle = getSegmentAngle(i, this.config.content, this.totalValue, { midpoint: true })

    let pointAt90Degrees = { x: pieCenter.x, y: pieCenter.y - innerRadius * 0.6 }
    let newCoords = math.rotate(pointAt90Degrees, pieCenter, angle - 90)

    this.groupData[i] = {
      i: i,
      x: newCoords.x,
      y: newCoords.y,
      w: labelGroupDims.width,
      h: labelGroupDims.height,
    }
  }

  addEventHandlers () {
    const cssPrefix = this.canvas.cssPrefix
    let allGroupLabels = d3.selectAll(`.${cssPrefix}labelGroup-group`)

    allGroupLabels.on('mouseover', (groupLabelData, i) => {
      this.interactionController.hoverOnGroupSegmentLabel(groupLabelData.id)
    })

    allGroupLabels.on('mouseout', (groupLabelData, i) => {
      this.interactionController.hoverOffGroupSegmentLabel(groupLabelData.id)
    })
  }

  isLabelShown (id) {
    return !this.groupData[id].hide
  }
}

module.exports = GroupLabeller
