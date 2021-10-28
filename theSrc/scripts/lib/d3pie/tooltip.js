import helpers from './helpers'
import d3 from 'd3'
import { splitIntoLines } from './labellers/labelUtils'
import _ from 'lodash'

class Tooltips {
  constructor ({
    canvas,
    dataPoints,
    groupData,
    displayPercentage,
    labelPrefix,
    labelSuffix,
    dataFormatter,
    config,
  }) {
    this.canvas = canvas
    this.dataPoints = dataPoints
    this.groupData = groupData

    this.config = {
      labelPrefix,
      labelSuffix,
      dataFormatter,
      displayPercentage,
      ...config,
    }

    this.totalValue = _(dataPoints).map('value').sum()

    this.dataPoints.forEach(labelData => {
      labelData.tooltipText = this.getTooltipText(labelData)
    })
    this.groupData.forEach(labelData => {
      labelData.tooltipText = this.getTooltipText(labelData)
    })
  }

  getTooltipText (labelData) {
    let labelText
    if (this.config.displayPercentage) {
      labelText = this.config.dataFormatter(labelData.value / this.totalValue * 100)
    } else {
      labelText = this.config.dataFormatter(labelData.value)
    }
    if (this.config.labelPrefix) {
      labelText = this.config.labelPrefix + labelText
    }
    if (this.config.labelSuffix) {
      labelText = labelText + this.config.labelSuffix
    }
    return `${labelData.label}: ${labelText}`
  }

  clearPreviousFromCanvas () {
    const { svg, cssPrefix } = this.canvas
    svg.selectAll(`.${cssPrefix}tooltips`).remove()
    svg.selectAll(`.${cssPrefix}gtooltips`).remove()
  }

  draw () {
    const { cssPrefix, svg } = this.canvas
    const {
      backgroundColor,
      backgroundOpacity,
      borderRadius,
      font,
      fontColor,
      fontSize,
      padding,
    } = this.config.styles
    const getComputedBackgroundColor = (d) => (_.isNull(backgroundColor)) ? d.color : backgroundColor

    const maxWidth = parseFloat(this.canvas.width) * parseFloat(this.config.maxWidth)
    const maxHeight = parseFloat(this.canvas.height) * parseFloat(this.config.maxHeight)
    const maxLines = Math.ceil(maxHeight / parseFloat(fontSize))

    // group the label groups (label, percentage, value) into a single element for simpler positioning
    let tooltips = svg
      .append('g')
      .attr('class', `${cssPrefix}tooltips`)

    tooltips.selectAll(`.${cssPrefix}tooltip`)
      .data(this.dataPoints)
      .enter()
      .append('g')
      .attr('class', `${cssPrefix}tooltip`)
      .attr('id', (d, i) => `${cssPrefix}tooltip${i}`)
      .style('opacity', 0)
      .append('rect')
      .attr({
        rx: borderRadius,
        ry: borderRadius,
        x: -padding,
        y: -(fontSize + padding),
        opacity: backgroundOpacity,
      })
      .style('fill', getComputedBackgroundColor)

    tooltips.selectAll(`.${cssPrefix}tooltip`)
      .data(this.dataPoints)
      .append('text')
      .attr('fill', d => (fontColor) || getTextColorGivenBackground(getComputedBackgroundColor(d), backgroundOpacity)
      )
      .style('font-size', fontSize + 'px')
      .style('font-family', font)
      .style('dominant-baseline', 'text-after-edge')
      .style('text-align', 'start')
      .each(function (d) {
        let textElement = d3.select(this)
        const lines = splitIntoLines(d.tooltipText, maxWidth, fontSize, font, maxLines)

        textElement.text(null)
        _(lines).forEach((lineContent, lineIndex) => {
          textElement.append('tspan')
            .attr('x', 0)
            .attr('y', lineIndex * (parseFloat(fontSize) + 1))
            .text(lineContent)
        })
      })

    tooltips.selectAll(`.${cssPrefix}tooltip rect`)
      .attr({
        width: function (d, i) {
          let dims = helpers.getDimensions(`${cssPrefix}tooltip${i}`)
          return dims.w + (2 * padding)
        },
        height: function (d, i) {
          let dims = helpers.getDimensions(`${cssPrefix}tooltip${i}`)
          return dims.h + (2 * padding)
        },
      })

    if (this.groupData) {
      let groupTips = svg.append('g')
        .attr('class', `${cssPrefix}gtooltips`)

      groupTips.selectAll(`.${cssPrefix}gtooltip`)
        .data(this.groupData)
        .enter()
        .append('g')
        .attr('class', `${cssPrefix}gtooltip`)
        .attr('id', (d, i) => `${cssPrefix}gtooltip${d.id}`)
        .style('opacity', 0)
        .append('rect')
        .attr({
          rx: borderRadius,
          ry: borderRadius,
          x: -padding,
          y: -(fontSize + padding),
          opacity: backgroundOpacity,
        })
        .style('fill', getComputedBackgroundColor)

      groupTips.selectAll(`.${cssPrefix}gtooltip`)
        .data(this.groupData)
        .append('text')
        .attr('fill', d => (fontColor) || getTextColorGivenBackground(getComputedBackgroundColor(d), backgroundOpacity)
        )
        .style('font-size', fontSize + 'px')
        .style('font-family', font)
        .style('dominant-baseline', 'text-after-edge')
        .style('text-align', 'start')
        .each(function (d) {
          let textElement = d3.select(this)
          const lines = splitIntoLines(d.tooltipText, maxWidth, fontSize, font, maxLines)

          textElement.text(null)
          _(lines).forEach((lineContent, lineIndex) => {
            textElement.append('tspan')
              .attr('x', 0)
              .attr('y', lineIndex * (parseFloat(fontSize) + 1))
              .text(lineContent)
          })
        })

      groupTips.selectAll(`.${cssPrefix}gtooltip rect`)
        .attr({
          width: function (d, i) {
            let dims = helpers.getDimensions(`${cssPrefix}gtooltip${i}`)
            return dims.w + (2 * padding)
          },
          height: function (d, i) {
            let dims = helpers.getDimensions(`${cssPrefix}gtooltip${i}`)
            return dims.h + (2 * padding)
          },
        })
    }
  }

