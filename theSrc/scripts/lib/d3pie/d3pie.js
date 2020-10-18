import _ from 'lodash'
import d3 from 'd3'

import helpers from './helpers'
import math from './math'
import Tooltip from './tooltip'
import validate from './validate'
import defaultSettings from './defaultSettings'
import InteractionController from './interactionController'
import GroupLabeller from './labellers/groupLabeller'
import Segments from './segments'
import SegmentLabeller from './labellers/segmentLabeller'
import { name, version } from '../../../../package'
import { rootLogger, layoutLogger } from '../logger'

class d3pie {
  constructor (element, options) {
    rootLogger.debug(`d3pieConfig: ${JSON.stringify(options, {}, 2)}`)

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
      interactionController: new InteractionController(),
    }

    this._init()
    d3.select(this.element).attr(`${name}-status`, 'ready')
  }

  redrawWithoutLoading ({ width, height }) {
    this.interface.canvas.width = width
    this.interface.canvas.height = height
    this._init({ redraw: true })
  }

  _init ({ redraw = false } = {}) {
    const { canvas, interactionController } = this.interface

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
        canvas: canvas,
        interactionController,
        highlightTextLuminosity: this.options.effects.highlightTextLuminosity,
      })

      interactionController.addSegmentLabelController(this.segmentLabeller)

      this.segmentLabeller.preprocessLabelSet()
      labelStats = this.segmentLabeller.getLabelStats()

      labelLinePadding = 2 // TODO pull from config
      extraVerticalSpace = (_.get(labelStats.densities, 'top') > 8)
        ? 2 * labelStats.maxLabelHeight
        : 0
    }

    pieDimensions = this.computePieLayoutDimensions({
      labelsEnabled: this.options.labels.enabled,
      canvasHeight: canvas.height,
      canvasWidth: canvas.width,
      idealBottomWhiteSpaceSize: labelStats.maxLabelHeight + extraVerticalSpace,
      idealLeftWhiteSpaceSize: labelStats.maxLabelWidth + labelLinePadding,
      idealRightWhiteSpaceSize: labelStats.maxLabelWidth + labelLinePadding,
      idealTopWhiteSpaceSize: labelStats.maxLabelHeight + extraVerticalSpace,
      innerRadiusProportion: this.options.size.pieInnerRadius,
      labelOffsetProportion: this.options.size.labelOffset,
      maxFontSize: labelStats.maxFontSize,
    })

    canvas.pieCenter = { x: canvas.width / 2, y: canvas.height / 2 }
    canvas.innerRadius = pieDimensions.innerRadius
    canvas.outerRadius = pieDimensions.outerRadius
    canvas.labelOffset = pieDimensions.labelOffset

    // TODO NB: I think the unordered and the descending order labeller make different assumptions about
    // what the maxVerticalOffset represents. Address this when we move the unordered labeller to use elliptical label layout
    // for now stick with the "old one mod" approach and keep the other two approaches around. Small changes to maxVerticalOffset calcs
    // have large impacts on edge cases so Im keeping these variants around for now.

    canvas.maxVerticalOffset = (canvas.height / 2) - canvas.outerRadius

    layoutLogger.info(`pie layout determined:
      canvasWidth: ${canvas.width}
      canvasHeight: ${canvas.height}
      constrainedDimension: ${pieDimensions.constrained}
      radius: Inner ${canvas.innerRadius} Outer ${canvas.outerRadius}
      labelOffset: ${canvas.labelOffset}
      maxLabelWidth: ${labelStats.maxLabelWidth || 0}
      maxLabelHeight: ${labelStats.maxLabelHeight || 0}
      idealTopWhiteSpaceSize: ${this.options.labels.segment.preferredMaxFontSize}
      idealBottomWhiteSpaceSize: ${this.options.labels.segment.preferredMaxFontSize}
    `)

    this.segments = new Segments({
      animationConfig: this.options.effects.load,
      canvas,
      interactionController,
      dataPoints: this.options.data.content,
      groupData: this.options.groups.content,
      segmentStroke: this.options.misc.colors.segmentStroke,
      highlightLuminosity: this.options.effects.highlightLuminosity,
      textColor: this.options.labels.segment.color,
      tooltipsEnabled: this.options.tooltips.enabled,
    })
    interactionController.addSegmentController(this.segments)
    this.segments.clearPreviousFromCanvas()
    this.segments.draw({ animate: !redraw })

    if (this.options.labels.enabled) {
      this.segmentLabeller.clearPreviousFromCanvas()
      this.segmentLabeller.draw()
    }

    if (this.options.groups.content && this.options.groups.labelsEnabled) {
      this.groupLabeller = new GroupLabeller({
        canvas,
        interactionController,
        dataPoints: this.options.data.content,
        config: this.options.groups,
        dataFormatter: this.options.data.dataFormatter,
        displayPercentage: (this.options.data.display === 'percentage'),
        labelPrefix: this.options.labels.segment.prefix,
        labelSuffix: this.options.labels.segment.suffix,
        groupArcCalculator: this.segments.getArcCalculators().groupArc,
      })
      this.groupLabeller.clearPreviousFromCanvas()
      this.groupLabeller.draw()
      interactionController.addGroupLabelController(this.groupLabeller)
    }

    if (this.options.tooltips.enabled) {
      this.tooltips = new Tooltip({
        canvas,
        dataPoints: this.options.data.content,
        groupData: this.options.groups.content,
        dataFormatter: this.options.data.dataFormatter,
        displayPercentage: (this.options.data.display === 'percentage'),
        labelPrefix: this.options.labels.segment.prefix,
        labelSuffix: this.options.labels.segment.suffix,
        config: this.options.tooltips,
      })
      this.tooltips.clearPreviousFromCanvas()
      this.tooltips.draw()
      interactionController.addTooltipController(this.tooltips)
    }
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
