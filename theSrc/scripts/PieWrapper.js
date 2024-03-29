import $ from 'jquery'
import _ from 'lodash'
import d3 from 'd3'
import d3pie from './lib/d3pie/d3pie'
import Rainbow from './lib/d3pie/rainbowvis'
import helpers from './lib/d3pie/helpers'
import { Footer, Title, Subtitle } from 'rhtmlParts'
import { layoutLogger, rootLogger, initialiseLogger } from './lib/logger'
import { name, version } from '../../package.json'

import {
  isHexColor,
  isValidColorName,
  getHexColorFromString,
} from './colorUtils'

class PieWrapper {
  static uniqueId () {
    return this._donutInstanceCounter++
  }

  static initClass () {
    this._donutInstanceCounter = 0
  }

  constructor (element) {
    this.outerContainer = element
    this.uniqueId = PieWrapper.uniqueId()
    this.uniqueCssPrefix = `donut-${this.uniqueId}`
    this.titleHeight = 0
    this.subtitleHeight = 0
    this.footerHeight = 0
    this.initialDrawComplete = false // if the canvas is too small on first call to draw, we skip the draw, if a resize to a better size is performed, the class needs to know that the initial draw has not yet been completed
  }

  reset () {
    this.initialDrawComplete = false
    $(this.outerContainer).find('*').remove()
  }

