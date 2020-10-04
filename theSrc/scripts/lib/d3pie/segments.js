import helpers from './helpers'
import math from './math'
import tooltip from './tooltip'
import d3 from 'd3'
import _ from 'lodash'

import { tooltipLogger } from '../logger'

let segments = {

  /**
   * Creates the pie chart segments and displays them according to the desired load effect.
   * @private
   */
  create: function (pie) {
    let pieCenter = pie.pieCenter
    let loadEffects = pie.options.effects.load
    let segmentStroke = pie.options.misc.colors.segmentStroke

    let pieChartElement = pie.svg.insert('g')
      .attr('transform', function () { return math.getPieTranslateCenter(pieCenter) })
      .attr('class', pie.cssPrefix + 'pieChart')

    let arcCalculator = d3.svg.arc()
      .innerRadius(pie.innerRadius)
      .outerRadius(pie.outerRadius)
      .startAngle(0)
      .endAngle(function (d) {
        return (d.value / pie.totalValue) * 2 * Math.PI
      })

    let arcs = pieChartElement.selectAll('.' + pie.cssPrefix + 'arc')
      .data(pie.options.data.content)
      .enter()
      .append('g')
      .attr('class', pie.cssPrefix + 'arc')
      .attr('transform', function (d, i) {
        let angle = 0
        if (i > 0) {
          angle = segments.getSegmentAngle(i - 1, pie.options.data.content, pie.totalValue)
        }
        return 'rotate(' + (angle - 90) + ')'
      })

    // TODO collapse these two sections
    // if we're not fading in the pie, just set the load speed to 0
    let loadSpeed = loadEffects.speed
    if (loadEffects.effect === 'none') {
      arcs.append('path')
        .attr('class', pie.cssPrefix + 'arcEl')
        .attr('id', function (d, i) { return pie.cssPrefix + 'segment' + i })
        .attr('fill', function (d) { return d.color })
        .style('stroke', segmentStroke)
        .style('stroke-width', 1)
        .attr('data-index', function (d, i) { return i })
        .attr('d', function (d) {
          return arcCalculator(d)
        })
    } else {
      arcs.append('path')
        .attr('class', pie.cssPrefix + 'arcEl')
        .attr('id', function (d, i) { return pie.cssPrefix + 'segment' + i })
        .attr('fill', function (d, i) {
          let color = d.color
          if (pie.options.misc.gradient.enabled) {
            color = 'url(#' + pie.cssPrefix + 'grad' + i + ')'
          }
          return color
        })
        .style('stroke', segmentStroke)
        .style('stroke-width', 1)
        .attr('d', function (d) {
          return arcCalculator(d)
        })
        .transition()
        .ease('cubic-in-out')
        .duration(loadSpeed)
        .attr('data-index', function (d, i) { return i })
        .attrTween('d', function (b) {
          let i = d3.interpolate({ value: 0 }, b)
          return function (t) {
            return arcCalculator(i(t))
          }
        })
    }

    // if groups are assigned
    if (pie.options.groups.content) {
      let groupArcCalculator = d3.svg.arc()
        .innerRadius(0)
        .outerRadius(pie.innerRadius)
        .startAngle(0)
        .endAngle(function (d) {
          return (d.value / pie.totalValue) * 2 * Math.PI
        })

      let groupArcs = pieChartElement.selectAll('.' + pie.cssPrefix + 'garc')
        .data(pie.options.groups.content)
        .enter()
        .append('g')
        .attr('class', pie.cssPrefix + 'garc')
        .attr('transform', function (d, i) {
          let angle = 0
          if (i > 0) {
            angle = segments.getSegmentAngle(i - 1, pie.options.groups.content, pie.totalValue)
          }
          return 'rotate(' + (angle - 90) + ')'
        })

      if (loadEffects.effect === 'none') {
        groupArcs.append('path')
          .attr('class', pie.cssPrefix + 'garcEl')
          .attr('id', function (d, i) { return pie.cssPrefix + 'gsegment' + i })
          .attr('fill', function (d, i) {
            return d.color
          })
          .style('stroke', segmentStroke)
          .style('stroke-width', 1)
          .attr('data-index', function (d, i) { return i })
          .attr('d', function (d) {
            return groupArcCalculator(d)
          })
      } else {
        groupArcs.append('path')
          .attr('class', pie.cssPrefix + 'garcEl')
          .attr('id', function (d, i) { return pie.cssPrefix + 'gsegment' + i })
          .attr('fill', function (d, i) {
            return d.color
          })
          .style('stroke', segmentStroke)
          .style('stroke-width', 1)
          .transition()
          .ease('cubic-in-out')
          .duration(loadSpeed)
          .attr('data-index', function (d, i) { return i })
          .attrTween('d', function (b) {
            let i = d3.interpolate({ value: 0 }, b)
            return function (t) {
              return groupArcCalculator(i(t))
            }
          })
      }

      // TODO rename
      pie.groupArc = groupArcCalculator
    }
    // TODO rename
    pie.arc = arcCalculator
  },

  reshapeSegment: function (pie) {
    pie.svg.select('.' + pie.cssPrefix + 'pieChart')
      .attr('transform', function () { return math.getPieTranslateCenter(pie.pieCenter) })

    pie.arc = d3.svg.arc()
      .innerRadius(pie.innerRadius)
      .outerRadius(pie.outerRadius)
      .startAngle(0)
      .endAngle(function (d) {
        return (d.value / pie.totalValue) * 2 * Math.PI
      })

    pie.svg.selectAll('.' + pie.cssPrefix + 'arcEl')
      .attr('d', function (d) {
        return pie.arc(d)
      })

    pie.svg.selectAll('g.' + pie.cssPrefix + 'arc')
      .attr('transform', function (d, i) {
        let angle = 0
        if (i > 0) {
          angle = segments.getSegmentAngle(i - 1, pie.options.data.content, pie.totalValue)
        }
        return 'rotate(' + (angle - 90) + ')'
      })

    if (pie.options.groups.content) {
      pie.groupArc = d3.svg.arc()
        .innerRadius(0)
        .outerRadius(pie.innerRadius)
        .startAngle(0)
        .endAngle(function (d) {
          return (d.value / pie.totalValue) * 2 * Math.PI
        })

      pie.svg.selectAll('.' + pie.cssPrefix + 'garcEl')
        .attr('d', function (d) {
          return pie.groupArc(d)
        })

      pie.svg.selectAll('g.' + pie.cssPrefix + 'garc')
        .attr('transform', function (d, i) {
          let angle = 0
          if (i > 0) {
            angle = segments.getSegmentAngle(i - 1, pie.options.groups.content, pie.totalValue)
          }
          return 'rotate(' + (angle - 90) + ')'
        })
    }
  },

  addSegmentEventHandlers: function (pie, labelsShownLookup) {
    let arc = d3.selectAll('.' + pie.cssPrefix + 'arc')
    let garc = d3.selectAll('.' + pie.cssPrefix + 'garc')
    let lb = d3.selectAll('.' + pie.cssPrefix + 'labelGroup-outer')
    let groupLb = d3.selectAll('.' + pie.cssPrefix + 'labelGroup-group')

    arc.style('cursor', 'pointer')

    lb.style('cursor', 'pointer')
      .style('-webkit-touch-callout', 'none')
      .style('-webkit-user-select', 'none')
      .style('-khtml-user-select', 'none')
      .style('-moz-user-select', 'none')
      .style('-ms-user-select', 'none')
      .style('user-select', 'none')

    // TODO consolidate with outerLabeller version
    const p = (labelDatum) => `${labelDatum.id}(${labelDatum.label.substr(0, 6)})`

    lb.on('mouseover', function (d) {
      tooltipLogger.debug(`mouseover label ${p(d)}`)

      const id = d.id
      const currentEl = d3.select(this)
      let segment, label

      if (currentEl.attr('class') === pie.cssPrefix + 'arc') {
        segment = currentEl.select('path')
        label = d3.select('#' + pie.cssPrefix + 'segmentMainLabel' + id + '-outer')
      } else {
        segment = d3.select('#' + pie.cssPrefix + 'segment' + id)
        label = currentEl.select('text')
      }

      if (pie.options.effects.highlightSegmentOnMouseover) {
        let segColor = d.color
        segment.style('fill', helpers.increaseBrightness(segColor, pie.options.effects.highlightLuminosity))
      }

      if (pie.options.effects.highlightLabelOnMouseover) {
        let lbColor = helpers.increaseBrightness(pie.options.labels.segment.color, pie.options.effects.highlightTextLuminosity)
        label.style('fill', lbColor)
      }

      let isExpanded = segment.attr('class') === pie.cssPrefix + 'expanded'
      segments.onSegmentEvent(pie, pie.options.callbacks.onMouseoverSegment, segment, isExpanded)
    })

    lb.on('mouseout', function (d) {
      tooltipLogger.debug(`mouseout label ${p(d)}`)

      const id = d.id
      const currentEl = d3.select(this)
      let segment, index, label

      if (currentEl.attr('class') === pie.cssPrefix + 'arc') {
        segment = currentEl.select('path')
        label = d3.select('#' + pie.cssPrefix + 'segmentMainLabel' + id + '-outer')
      } else {
        index = currentEl.attr('data-index')
        segment = d3.select('#' + pie.cssPrefix + 'segment' + id)
        label = currentEl.select('text')
      }

      if (pie.options.effects.highlightSegmentOnMouseover) {
        index = segment.attr('data-index')
        let color = d.color
        if (pie.options.misc.gradient.enabled) {
          color = 'url(#' + pie.cssPrefix + 'grad' + index + ')'
        }
        segment.style('fill', color)
      }

      if (pie.options.effects.highlightLabelOnMouseover) {
        label.style('fill', pie.options.labels.segment.color)
      }

      let isExpanded = segment.attr('class') === pie.cssPrefix + 'expanded'
      segments.onSegmentEvent(pie, pie.options.callbacks.onMouseoutSegment, segment, isExpanded)
    })

    arc.on('mouseover', function (d, i) {
      tooltipLogger.debug(`mouseover arc ${p(d)}`)
      let currentEl = d3.select(this)
      let segment, index, label

      if (currentEl.attr('class') === pie.cssPrefix + 'arc') {
        segment = currentEl.select('path')
        label = d3.select('#' + pie.cssPrefix + 'segmentMainLabel' + i + '-outer')
      } else {
        index = currentEl.attr('data-index')
        segment = d3.select('#' + pie.cssPrefix + 'segment' + i)
        label = currentEl.select('text')
      }

      if (pie.options.effects.highlightSegmentOnMouseover) {
        index = segment.attr('data-index')
        let segColor = d.color
        segment.style('fill', helpers.increaseBrightness(segColor, pie.options.effects.highlightLuminosity))
      }
      if (pie.options.effects.highlightLabelOnMouseover) {
        let lbColor = helpers.increaseBrightness(pie.options.labels.segment.color, pie.options.effects.highlightTextLuminosity)
        label.style('fill', lbColor)
      }
      if (pie.options.tooltips.enabled) {
        if (!labelsShownLookup[d.id]) {
          index = segment.attr('data-index')
          tooltip.showTooltip(pie, '#' + pie.cssPrefix + 'tooltip' + index)
        }
      }

      let isExpanded = segment.attr('class') === pie.cssPrefix + 'expanded'
      segments.onSegmentEvent(pie, pie.options.callbacks.onMouseoverSegment, segment, isExpanded)
    })

    arc.on('mousemove', function (d) {
      tooltipLogger.debug(`mousemove arc ${p(d)}`)
      let index = d3.select(this).select('path').attr('data-index')
      tooltip.moveTooltip(pie, '#' + pie.cssPrefix + 'tooltip' + index)
    })

    arc.on('mouseout', function (d, i) {
      tooltipLogger.debug(`mouseout arc ${p(d)}`)
      let currentEl = d3.select(this)
      let segment, index, label

      if (currentEl.attr('class') === pie.cssPrefix + 'arc') {
        segment = currentEl.select('path')
        label = d3.select('#' + pie.cssPrefix + 'segmentMainLabel' + i + '-outer')
      } else {
        index = currentEl.attr('data-index')
        segment = d3.select('#' + pie.cssPrefix + 'segment' + i)
        label = currentEl.select('text')
      }

      if (pie.options.effects.highlightSegmentOnMouseover) {
        index = segment.attr('data-index')
        let color = d.color
        segment.style('fill', color)
      }
      if (pie.options.effects.highlightLabelOnMouseover) {
        label.style('fill', pie.options.labels.segment.color)
      }

      if (pie.options.tooltips.enabled) {
        index = segment.attr('data-index')
        tooltip.hideTooltip(pie, '#' + pie.cssPrefix + 'tooltip' + index)
      }

      let isExpanded = segment.attr('class') === pie.cssPrefix + 'expanded'
      segments.onSegmentEvent(pie, pie.options.callbacks.onMouseoutSegment, segment, isExpanded)
    })

    if (garc) {
      garc.style('cursor', 'pointer')
      groupLb.style('cursor', 'pointer')
        .style('-webkit-touch-callout', 'none')
        .style('-webkit-user-select', 'none')
        .style('-khtml-user-select', 'none')
        .style('-moz-user-select', 'none')
        .style('-ms-user-select', 'none')
        .style('user-select', 'none')

      groupLb.on('mouseover', function (d, i) {
        let segment
        segment = d3.select('#' + pie.cssPrefix + 'gsegment' + i)

        if (pie.options.effects.highlightSegmentOnMouseover) {
          let segColor = d.color
          segment.style('fill', helpers.increaseBrightness(segColor, pie.options.effects.highlightLuminosity))
        }
      })

      groupLb.on('mouseout', function (d, i) {
        let segment
        segment = d3.select('#' + pie.cssPrefix + 'gsegment' + i)

        if (pie.options.effects.highlightSegmentOnMouseover) {
          let color = d.color
          segment.style('fill', color)
        }
      })

      garc.on('mouseover', function (d, i) {
        let currentEl = d3.select(this)
        let segment, index
        segment = currentEl.select('path')

        if (pie.options.effects.highlightSegmentOnMouseover) {
          let segColor = d.color
          segment.style('fill', helpers.increaseBrightness(segColor, pie.options.effects.highlightLuminosity))
        }

        if (pie.options.tooltips.enabled) {
          if (pie.groupLabelData[i].hide) {
            index = segment.attr('data-index')
            tooltip.showTooltip(pie, '#' + pie.cssPrefix + 'gtooltip' + index)
          }
        }

        let isExpanded = segment.attr('class') === pie.cssPrefix + 'expanded'
        segments.onSegmentEvent(pie, pie.options.callbacks.onMouseoverSegment, segment, isExpanded)
      })

      garc.on('mousemove', function () {
        let index = d3.select(this).select('path').attr('data-index')
        tooltip.moveTooltip(pie, '#' + pie.cssPrefix + 'gtooltip' + index)
      })

      garc.on('mouseout', function (d, i) {
        let currentEl = d3.select(this)
        let segment, index
        segment = currentEl.select('path')

        if (pie.options.effects.highlightSegmentOnMouseover) {
          let color = d.color
          segment.style('fill', color)
        }

        if (pie.options.tooltips.enabled) {
          index = segment.attr('data-index')
          tooltip.hideTooltip(pie, '#' + pie.cssPrefix + 'gtooltip' + index)
        }

        let isExpanded = segment.attr('class') === pie.cssPrefix + 'expanded'
        segments.onSegmentEvent(pie, pie.options.callbacks.onMouseoutSegment, segment, isExpanded)
      })
    }
  },

  // helper function used to call the click, mouseover, mouseout segment callback functions
  onSegmentEvent: function (pie, func, segment, isExpanded) {
    if (!_.isFunction(func)) {
      return
    }
    let index = parseInt(segment.attr('data-index'), 10)
    func({
      segment: segment.node(),
      index: index,
      expanded: isExpanded,
      data: pie.options.data.content[index],
    })
  },

  getCentroid: function (el) {
    let bbox = el.getBBox()
    return {
      x: bbox.x + bbox.width / 2,
      y: bbox.y + bbox.height / 2,
    }
  },

  /**
   * General helper function to return a segment's angle, in various different ways.
   * @param index
   * @param opts optional object for fine-tuning exactly what you want.
   */
  getSegmentAngle: function (index, data, totalValue, opts) {
    let options = _.merge({
      // if true, this returns the full angle from the origin. Otherwise it returns the single segment angle
      compounded: true,

      // optionally returns the midpoint of the angle instead of the full angle
      midpoint: false,
    }, opts)

    let currValue = data[index].value
    let fullValue
    if (options.compounded) {
      fullValue = 0

      // get all values up to and including the specified index
      for (let i = 0; i <= index; i++) {
        fullValue += data[i].value
      }
    }

    if (typeof fullValue === 'undefined') {
      fullValue = currValue
    }

    // now convert the full value to an angle
    let angle = (fullValue / totalValue) * 360

    // lastly, if we want the midpoint, factor that sucker in
    if (options.midpoint) {
      let currAngle = (currValue / totalValue) * 360
      angle -= (currAngle / 2)
    }

    return angle
  },
}

module.exports = segments
