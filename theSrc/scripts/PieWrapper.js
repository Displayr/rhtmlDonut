import $ from 'jquery'
import _ from 'lodash'
import d3 from 'd3'
import d3pie from './lib/d3pie/d3pie'
import Rainbow from './lib/d3pie/rainbowvis'
import {Footer, Title, Subtitle} from 'rhtmlParts'
import * as rootLog from 'loglevel'
const layoutLogger = rootLog.getLogger('layout')

class PieWrapper {
  static uniqueId () {
    return this._palmTreeInstanceCounter++
  }

  static initClass () {
    this._palmTreeInstanceCounter = 0
  }

  constructor () {
    this.uniqueId = PieWrapper.uniqueId()
    this.uniqueCssPrefix = `donut-${this.uniqueId}`
    this.titleHeight = 0
    this.subtitleHeight = 0
    this.footerHeight = 0
  }

  draw (element) {
    const {width, height} = getContainerDimensions(_.has(element, 'length') ? element[0] : element)
    console.log(`rhtmlDonut.renderValue() called. Width: ${width}, height: ${height}`)
    $(element).find('*').remove()

    this.outerSvg = d3.select(element)
      .append('svg')
      .attr('class', 'svgContent')
      .attr('width', width)
      .attr('height', height)

    // TODO make title/subtitle/footer handle being instantiated with no text : return zero, play nice. Push all these if concerns into module
    // TODO also currently need to specify all the things
    if (this._settings.title) {
      this.title = new Title({
        text: this._settings.title,
        fontColor: this._settings.titleFontColor,
        fontSize: this._settings.titleFontSize,
        fontFamily: this._settings.titleFontFamily,
        topPadding: this._settings.titleTopPadding,
        bottomPadding: 10
      })
      this.title.setX(width / 2)
      this.title.drawWith(this.uniqueCssPrefix, this.outerSvg)
      this.titleHeight = this.title.getHeight()
    }

    if (this._settings.subtitle) {
      this.subtitle = new Subtitle({
        subtitleText: this._settings.subtitle,
        subtitleFontColor: this._settings.subtitleFontColor,
        subtitleFontSize: this._settings.subtitleFontSize,
        subtitleFontFamily: this._settings.subtitleFontFamily,
        yOffset: this.titleHeight,
        bottomPadding: 10
      })
      this.subtitle.setX(width / 2)
      this.subtitle.drawWith(this.uniqueCssPrefix, this.outerSvg)
      this.subtitleHeight = this.subtitle.getHeight()
    }

    if (this._settings.footer) {
      this.footer = new Footer({
        footerText: this._settings.footer,
        footerFontColor: this._settings.footerFontColor,
        footerFontSize: this._settings.footerFontSize,
        footerFontFamily: this._settings.footerFontFamily,
        containerHeight: height,
        topPadding: 10,
        bottomPadding: 10,
        innerPadding: 2
      })
      this.footer.setX(width / 2)
      this.footer.drawWith(this.uniqueCssPrefix, this.outerSvg)
      this.footerHeight = this.footer.getHeight()
    }

    const donutPlotHeight = height -
      this.titleHeight -
      this.subtitleHeight -
      this.footerHeight

    layoutLogger.info(`canvas height: ${height}`)
    layoutLogger.info(`this.titleHeight: ${this.titleHeight}`)
    layoutLogger.info(`this.subtitleHeight: ${this.subtitleHeight}`)
    layoutLogger.info(`this.footerHeight: ${this.footerHeight}`)
    layoutLogger.info(`setting donutPlot width: ${width}`)
    layoutLogger.info(`setting donutPlot height: ${donutPlotHeight}`)

    const pieGroupYOffset = this.titleHeight + this.subtitleHeight
    const pieGroup = this.outerSvg.append('g')
      .attr('class', 'pieGroup')
      .attr('transform', `translate(0,${pieGroupYOffset})`)

    // NB pie rect is for debugpurposes only
    // TODO add a show/hide attribute controlled by the debug settings
    pieGroup.append('rect')
      .attr('class', 'pieRect')
      .attr('width', width)
      .attr('height', donutPlotHeight)

    this._drawPie({ element: pieGroup, height: donutPlotHeight, width })
  }