  initialiseComponents () {
    this.outerSvg = d3.select(this.outerContainer)
      .append('svg')
      .attr('class', 'svgContent')

    if (this._settings.title) {
      this.title = new Title({
        text: this._settings.title,
        fontColor: this._settings.titleFontColor,
        fontSize: this._settings.titleFontSize,
        fontFamily: this._settings.titleFontFamily,
        topPadding: this._settings.titleTopPadding,
        bottomPadding: 10,
        innerPadding: 2,
      })
    }

    if (this._settings.subtitle) {
      this.subtitle = new Subtitle({
        subtitleText: this._settings.subtitle,
        subtitleFontColor: this._settings.subtitleFontColor,
        subtitleFontSize: this._settings.subtitleFontSize,
        subtitleFontFamily: this._settings.subtitleFontFamily,
        bottomPadding: 10,
        innerPadding: 2,
      })
    }

    if (this._settings.footer) {
      this.footer = new Footer({
        footerText: this._settings.footer,
        footerFontColor: this._settings.footerFontColor,
        footerFontSize: this._settings.footerFontSize,
        footerFontFamily: this._settings.footerFontFamily,
        topPadding: 10,
        bottomPadding: 10,
        innerPadding: 2,
      })
    }

    this.pieGroup = this.outerSvg.append('g')
      .attr('class', 'pieGroup')

    this.pie = new d3pie(this.pieGroup.node(), { // eslint-disable-line new-cap
      size: {
        labelThreshold: absencePreservingParseFloat(this._settings.canvasSizeDrawLabelThreshold),
        labelOffset: absencePreservingParseFloat(this._settings.labelOffset),
        pieInnerRadius: absencePreservingParseFloat(this._settings.innerRadius),
      },
      data: {
        sortOrder: this._settings.valuesOrder,
        color: this._settings.valuesColor,
        dataFormatter: d3.format(`,.${Math.max(0, _.get(this._settings, 'valuesDec', 1))}f`), // TODO clean this up, push to child concern
        display: this._settings.valuesDisplay,
        content: this.pieData,
      },
      labels: {
        enabled: this._settings.labelsEnabled,
        stages: this._settings.stages,
        segment: {
          color: this._settings.labelsColor,
          displayDecimals: absencePreservingParseFloat(this._settings.valuesDec),
          displayPercentage: (this._settings.valuesDisplay === 'percentage'),
          fontFamily: this._settings.labelsFont,
          useInnerLabels: this._settings.useInnerLabels,
          innerPadding: absencePreservingParseFloat(this._settings.labelsInnerPadding),
          labelMaxLineAngle: absencePreservingParseFloat(this._settings.labelMaxLineAngle),
          liftOffAngle: absencePreservingParseFloat(this._settings.labelLiftOffAngle),
          maxLines: absencePreservingParseFloat(this._settings.labelsMaxLines),
          maxVerticalOffset: absencePreservingParseFloat(this._settings.labelMaxVerticalOffset),
          maxWidthProportion: absencePreservingParseFloat(this._settings.labelsMaxWidth),
          minProportion: absencePreservingParseFloat(this._settings.minProportion),
          outerPadding: absencePreservingParseFloat(this._settings.labelsOuterPadding),
          preferredMaxFontSize: absencePreservingParseFloat(this._settings.labelsSize),
          preferredMinFontSize: absencePreservingParseFloat(this._settings.labelsMinFontSize),
          prefix: this._settings.prefix,
          suffix: this._settings.suffix,
        },
        lines: {
          style: 'aligned',
          outer: {
            straight: {
              minAngle: absencePreservingParseFloat(this._settings.labelsOuterLinesStraightMin),
              maxAngle: absencePreservingParseFloat(this._settings.labelsOuterLinesStraightMax),
            },
            basisInterpolated: {
              minAngle: absencePreservingParseFloat(this._settings.labelsOuterLinesBasisInterpolatedMin),
              maxAngle: absencePreservingParseFloat(this._settings.labelsOuterLinesBasisInterpolatedMax),
            },
            bezier: {
              minAngle: absencePreservingParseFloat(this._settings.labelsOuterLinesBezierMin),
              maxAngle: absencePreservingParseFloat(this._settings.labelsOuterLinesBezierMax),
              segmentLeanAngle: absencePreservingParseFloat(this._settings.labelsOuterLinesBezierSegmentLean),
              labelLeanAngle: absencePreservingParseFloat(this._settings.labelsOuterLinesBezierLabelLean),
              segmentPullInProportionMin: absencePreservingParseFloat(this._settings.labelsOuterLinesBezierSegmentPullInProportionMin),
              segmentPullInProportionMax: absencePreservingParseFloat(this._settings.labelsOuterLinesBezierSegmentPullInProportionMax),
            },
          },
        },
      },
      effects: {
        load: {
          effect: absencePreservingBooleanToStringConverter(this._settings.loadingAnimationEnabled, 'default', 'none'),
          speed: absencePreservingParseFloat(this._settings.loadingAnimationSpeed),
        },
      },
      tooltips: {
        enabled: true,
        maxWidth: absencePreservingParseFloat(this._settings.tooltipMaxWidth),
        maxHeight: absencePreservingParseFloat(this._settings.tooltipMaxHeight),
        styles: {
          backgroundColor: this._settings.tooltipBackgroundColor,
          backgroundOpacity: absencePreservingParseFloat(this._settings.tooltipBackgroundOpacity),
          font: this._settings.tooltipFontFamily,
          fontColor: this._settings.tooltipFontColor,
          fontSize: absencePreservingParseFloat(this._settings.tooltipFontSize),
        },
      },
      misc: {
        colors: {
          segments: this._settings.valuesColor,
          segmentStroke: this._settings.borderColor,
        },
        cssPrefix: this.uniqueCssPrefix,
      },
      groups: {
        content: this.groupData,
        font: this._settings.groupsFont,
        fontSize: absencePreservingParseFloat(this._settings.groupsSize),
        fontColor: this._settings.groupsFontColor,
        minFontSize: absencePreservingParseFloat(this._settings.groupLabelsMinFontSize),
        labelsEnabled: this._settings.groupLabelsEnabled,
      },
    })
  }

  draw () {
    const wrappedElement = d3.select(this.outerContainer)

    wrappedElement
      .attr(name, version)
      .attr(`rhtmlwidget-status`, 'loading')

    this._draw()

    wrappedElement
      .attr(`rhtmlwidget-status`, 'ready')
  }

