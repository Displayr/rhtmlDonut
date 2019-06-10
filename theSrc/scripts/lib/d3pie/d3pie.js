import _ from 'lodash'
import d3 from 'd3'

import helpers from './helpers'
import math from './math'
import segments from './segments'
import tooltip from './tooltip'
import validate from './validate'
import defaultSettings from './defaultSettings'
import groupLabeller from './labellers/groupLabeller'
import outerLabeller from './labellers/outerLabeller'

import * as rootLog from 'loglevel'
const layoutLogger = rootLog.getLogger('layout')

/*!
 * This is not the standard d3pie. It was edited by Xiaoting Wang and then Kyle Zeeuwen
 * @author Ben Keen, Xiaoting Wang, Kyle Zeeuwen
 * @original_repo http://github.com/benkeen/d3pie
 * @repo http://github.com/Displayr/rhtmlDonut
 */

// TODO pull from package.json
const _scriptName = 'rhtmlDonut'
const _version = '2.0.0'

class d3pie {
  constructor (element, options) {
    rootLog.debug(`d3pieConfig: ${JSON.stringify(options, {}, 2)}`)

    // element can be an ID or DOM element
    this.element = element
    if (typeof element === 'string') {
      var el = element.replace(/^#/, '') // replace any jQuery-like ID hash char
      this.element = document.getElementById(el)
    }

    this.options = _.merge({}, defaultSettings, options)

    // if the user specified a custom CSS element prefix (ID, class), use it
    if (this.options.misc.cssPrefix !== null) {
      this.cssPrefix = this.options.misc.cssPrefix
    } else {
      console.error(`warn: need this.options.misc.cssPrefix`)
      this.cssPrefix = 'missing-prefix'
    }

    // now run some validation on the user-defined info
    if (!validate.initialCheck(this)) {
      return
    }

    // add a data-role to the DOM node to let anyone know that it contains a d3pie instance, and the d3pie version
    d3.select(this.element).attr(_scriptName, _version)
    d3.select(this.element).attr(`${_scriptName}-status`, 'loading')

    // things that are done once
    if (this.options.data.smallSegmentGrouping.enabled) {
      this.options.data.content = helpers.applySmallSegmentGrouping(this.options.data.content, this.options.data.smallSegmentGrouping)
    }
    this.totalSize = math.getTotalPieSize(this.options.data.content)

    // prep-work
    this.svgContainer = helpers.addSVGSpace(this)
    this.svg = this.svgContainer.append('g').attr('class', 'mainPlot')
    this.floating = this.svgContainer.append('g').attr('class', 'floating')

    this.outerLabelData = []
    this.innerLabelData = []
    this.groupLabelData = []

    this._init()
    d3.select(this.element).attr(`${_scriptName}-status`, 'ready')
  }

  redrawWithoutLoading () {
    // NB switch to { redraw: false } then resize by +25x+25 a few times for a sweet visual bug !
    this._init({ redraw: true })
  }

  // TODO combine _init and _initNoLoading
  _init ({ redraw = false } = {}) {
    _(this.options.data.content).each((datum, i) => {
      if (!_.has(datum, 'id')) { datum.id = i }
    })

    let pieDimensions = {}
    let labelStats = { maxLabelWidth: 0, maxLabelHeight: 0, maxFontSize: 0 }

    if (this.options.labels.enabled) {
      const initialLabelSet = outerLabeller.buildLabelSet({
        totalSize: this.totalSize,
        minAngle: this.options.data.minAngle,
        labelData: this.options.data.content,
        fontSize: this.options.labels.mainLabel.fontSize,
        fontFamily: this.options.labels.mainLabel.font,
        displayPercentage: this.options.labels.outer.displayPercentage,
        displayDecimals: parseFloat(this.options.labels.outer.displayDecimals),
        displayPrefix: this.options.data.prefix,
        displaySuffix: this.options.data.suffix,
        innerPadding: parseFloat(this.options.labels.outer.innerPadding)
      })

      this.outerLabelData = outerLabeller.preprocessLabelSet({
        parentContainer: this.svg,
        labelSet: initialLabelSet,
        minAngle: this.options.data.minAngle,
        canvasHeight: this.options.size.canvasHeight,
        minFontSize: this.options.labels.mainLabel.minFontSize,
        maxFontSize: this.options.labels.mainLabel.fontSize,
        innerPadding: parseFloat(this.options.labels.outer.innerPadding),
        outerPadding: parseFloat(this.options.labels.outer.outerPadding),
        maxLabelWidth: parseFloat(this.options.labels.outer.maxWidth) * this.options.size.canvasWidth
      })

      labelStats = outerLabeller.computeLabelStats(this.outerLabelData)

      const extraVerticalSpace = (_.get(labelStats.densities, 'top') > 8)
        ? 2 * labelStats.maxLabelHeight
        : 0

      const labelLinePadding = 2 // TODO pull from config
      pieDimensions = this.computePieLayoutDimensions({
        maxFontSize: labelStats.maxFontSize,
        canvasWidth: this.options.size.canvasWidth,
        canvasHeight: this.options.size.canvasHeight,
        labelOffsetProportion: parseFloat(this.options.size.labelOffset),
        innerRadiusProportion: parseFloat(this.options.size.pieInnerRadius),
        idealLeftWhiteSpaceSize: (labelStats.maxLabelWidth || 0) + labelLinePadding,
        idealRightWhiteSpaceSize: (labelStats.maxLabelWidth || 0) + labelLinePadding,
        idealTopWhiteSpaceSize: (labelStats.maxLabelHeight || 0) + extraVerticalSpace,
        idealBottomWhiteSpaceSize: (labelStats.maxLabelHeight || 0) + extraVerticalSpace
      })
    } else {
      pieDimensions = this.computePieLayoutDimensions({
        maxFontSize: 0,
        canvasWidth: this.options.size.canvasWidth,
        canvasHeight: this.options.size.canvasHeight,
        labelOffsetProportion: 0,
        innerRadiusProportion: parseFloat(this.options.size.pieInnerRadius),
        idealLeftWhiteSpaceSize: 0,
        idealRightWhiteSpaceSize: 0,
        idealTopWhiteSpaceSize: 0,
        idealBottomWhiteSpaceSize: 0
      })
    }

    this.innerRadius = pieDimensions.innerRadius
    this.outerRadius = pieDimensions.outerRadius
    this.labelOffset = pieDimensions.labelOffset

    const largestAllowableMaxVerticalOffset = (this.options.size.canvasHeight / 2) - this.outerRadius
    const unboundedMaxVerticalOffset = (_.isNull(this.options.labels.outer.maxVerticalOffset))
      ? this.outerRadius
      : this.options.labels.outer.maxVerticalOffset
    this.maxVerticalOffset = Math.min(unboundedMaxVerticalOffset, largestAllowableMaxVerticalOffset)

    this.pieCenter = {
      x: this.options.size.canvasWidth / 2,
      y: this.options.size.canvasHeight / 2
    }

    _(this.outerLabelData).each(label => {
      const coordAtZeroDegrees = { x: this.pieCenter.x - this.outerRadius, y: this.pieCenter.y }
      const segmentMidpointCoord = math.rotate(coordAtZeroDegrees, this.pieCenter, label.segmentAngleMidpoint)

      label.addLayoutFacts({
        segmentMidpointCoord,
        pieCenter: this.pieCenter,
        innerRadius: this.innerRadius,
        outerRadius: this.outerRadius,
        labelOffset: this.labelOffset
      })
    })

    layoutLogger.info(`pie layout determined:
      canvasWidth: ${this.options.size.canvasWidth}
      canvasHeight: ${this.options.size.canvasHeight}
      constrainedDimension: ${pieDimensions.constrained}
      radius: ${this.innerRadius} -> ${this.outerRadius}
      labelOffset: ${this.labelOffset}
      maxLabelWidth: ${labelStats.maxLabelWidth || 0}
      maxLabelHeight: ${labelStats.maxLabelHeight || 0}
      idealTopWhiteSpaceSize: ${this.options.labels.mainLabel.fontSize}
      idealBottomWhiteSpaceSize: ${this.options.labels.mainLabel.fontSize}
    `)

    // TODO this is hard coded to false in R wrapper. Can delete
    // now create the pie chart segments, and gradients if the user desired
    if (this.options.misc.gradient.enabled) {
      segments.addGradients(this)
    }
    if (redraw) {
      this.options.effects.load.effect = 'none'
      segments.reshapeSegment(this)
    } else {
      segments.create(this) // also creates this.arc
    }

    // NB drawShape is a debug only feature that will be deleted / supported some other way in the future
    // TODO is this duplication of this.options.debug.draw_placement_lines ?
    if (this.options.labels.outer.debugDrawFitLines) {
      outerLabeller.debugDrawFitLines(this)
    } else if (this.options.labels.enabled) {
      outerLabeller.doLabelling(this)
    }

    if (this.options.groups.content && this.options.groups.labelsEnabled) {
      groupLabeller.doLabelling(this)
    }

    // add and position the tooltips
    if (this.options.tooltips.enabled) {
      tooltip.addTooltips(this)
    }

    // position the title and subtitle
    segments.addSegmentEventHandlers(this)

    if (this.options.debug.draw_placement_lines) {
      outerLabeller.drawPlacementLines(this)
    }
  }

  computePieLayoutDimensions ({
    maxFontSize,
    canvasWidth,
    canvasHeight,
    idealLeftWhiteSpaceSize,
    idealRightWhiteSpaceSize,
    idealTopWhiteSpaceSize,
    idealBottomWhiteSpaceSize,
    labelOffsetProportion,
    innerRadiusProportion
  }) {
    const availableWidth = canvasWidth - Math.max(idealLeftWhiteSpaceSize, idealRightWhiteSpaceSize) * 2
    const availableHeight = canvasHeight - Math.max(idealTopWhiteSpaceSize, idealBottomWhiteSpaceSize) * 2

    const outerRadiusIncludingLabelOffset = Math.min(availableHeight, availableWidth) / 2

    const halfMaxFontSizeMinusMagicHardCode = 8 // NB based on experimenting with label_variations_wrapping.yaml examples
    const labelOffset = Math.max(
      (maxFontSize / 2) - halfMaxFontSizeMinusMagicHardCode, // labelOffset must be at least 1/2 maxFontSize ( minus some fudge)  to prevent labels from overlapping segments
      Math.ceil(outerRadiusIncludingLabelOffset * (1 - (1 / (1 + labelOffsetProportion))))
    )

    const outerRadius = outerRadiusIncludingLabelOffset - labelOffset
    const innerRadius = Math.floor(outerRadius * innerRadiusProportion)
    const constrained = (availableHeight > availableWidth) ? 'width' : 'height'

    return { innerRadius, outerRadius, labelOffset, constrained }
  }
}

module.exports = d3pie
