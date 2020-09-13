import _ from 'lodash'
import d3 from 'd3'

import helpers from './helpers'
import math from './math'
import segments from './segments'
import tooltip from './tooltip'
import validate from './validate'
import defaultSettings from './defaultSettings'
import groupLabeller from './labellers/groupLabeller'
import SegmentLabeller from './labellers/segmentLabeller'
import { name, version } from '../../../../package'

import * as rootLog from 'loglevel'
const layoutLogger = rootLog.getLogger('layout')

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
    d3.select(this.element).attr(name, version)
    d3.select(this.element).attr(`${name}-status`, 'loading')

    // things that are done once
    this.totalValue = math.getTotalValueOfDataSet(this.options.data.content)

    // prep-work
    this.svgContainer = helpers.addSVGSpace(this)
    this.svg = this.svgContainer.append('g').attr('class', 'mainPlot')
    this.floating = this.svgContainer.append('g').attr('class', 'floating')

    this.groupLabelData = []

    this.interface = {
      canvas: {
        cssPrefix: this.cssPrefix,
        width: this.options.size.canvasWidth,
        height: this.options.size.canvasHeight,
        svg: this.svg,
      },
    }

    this._init()
    d3.select(this.element).attr(`${name}-status`, 'ready')
  }

  redrawWithoutLoading () {
    // NB switch to { redraw: false } then resize by +25x+25 a few times for a sweet visual bug !
    this._init({ redraw: true })
  }

  _init ({ redraw = false } = {}) {
    _(this.options.data.content).each((datum, i) => {
      if (!_.has(datum, 'id')) { datum.id = i }
    })

    let startTime = Date.now()
    let durations = {}

    let pieDimensions = {}

    let labelStats = { maxLabelWidth: 0, maxLabelHeight: 0, maxFontSize: 0 }
    let extraVerticalSpace = 0
    let labelLinePadding = 0

    if (this.options.labels.enabled) {
      this.segmentLabeller = new SegmentLabeller({
        animationConfig: this.options.effects.load,
        dataPoints: this.options.data.content,
        sortOrder: this.options.data.sortOrder,
        linesConfig: this.options.labels.lines, // TODO move this into this.options.labels.segment
        config: this.options.labels.segment,
        canvas: this.interface.canvas,
      })

      this.segmentLabeller.preprocessLabelSet()
      labelStats = this.segmentLabeller.getLabelStats()

      labelLinePadding = 2 // TODO pull from config
      extraVerticalSpace = (_.get(labelStats.densities, 'top') > 8)
        ? 2 * labelStats.maxLabelHeight
        : 0
    }

    pieDimensions = this.computePieLayoutDimensions({
      labelsEnabled: this.options.labels.enabled,
      canvasHeight: this.options.size.canvasHeight,
      canvasWidth: this.options.size.canvasWidth,
      idealBottomWhiteSpaceSize: labelStats.maxLabelHeight + extraVerticalSpace,
      idealLeftWhiteSpaceSize: labelStats.maxLabelWidth + labelLinePadding,
      idealRightWhiteSpaceSize: labelStats.maxLabelWidth + labelLinePadding,
      idealTopWhiteSpaceSize: labelStats.maxLabelHeight + extraVerticalSpace,
      innerRadiusProportion: this.options.size.pieInnerRadius,
      labelOffsetProportion: this.options.size.labelOffset,
      maxFontSize: labelStats.maxFontSize,
    })

    this.innerRadius = pieDimensions.innerRadius
    this.outerRadius = pieDimensions.outerRadius
    this.labelOffset = pieDimensions.labelOffset

    const largestAllowableMaxVerticalOffset = (this.options.size.canvasHeight / 2) - this.outerRadius
    const unboundedMaxVerticalOffset = (_.isNull(this.options.labels.segment.maxVerticalOffset))
      ? this.outerRadius
      : this.options.labels.segment.maxVerticalOffset
    this.maxVerticalOffset = Math.min(unboundedMaxVerticalOffset, largestAllowableMaxVerticalOffset)

    this.pieCenter = {
      x: this.options.size.canvasWidth / 2,
      y: this.options.size.canvasHeight / 2,
    }

    // TODO remove these 5 from this and access exclusive through canvas
    this.interface.canvas.pieCenter = this.pieCenter
    this.interface.canvas.innerRadius = this.innerRadius
    this.interface.canvas.outerRadius = this.outerRadius
    this.interface.canvas.labelOffset = this.labelOffset
    this.interface.canvas.maxVerticalOffset = this.maxVerticalOffset

    layoutLogger.info(`pie layout determined:
      canvasWidth: ${this.options.size.canvasWidth}
      canvasHeight: ${this.options.size.canvasHeight}
      constrainedDimension: ${pieDimensions.constrained}
      radius: ${this.innerRadius} -> ${this.outerRadius}
      labelOffset: ${this.labelOffset}
      maxLabelWidth: ${labelStats.maxLabelWidth || 0}
      maxLabelHeight: ${labelStats.maxLabelHeight || 0}
      idealTopWhiteSpaceSize: ${this.options.labels.segment.preferredMaxFontSize}
      idealBottomWhiteSpaceSize: ${this.options.labels.segment.preferredMaxFontSize}
    `)

    if (redraw) {
      this.options.effects.load.effect = 'none'
      segments.reshapeSegment(this)
    } else {
      segments.create(this) // also creates this.arc
    }

    if (this.options.labels.enabled) {
      const startLabelling = Date.now()

      this.segmentLabeller.clearPreviousFromCanvas()

      // TODO this is temp assignment to this.outerLabelData to make it all keep working ...
      this.segmentLabeller.doLabelling()

      this.segmentLabeller.draw()

      durations.outer_labelling = Date.now() - startLabelling
    }

    if (this.options.groups.content && this.options.groups.labelsEnabled) {
      const startLabelling = Date.now()
      groupLabeller.doLabelling(this)
      durations.group_labelling = Date.now() - startLabelling
    }

    // add and position the tooltips
    if (this.options.tooltips.enabled) {
      const startTooltips = Date.now()
      tooltip.addTooltips(this)
      durations.tooltips = Date.now() - startTooltips
    }

    // TODO this is pretty inefficient. will do 2n^2 scans
    const { inner, outer } = this.segmentLabeller.getLabels()
    const isLabelShown = (id) => (_.some(inner, { id }) || _.some(outer, { id }))
    const labelsShownLookup = _.transform(this.options.data.content, (result, dataPoint) => {
      result[dataPoint.id] = isLabelShown(dataPoint.id)
    }, {})
    segments.addSegmentEventHandlers(this, labelsShownLookup)

    durations.totalDuration = Date.now() - startTime
    // TODO root logger is not logging under test ...
    console.log(JSON.stringify(durations))
  }

  computePieLayoutDimensions ({
    labelsEnabled,
    maxFontSize,
    canvasWidth,
    canvasHeight,
    idealLeftWhiteSpaceSize,
    idealRightWhiteSpaceSize,
    idealTopWhiteSpaceSize,
    idealBottomWhiteSpaceSize,
    labelOffsetProportion,
    innerRadiusProportion,
  }) {
    const availableWidth = canvasWidth - Math.max(idealLeftWhiteSpaceSize, idealRightWhiteSpaceSize) * 2
    const availableHeight = canvasHeight - Math.max(idealTopWhiteSpaceSize, idealBottomWhiteSpaceSize) * 2

    const outerRadiusIncludingLabelOffset = Math.min(availableHeight, availableWidth) / 2

    const halfMaxFontSizeMinusMagicHardCode = 8 // NB based on experimenting with label_variations_wrapping.yaml examples
    const labelOffset = Math.max(
      (maxFontSize / 2) - halfMaxFontSizeMinusMagicHardCode, // labelOffset must be at least 1/2 maxFontSize (minus some fudge)  to prevent labels from overlapping segments
      Math.ceil(outerRadiusIncludingLabelOffset * (1 - (1 / (1 + labelOffsetProportion))))
    )

    const outerRadius = outerRadiusIncludingLabelOffset - (labelsEnabled ? labelOffset : 0)
    const innerRadius = Math.floor(outerRadius * innerRadiusProportion)
    const constrained = (availableHeight > availableWidth) ? 'width' : 'height'

    return { innerRadius, outerRadius, labelOffset, constrained }
  }
}

module.exports = d3pie