  _draw () {
    const { width, height } = getContainerDimensions(this.outerContainer)
    rootLogger.info(`draw called. Width: ${width}, height: ${height}`)

    // NB cannot rely on theSrc/scripts/lib/d3pie/defaultSettings.js as those defaults are applied later
    const drawThreshold = this._settings.canvasSizeDrawThreshold || 50
    if (width < drawThreshold || height < drawThreshold) {
      rootLogger.info(`${width}x${height} is below minimum size of ${drawThreshold}. Cancel render and leave canvas blank`)
      $(this.outerContainer).find('*').remove()
      this.initialDrawComplete = false
      return
    }

    if (!this.initialDrawComplete) {
      this.initialiseComponents()
    }

    this.outerSvg
      .attr('width', width)
      .attr('height', height)

    // TODO make title/subtitle/footer handle being instantiated with no text : return zero, play nice. Push all these if concerns into module
    // TODO also currently need to specify all the things
    if (this._settings.title) {
      this.title.setX(width / 2)
      this.title.setMaxWidth(width)
      this.title.drawWith(this.uniqueCssPrefix, this.outerSvg)
      this.titleHeight = this.title.getHeight()
    }

    if (this._settings.subtitle) {
      this.subtitle.setX(width / 2)
      this.subtitle.setY(this.titleHeight)
      this.subtitle.setMaxWidth(width)
      this.subtitle.drawWith(this.uniqueCssPrefix, this.outerSvg)
      this.subtitleHeight = this.subtitle.getHeight()
    }

    if (this._settings.footer) {
      this.footer.setX(width / 2)
      this.footer.setMaxWidth(width)
      this.footer.setContainerHeight(height)
      this.footer.drawWith(this.uniqueCssPrefix, this.outerSvg)
      this.footerHeight = this.footer.getHeight()
    }

    const donutPlotHeight = height -
      this.titleHeight -
      this.subtitleHeight -
      this.footerHeight

    layoutLogger.info(`total height: ${height}`)
    layoutLogger.info(`titleHeight: ${this.titleHeight}`)
    layoutLogger.info(`subtitleHeight: ${this.subtitleHeight}`)
    layoutLogger.info(`footerHeight: ${this.footerHeight}`)
    layoutLogger.info(`setting donutPlot width: ${width}`)
    layoutLogger.info(`setting donutPlot height: ${donutPlotHeight}`)

    const pieGroupYOffset = this.titleHeight + this.subtitleHeight
    this.pieGroup
      .attr('transform', `translate(0,${pieGroupYOffset})`)

    this.pie.setDimensions({ width: width, height: donutPlotHeight })

    if (donutPlotHeight > 0) {
      if (!this.initialDrawComplete) {
        this.pie.draw()
        this.initialDrawComplete = true
      } else {
        this.pie.redraw()
      }

      // NB pie rect is for debug purposes only
      // this.pieGroup.append('rect')
      //   .attr('class', 'pieRect')
      //   .attr('width', width)
      //   .attr('height', donutPlotHeight)
    }
  }

  setConfig (newConfig) {
    this._settings = newConfig.settings

    initialiseLogger(this._settings.logLevel)
    rootLogger.debug('config', newConfig)

    if (this._settings.groups) {
      this.groupData = this._processGroupConfig()
    } else {
      this.groupData = []
    }

    if (!this._settings.valuesColor) {
      this._settings.valuesColor = this._computeColors(newConfig.values.length)
    }

    const colorArrays = [
      'groupsColor',
      'valuesColor',
    ]

    _(colorArrays).each(colorArray => {
      const inputColorArray = this._settings[colorArray]
      if (_.isNull(inputColorArray) || _.isUndefined(inputColorArray)) { return }
      this._settings[colorArray] = inputColorArray.map(color => {
        if (isHexColor(color)) { return color }
        if (isValidColorName(color)) { return getHexColorFromString(color) }
        return color
      })
      let nonHexColors = this._settings[colorArray].filter(color => !isHexColor(color))
      if (nonHexColors.length > 0) {
        throw new Error(`. Invalid value in setting ${colorArray}: [${nonHexColors.join(', ').slice(0, 10)}]: must be Hex (#rrggbb) format or valid HTML color`)
      }
    })

    const colorFields = [
      'borderColor',
      'footerFontColor',
      'groupsFontColor',
      'labelsColor',
      'subtitleFontColor',
      'titleFontColor',
      'tooltipBackgroundColor',
      'tooltipFontColor',
    ]

    _(colorFields).each(colorField => {
      const color = this._settings[colorField]
      if (_.isNull(color) || _.isUndefined(color) || color === 'none') { return }
      if (isHexColor(color)) { return }
      if (isValidColorName(color)) { this._settings[colorField] = getHexColorFromString(color) } else {
        throw new Error(`. Invalid value in setting ${colorField}: '${color}': must be Hex (#rrggbb) format or valid HTML color`)
      }
    })

    this.pieData = newConfig.values
      .map((value, i) => ({
        value: newConfig.values[i],
        label: newConfig.labels[i],
        color: this._settings.valuesColor[i % this._settings.valuesColor.length],
        group: (this._settings.groups) ? this._settings.groups[i] : null,
      }))
      .filter(({ value, label }) => {
        if (typeof value !== 'number' || isNaN(value) || value <= 0) {
          rootLogger.info(`value '${value}' for label '${label}' not valid. Must be positive number. Discarding`)
          return false
        }
        return true
      })
      .map((dataPoint, i) => Object.assign(dataPoint, { id: i, index: i }))

    // detect order
    // TODO use enums for ascending / descending / unordered
    const values = this.pieData.map(({ value }) => value)
    const firstValueEqualLastValue = _.first(values) === _.last(values)
    const isSortedAscending = _.every(values, (value, index, array) =>
      index === 0 || parseFloat(array[index - 1]) <= parseFloat(value)
    ) && !firstValueEqualLastValue
    const isSortedDescending = _.every(values, (value, index, array) =>
      index === 0 || parseFloat(array[index - 1]) >= parseFloat(value)
    ) && !firstValueEqualLastValue
    const valuesOrder = (isSortedDescending)
      ? 'descending'
      : ((isSortedAscending) ? 'ascending' : 'unordered')
    rootLogger.debug(`setting valuesOrder to '${valuesOrder}'`)
    this._settings.valuesOrder = valuesOrder

    // NB: Temp restriction until ellipse is used globally
    if (valuesOrder === 'unordered') {
      const currentLabelMaxLineAngle = this._settings.labelMaxLineAngle
      if (
        _.isNull(currentLabelMaxLineAngle) ||
        _.isUndefined(currentLabelMaxLineAngle) ||
        parseFloat(currentLabelMaxLineAngle) > 75
      ) { this._settings.labelMaxLineAngle = 75 }
      rootLogger.info('temp restricting currentLabelMaxLineAngle to 75 in unordered data set')
    }
  }

