import _ from 'lodash'
import d3 from 'd3'

import helpers from './helpers'
import math from './math'
import segments from './segments'
import tt from './tooltip'
import validate from './validate'
import defaultSettings from './defaultSettings'
import groupLabeller from './labellers/groupLabeller'
import outerLabeller from './labellers/outerLabeller'

import * as rootLog from 'loglevel'
const layoutLogger = rootLog.getLogger('layout')
/*!
 * This is not the standard d3pie. It's edited by Xiaoting Wang and then Kyle Zeeuwen for a DetailedDonutPlot
 * @author Ben Keen, Xiaoting Wang, Kyle Zeeuwen
 * @version 0.1.8
 * @date 22 March, 2016
 * @repo http://github.com/benkeen/d3pie
 * @repo http://github.com/Displayr/rhtmlDonut
 */

var _scriptName = 'd3pie'
var _version = '0.1.6'

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
      maxLabelWidth: parseFloat(this.options.labels.outer.maxWidthPercentage.replace('/%/', '')) / 100 * this.options.size.canvasWidth
    })

    const {
      maxLabelWidth,
      maxLabelHeight,
      densities
    } = outerLabeller.computeLabelStats(this.outerLabelData)

    const extraVerticalSpace = (_.get(densities, 'top') > 8)
      ? 2 * maxLabelHeight
      : 0

    const labelLinePadding = 2 // TODO pull from config

    const { innerRadius, outerRadius, constrained, labelOffset } = this.computePieLayoutDimensions({
      canvasWidth: this.options.size.canvasWidth,
      canvasHeight: this.options.size.canvasHeight,
      labelOffsetProportion: parseFloat(this.options.size.labelOffsetPercentage.replace('/%/', '')) / 100,
      innerRadiusProportion: parseFloat(this.options.size.pieInnerRadius),
      idealLeftWhiteSpaceSize: (maxLabelWidth || 0) + labelLinePadding,
      idealRightWhiteSpaceSize: (maxLabelWidth || 0) + labelLinePadding,
      idealTopWhiteSpaceSize: (maxLabelHeight || 0) + extraVerticalSpace,
      idealBottomWhiteSpaceSize: (maxLabelHeight || 0) + extraVerticalSpace
    })
    this.innerRadius = innerRadius
    this.outerRadius = outerRadius
    this.labelOffset = labelOffset

    const largestAllowableMaxVerticalOffset = (this.options.size.canvasHeight / 2) - this.outerRadius
    this.maxVerticalOffset = (_.isNull(this.options.labels.outer.maxVerticalOffset))
      ? largestAllowableMaxVerticalOffset
      : Math.min(largestAllowableMaxVerticalOffset, this.options.labels.outer.maxVerticalOffset)

    this.pieCenter = {
      x: this.options.size.canvasWidth / 2,
      y: this.options.size.canvasHeight / 2
    }

    _(this.outerLabelData).each(label => {
      label.pieCenter = this.pieCenter
      label.innerRadius = this.innerRadius
      label.outerRadius = this.outerRadius
      label.labelOffset = this.labelOffset
    })

    layoutLogger.info(`pie layout determined:
      canvasWidth: ${this.options.size.canvasWidth}
      canvasHeight: ${this.options.size.canvasHeight}
      constrainedDimension: ${constrained}
      radius: ${this.innerRadius} -> ${this.outerRadius}
      labelOffset: ${this.labelOffset}
      maxLabelWidth: ${maxLabelWidth || 0}
      maxLabelHeight: ${maxLabelHeight || 0}
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
    } else {
      outerLabeller.doLabelling(this)
    }

    if (this.options.groups.content) {
      groupLabeller.doLabelling(this)
    }

    // add and position the tooltips
    if (this.options.tooltips.enabled) {
      tt.addTooltips(this)
    }

    // position the title and subtitle
    segments.addSegmentEventHandlers(this)

    if (this.options.debug.draw_placement_lines) {
      outerLabeller.drawPlacementLines(this)
    }
  }

  computePieLayoutDimensions ({
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
    const outerRadius = Math.floor(outerRadiusIncludingLabelOffset * (1 / (1 + labelOffsetProportion)))
    const labelOffset = outerRadiusIncludingLabelOffset - outerRadius
    const innerRadius = Math.floor(outerRadius * innerRadiusProportion)
    const constrained = (availableHeight > availableWidth) ? 'width' : 'height'

    return { innerRadius, outerRadius, labelOffset, constrained }
  }
}

module.exports = d3pie