  _drawPie ({element, width, height}) {
    let dataFormatter = null
    if (this._settings.valuesDec >= 0) {
      dataFormatter = d3.format(',.' + this._settings.valuesDec + 'f')
    } else {
      dataFormatter = d3.format(',.1f')
    }

    // TODO remove all defaults here that are covered in defaultSettings. May require a "delete all null/undefined step in the middle"

    this.pie = new d3pie(element.node(), { // eslint-disable-line new-cap
      size: {
        canvasWidth: width,
        canvasHeight: height,
        pieInnerRadius: this._settings.innerRadius,
        labelOffsetPercentage: this._settings.labelOffsetPercentage
      },
      data: {
        sortOrder: this._settings.valuesOrder,
        prefix: this._settings.prefix,
        suffix: this._settings.suffix,
        color: this._settings.valuesColor,
        dataFormatter: dataFormatter,
        display: this._settings.valuesDisplay,
        minAngle: this._settings.minAngle,
        content: this.pieData
      },
      labels: {
        outer: {
          innerLabels: this._settings.labelsInner,
          displayPercentage: (this._settings.valuesDisplay === 'percentage'),
          displayDecimals: this._settings.valuesDec,
          innerPadding: this._settings.labelsInnerPadding,
          outerPadding: this._settings.labelsOuterPadding,
          liftOffAngle: this._settings.labelLiftOffAngle,
          maxVerticalOffset: this._settings.labelMaxVerticalOffset,
          labelMaxLineAngle: this._settings.labelMaxLineAngle,
          maxWidthPercentage: this._settings.labelsMaxWidthPercentage,
          iterationMinIncrement: this._settings.labelIterationMinIncrement,
          iterationMaxIncrement: this._settings.labelIterationMaxIncrement
        },
        mainLabel: {
          color: this._settings.labelsColor,
          font: this._settings.labelsFont,
          fontSize: this._settings.labelsSize,
          minFontSize: this._settings.labelsMinFontSize
        },
        lines: {
          style: 'aligned'
        }
      },
      tooltips: {
        enabled: true
      },
      misc: {
        colors: {
          segments: this._settings.valuesColor,
          segmentStroke: this._settings.borderColor
        },
        cssPrefix: this.uniqueCssPrefix
      },
      groups: {
        content: this.groupData,
        font: this._settings.groupsFont,
        fontSize: this._settings.groupsSize,
        fontColor: this._settings.groupsFontColor,
        minFontSize: this._settings.groupLabelsMinFontSize
      },
      debug: {
        draw_placement_lines: this._settings.debug_draw_placement_lines
      }
    })
  }

  resize (element) {
    const { width, height } = getContainerDimensions(_.has(element, 'length') ? element[0] : element)
    console.log(`rhtmlDonut.resize(width=${width}, height=${height}) called`)

    if (width < 200 || height < 200) { return }

    d3.select(element).select('svg')
      .attr('width', width)
      .attr('height', height)

    if (this.title) {
      this.title.setX(width / 2)
      this.title.drawWith(this.uniqueCssPrefix, this.outerSvg)
      this.titleHeight = this.title.getHeight()
    }

    if (this.subtitle) {
      this.subtitle.setX(width / 2)
      this.subtitle.drawWith(this.uniqueCssPrefix, this.outerSvg)
      this.subtitleHeight = this.subtitle.getHeight()
    }

    if (this.footer) {
      this.footer.setX(width / 2)
      this.footer.setContainerHeight(height)
      this.footer.drawWith(this.uniqueCssPrefix, this.outerSvg)
      this.footerHeight = this.footer.getHeight()
    }

    const donutPlotHeight = height -
      this.titleHeight -
      this.subtitleHeight -
      this.footerHeight

    layoutLogger.info(`setting donutPlot width: ${width}`)
    layoutLogger.info(`setting donutPlot height: ${donutPlotHeight}`)
    layoutLogger.info(`canvas height: ${height}`)

    const pieGroupYOffset = this.titleHeight + this.subtitleHeight
    this.outerSvg.select('.pieGroup')
      .attr('transform', `translate(0,${pieGroupYOffset})`)

    this.outerSvg.select('.pieRect')
      .attr('width', width)
      .attr('height', donutPlotHeight)

    // NB violating encapsulation by directly modifying internals
    this.pie.options.size.canvasWidth = width
    this.pie.options.size.canvasHeight = donutPlotHeight

    this.pie.redrawWithoutLoading()
  }