  showTooltip (id) {
    this._showTooltip(`#${this.canvas.cssPrefix}tooltip${id}`)
  }

  showGroupTooltip (id) {
    this._showTooltip(`#${this.canvas.cssPrefix}gtooltip${id}`)
  }

  _showTooltip (selector) {
    this.canvas.svg.select(selector).style('opacity', 1)
    this.moveTooltip(selector)
  }

  hideTooltip (id) {
    const selector = `#${this.canvas.cssPrefix}tooltip${id}`
    this._hideTooltip(selector)
  }

  hideGroupTooltip (id) {
    const selector = `#${this.canvas.cssPrefix}gtooltip${id}`
    this._hideTooltip(selector)
  }

  _hideTooltip (selector) {
    this.canvas.svg.select(selector).style('opacity', 0)
    // move the tooltip offscreen. This ensures that when the user next mouseovers the segment the hidden element won't interfere
    this.canvas.svg.select(selector).attr('transform', 'translate(-1000,-1000)')
  }

  moveTooltip (selector) {
    const { padding } = this.config.styles
    const dims = helpers.getDimensions(selector) // TODO should only need to do this once
    this.canvas.svg.select(selector)
      .attr('transform', function () {
        let mouseCoords = d3.mouse(this.parentNode)
        let mousePadding = 15 // we dont want the cursor overlapping the text

        let x = mouseCoords[0] + padding + mousePadding
        let y = (dims.h < 20)
          ? mouseCoords[1] + 20
          : mouseCoords[1] - 2 * padding

        return `translate(${x},${y})`
      })
  }
}

module.exports = Tooltips

// calculate color contrast
// http://stackoverflow.com/questions/11867545/change-text-color-based-on-brightness-of-the-covered-background-area
const rgbRegex = new RegExp(/#([a-f0-9]{2})([a-f0-9]{2})([a-f0-9]{2})/, 'i')
function getTextColorGivenBackground (backgroundColor, backgroundOpacity) {
  const rgbMatch = backgroundColor.match(rgbRegex)
  let red = null
  let green = null
  let blue = null
  let o = 255
  if (rgbMatch) {
    red = parseInt(rgbMatch[1], 16)
    green = parseInt(rgbMatch[2], 16)
    blue = parseInt(rgbMatch[3], 16)
    o = Math.round(((red * 299) + (green * 587) + (blue * 114)) / 1000)
  }

  if (backgroundOpacity === 0) {
    return 'black'
  } else {
    return (o > 125) ? 'black' : 'white'
  }
}