  _computeColors (valuesCount) {
    if (this._settings.groups) {
      return this._computeColorsUsingGroups()
    } else if (this._settings.gradient) {
      return this._computeColorsUsingGradient(valuesCount)
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
        return helpers.increaseBrightness(baseColor, lum)
      } catch (e) {
        console.error('color error, baseColor is' + baseColor)
        return baseColor
      }
    })
  }

  _computeColorsUsingGradient (valuesCount) {
    let colGrad = new Rainbow()
    colGrad.setSpectrum('darkblue', 'yellow')
    colGrad.setNumberRange(0, valuesCount - 1)

    return _.range(valuesCount).map(i => '#' + colGrad.colourAt(i))
  }

  _processGroupConfig () {
    const groupData = []

    const groupsColor = this._settings.groupsColor || d3.scale.category20().range()

    const nonHexColors = groupsColor.filter((color) => !color.match(/^#[a-fA-F0-9]{6}$/) && !color.match(/^#[a-fA-F0-9]{8}$/))
    if (nonHexColors.length > 0) {
      throw new Error(`Invalid group color(s) '${nonHexColors.join(', ')}': must be Hex (#rrggbb) format`)
    }

    for (let i = 0; i < this._settings.groupsSums.length; i++) {
      groupData.push({
        id: i,
        label: this._settings.groupsNames[i],
        value: this._settings.groupsSums[i],
        color: groupsColor[i % groupsColor.length],
        count: this._settings.groupsCounts[i],
      })
    }
    return groupData
  }
}
PieWrapper.initClass()

// TODO to utils
function getContainerDimensions (rootElementOrArray) {
  const rootElement = _.has(rootElementOrArray, 'length') ? rootElementOrArray[0] : rootElementOrArray
  try {
    return rootElement.getBoundingClientRect()
  } catch (err) {
    err.message = `fail in getContainerDimensions: ${err.message}`
    throw err
  }
}

// TODO remove all defaults here that are covered in defaultSettings. May require a "delete all null/undefined step in the middle"
// TODO to utils
const absencePreservingParseFloat = (thing) => {
  if (_.isNull(thing)) { return thing }
  if (_.isUndefined(thing)) { return thing }
  return parseFloat(thing)
}

// TODO to utils
const absencePreservingBooleanToStringConverter = (thing, trueVal, falseVal) => {
  if (_.isNull(thing)) { return thing }
  if (_.isUndefined(thing)) { return thing }
  return (thing) ? trueVal : falseVal
}

module.exports = PieWrapper
