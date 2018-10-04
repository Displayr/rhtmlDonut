import helpers from './helpers'
import d3 from 'd3'
import { splitIntoLines } from './labellers/labelUtils'
import _ from 'lodash'

let tt = {
  getTooltipText (pie, labelData) {
    let labelText
    if (pie.options.data.display === 'percentage') {
      labelText = pie.options.data.dataFormatter(labelData.value / pie.totalSize * 100)
    } else {
      labelText = pie.options.data.dataFormatter(labelData.value)
    }
    if (pie.options.data.prefix) {
      labelText = pie.options.data.prefix + labelText
    }
    if (pie.options.data.suffix) {
      labelText = labelText + pie.options.data.suffix
    }
    return labelData.label + ': ' + labelText
  },

  addTooltips: function (pie) {
    const maxWidth = parseFloat(pie.options.size.canvasWidth) * parseFloat(pie.options.tooltips.maxWidth)
    const maxHeight = parseFloat(pie.options.size.canvasHeight) * parseFloat(pie.options.tooltips.maxHeight)
    const maxLines = Math.ceil(maxHeight / parseFloat(pie.options.tooltips.styles.fontSize))
    const styles = pie.options.tooltips.styles

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
        rx: styles.borderRadius,
        ry: styles.borderRadius,
        x: -styles.padding,
        y: -(styles.fontSize + styles.padding),
        opacity: styles.backgroundOpacity
      })
      .style('fill', styles.backgroundColor)

    tooltips.selectAll('.' + pie.cssPrefix + 'tooltip')
      .data(pie.options.data.content)
      .append('text')
      .attr('fill', function (d) { return styles.color })
      .style('font-size', function (d) { return styles.fontSize })
      .style('font-family', function (d) { return styles.font })
      .style('dominant-baseline', 'text-after-edge')
      .style('text-align', 'start')
      .each(function (d) {
        let textElement = d3.select(this)
        const tooltipText = tt.getTooltipText(pie, d)
        const lines = splitIntoLines(tooltipText, maxWidth, styles.fontSize, styles.font, maxLines)

        textElement.text(null)
        _(lines).forEach((lineContent, lineIndex) => {
          textElement.append('tspan')
            .attr('x', 0)
            .attr('y', lineIndex * (parseFloat(styles.fontSize) + 1))
            .text(lineContent)
        })
      })

    tooltips.selectAll('.' + pie.cssPrefix + 'tooltip rect')
      .attr({
        width: function (d, i) {
          let dims = helpers.getDimensions(pie.cssPrefix + 'tooltip' + i)
          return dims.w + (2 * styles.padding)
        },
        height: function (d, i) {
          let dims = helpers.getDimensions(pie.cssPrefix + 'tooltip' + i)
          return dims.h + (2 * styles.padding)
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
          rx: styles.borderRadius,
          ry: styles.borderRadius,
          x: -styles.padding,
          y: -(styles.fontSize + styles.padding),
          opacity: styles.backgroundOpacity
        })
        .style('fill', styles.backgroundColor)

      groupTips.selectAll('.' + pie.cssPrefix + 'gtooltip')
        .data(pie.options.groups.content)
        .append('text')
        .attr('fill', function (d) { return styles.color })
        .style('font-size', function (d) { return styles.fontSize })
        .style('font-family', function (d) { return styles.font })
        .style('dominant-baseline', 'text-after-edge')
        .style('text-align', 'start')
        .each(function (d) {
          let textElement = d3.select(this)
          const tooltipText = tt.getTooltipText(pie, d)
          const lines = splitIntoLines(tooltipText, maxWidth, styles.fontSize, styles.font, maxLines)

          textElement.text(null)
          _(lines).forEach((lineContent, lineIndex) => {
            textElement.append('tspan')
              .attr('x', 0)
              .attr('y', lineIndex * (parseFloat(styles.fontSize) + 1))
              .text(lineContent)
          })
        })

      groupTips.selectAll('.' + pie.cssPrefix + 'gtooltip rect')
        .attr({
          width: function (d, i) {
            let dims = helpers.getDimensions(pie.cssPrefix + 'gtooltip' + i)
            return dims.w + (2 * styles.padding)
          },
          height: function (d, i) {
            let dims = helpers.getDimensions(pie.cssPrefix + 'gtooltip' + i)
            return dims.h + (2 * styles.padding)
          }
        })
    }
  },

  showTooltip: function (pie, selector) {
    d3.select(selector)
      .style('opacity', function () { return 1 })

    tt.moveTooltip(pie, selector)
  },

  moveTooltip: function (pie, selector) {
    const dims = helpers.getDimensions(selector) // TODO should only need to do this once
    d3.select(selector)
      .attr('transform', function (d) {
        let mouseCoords = d3.mouse(this.parentNode)
        let mousePadding = 15 // we dont want the cursor overlapping the text

        let x = mouseCoords[0] + pie.options.tooltips.styles.padding + mousePadding
        let y = (dims.h < 20)
          ? mouseCoords[1] + 20
          : mouseCoords[1] - 2 * pie.options.tooltips.styles.padding

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
  }
}

module.exports = tt
