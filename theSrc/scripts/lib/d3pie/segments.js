import d3 from 'd3'
import _ from 'lodash'

import helpers from './helpers'
import getSegmentAngle from './segmentsGetSegmentAngleHelper'

class Segments {
  constructor ({
    canvas,
    interactionController,
    dataPoints,
    groupData,
    animationConfig,
    segmentStroke,
    highlightLuminosity,
    textColor,
    tooltipsEnabled,
  }) {
    this.canvas = canvas
    this.interactionController = interactionController
    this.dataPoints = dataPoints
    this.groupData = groupData

    this.config = {
      animation: animationConfig,
      segmentStroke,
      highlightLuminosity,
      textColor,
      tooltipsEnabled,
    }

    this.totalValue = _(dataPoints).map('value').sum()
    this.arc = null
    this.groupArc = null
  }

  // TODO temp code hopefully groupLabeller accesses these
  getArcCalculators () {
    return {
      arc: this.arcCalculator,
      groupArc: this.groupArcCalculator,
    }
  }

  // TODO use animate flag
  draw ({ animate }) {
    let pieChartElement = this.canvas.svg.insert('g')
      .attr('transform', `translate(${this.canvas.pieCenter.x},${this.canvas.pieCenter.y})`)
      .attr('class', this.canvas.cssPrefix + '-pieChart')

    this.arcCalculator = d3.svg.arc()
      .innerRadius(this.canvas.innerRadius)
      .outerRadius(this.canvas.outerRadius)
      .startAngle(0)
      .endAngle(d => (d.value / this.totalValue) * 2 * Math.PI)

    let arcs = pieChartElement.selectAll('.' + this.canvas.cssPrefix + '-arc')
      .data(this.dataPoints)
      .enter()
      .append('g')
      .attr('class', this.canvas.cssPrefix + '-arc')
      .attr('transform', (d, i) => {
        let angle = (i > 0)
          ? getSegmentAngle(i - 1, this.dataPoints, this.totalValue)
          : 0
        return 'rotate(' + (angle - 90) + ')'
      })
      // TODO repeated code for segments, groupsegments, labels, grouplabels
      .style('cursor', 'pointer')
      .style('-webkit-touch-callout', 'none')
      .style('-webkit-user-select', 'none')
      .style('-khtml-user-select', 'none')
      .style('-moz-user-select', 'none')
      .style('-ms-user-select', 'none')
      .style('user-select', 'none')

    const arcsPath = arcs.append('path')
      .attr('class', this.canvas.cssPrefix + '-arcEl')
      .attr('id', (d, i) => `${this.canvas.cssPrefix}segment${i}`)
      .attr('fill', d => d.color)
      .style('stroke', this.config.segmentStroke)
      .style('stroke-width', 1)
      .attr('data-index', (d, i) => i)
      .attr('d', d => this.arcCalculator(d))

    if (animate && this.config.animation.effect === 'default') {
      arcsPath.transition()
        .ease('cubic-in-out')
        .duration(this.config.animation.speed)
        .attrTween('d', b => {
          let i = d3.interpolate({ value: 0 }, b)
          return (t) => this.arcCalculator(i(t))
        })
    }

    // if groups are assigned
    if (this.groupData) {
      this.groupArcCalculator = d3.svg.arc()
        .innerRadius(0)
        .outerRadius(this.canvas.innerRadius)
        .startAngle(0)
        .endAngle(d => (d.value / this.totalValue) * 2 * Math.PI)

      let groupArcs = pieChartElement.selectAll('.' + this.canvas.cssPrefix + '-garc')
        .data(this.groupData)
        .enter()
        .append('g')
        .attr('class', this.canvas.cssPrefix + '-garc')
        .attr('transform', (d, i) => {
          let angle = (i > 0)
            ? getSegmentAngle(i - 1, this.groupData, this.totalValue)
            : 0
          return `rotate(${angle - 90})`
        })
        // TODO repeated code for segments, groupsegments, labels, grouplabels
        .style('cursor', 'pointer')
        .style('-webkit-touch-callout', 'none')
        .style('-webkit-user-select', 'none')
        .style('-khtml-user-select', 'none')
        .style('-moz-user-select', 'none')
        .style('-ms-user-select', 'none')
        .style('user-select', 'none')

      const groupArcPaths = groupArcs.append('path')
        .attr('class', this.canvas.cssPrefix + '-garcEl')
        .attr('id', (d, i) => this.canvas.cssPrefix + 'gsegment' + i)
        .attr('fill', d => d.color)
        .style('stroke', this.config.segmentStroke)
        .style('stroke-width', 1)
        .attr('data-index', (d, i) => i)
        .attr('d', d => this.groupArcCalculator(d))

      if (animate && this.config.animation.effect === 'default') {
        groupArcPaths
          .transition()
          .ease('cubic-in-out')
          .duration(this.config.animation.speed)
          .attrTween('d', b => {
            let i = d3.interpolate({ value: 0 }, b)
            return t => this.groupArcCalculator(i(t))
          })
      }
    }

    this.addEventHandlers()
  }

  clearPreviousFromCanvas () {
    const { svg, cssPrefix } = this.canvas
    svg.selectAll(`.${cssPrefix}-pieChart`).remove()
    svg.selectAll(`.${cssPrefix}-arc`).remove()
    svg.selectAll(`.${cssPrefix}-arcEl`).remove()
    svg.selectAll(`.${cssPrefix}-garc`).remove()
    svg.selectAll(`.${cssPrefix}-garcEl`).remove()
  }

  highlightSegment (id) {
    const segment = this.canvas.svg.select(`#${this.canvas.cssPrefix}segment${id}`)
    segment.style('fill', helpers.increaseBrightness(this.dataPoints[id].color, this.config.highlightLuminosity))
  }

  unhighlightSegment (id) {
    const segment = this.canvas.svg.select(`#${this.canvas.cssPrefix}segment${id}`)
    // TODO question: can i access using ID as index ?
    segment.style('fill', this.dataPoints[id].color)
  }

  highlightGroupSegment (id) {
    let segment = this.canvas.svg.select(`#${this.canvas.cssPrefix}gsegment${id}`)
    segment.style('fill', helpers.increaseBrightness(this.groupData[id].color, this.config.highlightLuminosity))
  }

  unhighlightGroupSegment (id) {
    let segment = this.canvas.svg.select(`#${this.canvas.cssPrefix}gsegment${id}`)
    segment.style('fill', this.groupData[id].color)
  }

  addEventHandlers () {
    const { cssPrefix } = this.canvas
    let allSegments = this.canvas.svg.selectAll('.' + cssPrefix + '-arc')
    let allGroupSegments = this.canvas.svg.selectAll('.' + cssPrefix + '-garc')

    allSegments.on('mouseover', (segmentData, i) => {
      this.interactionController.hoverOnSegment(segmentData.id)
    })

    allSegments.on('mousemove', (segmentData) => {
      this.interactionController.hoverOnSegment(segmentData.id)
    })

    allSegments.on('mouseout', (segmentData, i) => {
      this.interactionController.hoverOffSegment(segmentData.id)
    })

    if (allGroupSegments) {
      allGroupSegments.on('mouseover', (groupData) => {
        this.interactionController.hoverOnGroupSegment(groupData.id)
      })

      allGroupSegments.on('mousemove', (groupData) => {
        this.interactionController.hoverOnGroupSegment(groupData.id)
      })

      allGroupSegments.on('mouseout', (groupData) => {
        this.interactionController.hoverOffGroupSegment(groupData.id)
      })
    }
  }
}

module.exports = Segments
