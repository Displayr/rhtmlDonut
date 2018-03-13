import helpers from './helpers'
import d3 from 'd3'

let tt = {
  addTooltips: function (pie) {
    // group the label groups (label, percentage, value) into a single element for simpler positioning
    let tooltips = d3.select(pie.element).append('g')
      .attr('class', pie.cssPrefix + 'tooltips')

    tooltips.selectAll('.' + pie.cssPrefix + 'tooltip')
      .data(pie.options.data.content)
      .enter()
      .append('g')
      .attr('class', pie.cssPrefix + 'tooltip')
      .attr('id', function (d, i) { return pie.cssPrefix + 'tooltip' + i })
      .style('opacity', 0)
      .append('rect')
      .attr({
        rx: pie.options.tooltips.styles.borderRadius,
        ry: pie.options.tooltips.styles.borderRadius,
        x: -pie.options.tooltips.styles.padding,
        opacity: pie.options.tooltips.styles.backgroundOpacity
      })
      .style('fill', pie.options.tooltips.styles.backgroundColor)

    tooltips.selectAll('.' + pie.cssPrefix + 'tooltip')
      .data(pie.options.data.content)
      .append('text')
      .attr('fill', function (d) { return pie.options.tooltips.styles.color })
      .style('font-size', function (d) { return pie.options.tooltips.styles.fontSize })
      .style('font-family', function (d) { return pie.options.tooltips.styles.font })
      .text(function (d, i) {
        // TODO this routine is repeated
        let val
        if (pie.options.data.display === 'percentage') {
          val = pie.options.data.dataFormatter(d.value / pie.totalSize * 100)
        } else {
          val = pie.options.data.dataFormatter(d.value)
        }
        if (pie.options.data.prefix) {
          val = pie.options.data.prefix + val
        }
        if (pie.options.data.suffix) {
          val = val + pie.options.data.suffix
        }
        return d.label + ': ' + val
        // TODO what to do with this unreachable code
        // let caption = pie.options.tooltips.string
        // if (pie.options.tooltips.type === 'caption') {
        //   caption = d.caption
        // }
        // return tt.replacePlaceholders(pie, caption, i, {
        //   label: d.label,
        //   value: d.value,
        //   percentage: segments.getPercentage(pie, i, pie.options.labels.percentage.decimalPlaces)
        // })
      })

    tooltips.selectAll('.' + pie.cssPrefix + 'tooltip rect')
      .attr({
        width: function (d, i) {
          let dims = helpers.getDimensions(pie.cssPrefix + 'tooltip' + i)
          return dims.w + (2 * pie.options.tooltips.styles.padding)
        },
        height: function (d, i) {
          let dims = helpers.getDimensions(pie.cssPrefix + 'tooltip' + i)
          return dims.h + (2 * pie.options.tooltips.styles.padding)
        },
        y: function (d, i) {
          let dims = helpers.getDimensions(pie.cssPrefix + 'tooltip' + i)
          return -(dims.h / 2) + 1
        }
      })

    if (pie.options.groups.content) {
      let groupTips = d3.select(pie.element).append('g')
        .attr('class', pie.cssPrefix + 'gtooltips')

      groupTips.selectAll('.' + pie.cssPrefix + 'gtooltip')
        .data(pie.options.groups.content)
        .enter()
        .append('g')
        .attr('class', pie.cssPrefix + 'gtooltip')
        .attr('id', function (d, i) { return pie.cssPrefix + 'gtooltip' + i })
        .style('opacity', 0)
        .append('rect')
        .attr({
          rx: pie.options.tooltips.styles.borderRadius,
          ry: pie.options.tooltips.styles.borderRadius,
          x: -pie.options.tooltips.styles.padding,
          opacity: pie.options.tooltips.styles.backgroundOpacity
        })
        .style('fill', pie.options.tooltips.styles.backgroundColor)

      groupTips.selectAll('.' + pie.cssPrefix + 'gtooltip')
        .data(pie.options.groups.content)
        .append('text')
        .attr('fill', function (d) { return pie.options.tooltips.styles.color })
        .style('font-size', function (d) { return pie.options.tooltips.styles.fontSize })
        .style('font-family', function (d) { return pie.options.tooltips.styles.font })
        .text(function (d, i) {
          // TODO this logic is repeated
          let val
          if (pie.options.data.display === 'percentage') {
            val = pie.options.data.dataFormatter(d.value / pie.totalSize * 100)
          } else {
            val = pie.options.data.dataFormatter(d.value)
          }
          if (pie.options.data.prefix) {
            val = pie.options.data.prefix + val
          }
          if (pie.options.data.suffix) {
            val = val + pie.options.data.suffix
          }
          return d.label + ': ' + val
          // TODO what to do with this unreachable code ?
          // let caption = pie.options.tooltips.string
          // if (pie.options.tooltips.type === 'caption') {
          //   caption = d.caption
          // }
          // return tt.replacePlaceholders(pie, caption, i, {
          //   label: d.label,
          //   value: d.value,
          //   percentage: segments.getPercentage(pie, i, pie.options.labels.percentage.decimalPlaces)
          // })
        })

      groupTips.selectAll('.' + pie.cssPrefix + 'gtooltip rect')
        .attr({
          width: function (d, i) {
            let dims = helpers.getDimensions(pie.cssPrefix + 'gtooltip' + i)
            return dims.w + (2 * pie.options.tooltips.styles.padding)
          },
          height: function (d, i) {
            let dims = helpers.getDimensions(pie.cssPrefix + 'gtooltip' + i)
            return dims.h + (2 * pie.options.tooltips.styles.padding)
          },
          y: function (d, i) {
            let dims = helpers.getDimensions(pie.cssPrefix + 'gtooltip' + i)
            return -(dims.h / 2) + 1
          }
        })
    }
  },

  showTooltip: function (pie, selector) {
    /* let fadeInSpeed = pie.options.tooltips.styles.fadeInSpeed;
     if (tt.currentTooltip === index) {
     fadeInSpeed = 1;
     } */

    // tt.currentTooltip = index;
    d3.select(selector)
      .style('opacity', function () { return 1 })

    tt.moveTooltip(pie, selector)
  },

  moveTooltip: function (pie, selector) {
    d3.select(selector)
      .attr('transform', function (d) {
        let mouseCoords = d3.mouse(this.parentNode)
        let x = mouseCoords[0] + pie.options.tooltips.styles.padding + 2
        let y = mouseCoords[1] - (2 * pie.options.tooltips.styles.padding) - 2
        return 'translate(' + x + ',' + y + ')'
      })
  },

  hideTooltip: function (pie, selector) {
    d3.select(selector)
      .style('opacity', function () { return 0 })

    // move the tooltip offscreen. This ensures that when the user next mouseovers the segment the hidden
    // element won't interfere
    d3.select(selector)
      .attr('transform', function (d, i) {
        // klutzy, but it accounts for tooltip padding which could push it onscreen
        let x = pie.options.size.canvasWidth + 1000
        let y = pie.options.size.canvasHeight + 1000
        return 'translate(' + x + ',' + y + ')'
      })
  },

  replacePlaceholders: function (pie, str, index, replacements) {
    // if the user has defined a placeholderParser function, call it before doing the replacements
    if (helpers.isFunction(pie.options.tooltips.placeholderParser)) {
      pie.options.tooltips.placeholderParser(index, replacements)
    }

    let replacer = function () {
      return function (match) {
        let placeholder = arguments[1]
        if (replacements.hasOwnProperty(placeholder)) {
          return replacements[arguments[1]]
        } else {
          return arguments[0]
        }
      }
    }
    return str.replace(/\{(\w+)\}/g, replacer(replacements))
  }
}

module.exports = tt