  setConfig (newConfig) {
    this._settings = newConfig.settings
    this._values = newConfig.values
    this._valuesCount = newConfig.values.length
    this._labels = newConfig.labels

    this._initLogger(this._settings.logLevel)

    if (this._settings.groups) {
      this.groupData = this._processGroupConfig()
    }

    if (!this._settings.valuesColor) {
      this._settings.valuesColor = this._computeColors()
    }

    this.pieData = []
    for (let i = 0; i < this._valuesCount; i++) {
      this.pieData.push({
        label: this._labels[i],
        value: this._values[i],
        index: i,
        color: this._settings.valuesColor[i % this._settings.valuesColor.length],
        group: (this._settings.groups) ? this._settings.groups[i] : null
      })
    }
  }

  _computeColors () {
    if (this._settings.groups) {
      return this._computeColorsUsingGroups()
    } else if (this._settings.gradient) {
      return this._computeColorsUsingGradient()
    } else {
      return d3.scale.category20().range()
    }
  }

  _computeColorsUsingGroups () {
    const groupDataLookup = _.transform(this.groupData, (gdLookup, groupData) => {
      gdLookup[groupData.label] = Object.assign({}, groupData, { runningCount: 0 })
      return gdLookup
    }, {})

    return this._settings.groups.map(groupName => {
      if (!_.has(groupDataLookup, groupName)) {
        console.error(`group ${groupName} in settings.groups has no group data`)
        return 'black'
      }
      const baseColor = groupDataLookup[groupName].color
      const deltaLum = Math.min(0.2, 0.3 / groupDataLookup[groupName].count)
      const lum = 100 * deltaLum * (1 + groupDataLookup[groupName].runningCount++)
      try {
        return increaseBrightness(baseColor, lum)
      } catch (e) {
        console.error('color error, baseColor is' + baseColor)
        return baseColor
      }
    })
  }

  _computeColorsUsingGradient () {
    let colGrad = new Rainbow()
    colGrad.setSpectrum('darkblue', 'yellow')
    colGrad.setNumberRange(0, this._valuesCount - 1)

    return _.range(this._valuesCount).map(i => '#' + colGrad.colourAt(i))
  }

  _processGroupConfig () {
    const groupData = []

    const groupsColor = this._settings.groupsColor || d3.scale.category20().range()

    for (let i = 0; i < this._settings.groupsSums.length; i++) {
      groupData.push({
        label: this._settings.groupsNames[i],
        value: this._settings.groupsSums[i],
        color: groupsColor[i % groupsColor.length],
        count: this._settings.groupsCounts[i]
      })
    }
    return groupData
  }

  _initLogger (loggerSettings = 'info') {
    if (_.isNull(loggerSettings)) {
      return
    }
    if (_.isString(loggerSettings)) {
      rootLog.setLevel(loggerSettings)
      _(PieWrapper.getLoggerNames()).each((loggerName) => { rootLog.getLogger(loggerName).setLevel(loggerSettings) })
      return
    }
    _(loggerSettings).each((loggerLevel, loggerName) => {
      if (loggerName === 'default') {
        rootLog.setLevel(loggerLevel)
      } else {
        rootLog.getLogger(loggerName).setLevel(loggerLevel)
      }
    })
  }

  static getLoggerNames () {
    return ['layout', 'tooltip', 'label']
  }
}
PieWrapper.initClass()

// TODO to utils
function getContainerDimensions (rootElement) {
  try {
    const jqueryRoot = $(rootElement)
    return {
      width: jqueryRoot.width(),
      height: jqueryRoot.height()
    }
  } catch (err) {
    console.error(`fail in getContainerDimensions: ${err}`)
    return null
  }
}

// TODO to utils
// from http://stackoverflow.com/questions/6443990/javascript-calculate-brighter-colour
function increaseBrightness (hex, percent) {
  // strip the leading # if it's there
  hex = hex.replace(/^\s*#|\s*$/g, '')

  // convert 3 char codes --> 6, e.g. `E0F` --> `EE00FF`
  if (hex.length === 3) {
    hex = hex.replace(/(.)/g, '$1$1')
  }

  let r = parseInt(hex.substr(0, 2), 16)
  let g = parseInt(hex.substr(2, 2), 16)
  let b = parseInt(hex.substr(4, 2), 16)

  return '#' +
    ((0 | (1 << 8) + r + (256 - r) * percent / 100).toString(16)).substr(1) +
    ((0 | (1 << 8) + g + (256 - g) * percent / 100).toString(16)).substr(1) +
    ((0 | (1 << 8) + b + (256 - b) * percent / 100).toString(16)).substr(1)
}

module.exports = PieWrapper
