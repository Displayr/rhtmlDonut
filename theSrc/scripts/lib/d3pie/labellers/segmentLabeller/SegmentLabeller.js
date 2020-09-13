import _ from 'lodash'
import OuterLabel from './outerLabel'
import computeLabelStats from './computeLabelStats'
import wrapAndFormatLabelUsingSvgApproximation from './utils/wrapAndFormatLabelUsingSvgApproximation'
import placeLabelAlongLabelRadiusWithLiftOffAngle from './utils/placeLabelAlongLabelRadiusWithLiftOffAngle'
import adjustLabelToNewY from './utils/adjustLabelToNewY'
import drawFunctions from './drawFunctions'

import * as rootLog from 'loglevel'
import {
  initialNaivePlacement,
  performCollisionResolution,
  performOutOfBoundsCorrection,
  removeLabelsUntilLabelsFitCanvasVertically,
  shortenTopAndBottom,
  shrinkFontSizesUntilLabelsFitCanvasVertically,
} from './mutations'

const labelLogger = rootLog.getLogger('label')

// define the rest of the variants that get set later - do this in the config data class
const VARIABLE_CONFIG = [
  'labelMaxLineAngle',
  'minProportion',
]

const INVARIABLE_CONFIG = [
  'color',
  'displayDecimals',
  'displayPercentage',
  'prefix',
  'suffix',
  'fontFamily',
  'innerPadding',
  'liftOffAngle',
  'linePadding',
  'maxLabelOffset',
  'maxLines',
  'maxVerticalOffset',
  'maxWidthProportion',
  'minLabelOffset',
  'outerPadding',
  'preferredMaxFontSize',
  'preferredMinFontSize',
  'useInnerLabels',
]

class SegmentLabeller {
  constructor ({ dataPoints, sortOrder, config, linesConfig, animationConfig, canvas }) {
    this.canvas = canvas
    this.linesConfig = linesConfig
    this.animationConfig = animationConfig

    const { variant, invariant } = this.processConfig(config)
    this._variant = variant
    this._invariant = invariant

    this._variant.hasBottomLabel = false
    this._variant.hasTopLabel = false
    this._variant.bottomIsLifted = false
    this._variant.topIsLifted = false
    this._variant.maxFontSize = this._invariant.preferredMaxFontSize
    this._variant.minFontSize = this._invariant.preferredMinFontSize

    this._invariant.maxLabelWidth = this.canvas.width * this._invariant.maxWidthProportion
    this._invariant.originalDataPoints = dataPoints
    this._invariant.sortOrder = sortOrder

    this.interface = {
      canvas: this.extendCanvasInterface(canvas),
    }

    /* NB this is odd. Rationale
        * The label sets are constantly cloned.
        * The canvas object is updated in the parent
        * If a label clone is done, then an update to canvas is made, the label will have a copy of the old canvas
          that does not include the updates. By passing a fn, the updated canvas can always be retrieved
     */
    const canvasInterface = () => this.interface.canvas

    this.labelSets = {
      primary: {
        outer: this.buildLabels({
          dataPoints,
          minProportion: this._variant.minProportion,
          canvasInterface,
        }),
        inner: [],
      },
    }

    this.mutationHistory = []
  }

  buildLabels ({ dataPoints, minProportion, canvasInterface }) {
    const totalValue = _(dataPoints).map('value').sum()
    let cumulativeValue = 0

    return dataPoints
      .map(dataPoint => {
        const angleExtent = dataPoint.value * 360 / totalValue
        const angleStart = cumulativeValue * 360 / totalValue
        cumulativeValue += dataPoint.value

        return new OuterLabel({
          canvasInterface,
          color: dataPoint.color,
          displayDecimals: this._invariant.displayDecimals,
          displayPercentage: this._invariant.displayPercentage,
          prefix: this._invariant.prefix,
          suffix: this._invariant.suffix,
          fontFamily: this._invariant.fontFamily,
          fontSize: this._invariant.preferredMaxFontSize,
          fractionalValue: dataPoint.value / totalValue,
          group: dataPoint.group,
          id: dataPoint.id,
          innerPadding: this._invariant.innerPadding,
          label: dataPoint.label,
          segmentAngleMidpoint: angleStart + angleExtent / 2,
          value: dataPoint.value,
        })
      })
      // NB filter here after the creation map as we are tracking cumulative value above so must process ALL
      .filter(({ fractionalValue }) => { return fractionalValue >= minProportion })
  }

  doMutation ({ mutationName, mutationFn }) {
    const start = Date.now()
    const {
      newInnerLabelSet = null,
      newOuterLabelSet = null,
      newVariants = {},
      stats = {},
    } = mutationFn({
      outerLabelSet: _.cloneDeep(this.labelSets.primary.outer),
      innerLabelSet: _.cloneDeep(this.labelSets.primary.inner),
      variant: _.cloneDeep(this._variant),
      invariant: _.cloneDeep(this._invariant),
      canvas: this.interface.canvas,
    })
    stats.name = mutationName
    stats.start = start
    stats.totalDuration = Date.now() - start
    stats.returnedInnerLabelSet = !_.isNull(newInnerLabelSet)
    stats.returnedInnerLabelSetSize = _.isNull(newInnerLabelSet) ? null : newInnerLabelSet.length
    stats.returnedOuterLabelSet = !_.isNull(newOuterLabelSet)
    stats.returnedOuterLabelSetSize = _.isNull(newOuterLabelSet) ? null : newOuterLabelSet.length
    this.mutationHistory.push(stats)

    labelLogger.info(`Mutation ${mutationName} completed`)
    if (newOuterLabelSet) {
      this.labelSets.primary.outer = newOuterLabelSet
    }
    if (newInnerLabelSet) {
      this.labelSets.primary.inner = newInnerLabelSet
    }
    _(newVariants).each((newValue, variantName) => {
      if (this._variant[variantName] !== newValue) {
        labelLogger.info(`Mutation ${mutationName} changed ${variantName} from ${this._variant[variantName]} to ${newValue}`)
        this._variant[variantName] = newValue
      }
    })

    return {
      stats,
      newVariants,
    }
  }

  doLabelling () {
    this.doMutation(initialNaivePlacement)
    this.doMutation(performOutOfBoundsCorrection) // TODO add if stages.outOfBoundsCorrection
    this.doMutation(performCollisionResolution)
    this.doMutation(shortenTopAndBottom)

    console.log('Done labelling. MutationHistory:')
    console.log(JSON.stringify(this.mutationHistory, {}, 2))
  }

  extendCanvasInterface (canvas) {
    canvas.getLabelSize = ({ labelText, fontSize, fontFamily }) => {
      return wrapAndFormatLabelUsingSvgApproximation({
        parentContainer: this.canvas.svg,
        labelText,
        fontSize,
        fontFamily,
        maxLabelWidth: this._invariant.maxLabelWidth,
        innerPadding: this._invariant.innerPadding,
        maxLabelLines: this._invariant.maxLines,
      })
    }
    canvas.placeLabelAlongLabelRadiusWithLiftOffAngle = ({ label, hasTopLabel, hasBottomLabel, labelLiftOffAngle }) => {
      return placeLabelAlongLabelRadiusWithLiftOffAngle({
        labelDatum: label,
        labelOffset: this.interface.canvas.labelOffset,
        labelLiftOffAngle, // NB although this is an invariant, callees sometimes set it to 0 to achieve placement along radius
        outerRadius: this.interface.canvas.outerRadius,
        pieCenter: this.interface.canvas.pieCenter,
        canvasHeight: this.interface.canvas.height,
        maxFontSize: this._variant.maxFontSize,
        maxVerticalOffset: this.interface.canvas.maxVerticalOffset,
        hasTopLabel,
        hasBottomLabel,
        minGap: this._invariant.outerPadding,
      })
    }

    canvas.adjustLabelToNewY = ({ anchor, newY, label, topIsLifted, bottomIsLifted }) => {
      let { pieCenter, outerRadius, labelOffset, maxVerticalOffset } = this.interface.canvas
      let { liftOffAngle, outerPadding } = this._invariant
      let { hasTopLabel, hasBottomLabel, maxFontSize } = this._variant

      let apexLabelCorrection = 0
      if ((label.topLeftCoord.x < pieCenter.x && hasTopLabel) ||
        (label.topLeftCoord.x > pieCenter.x && hasBottomLabel)) {
        apexLabelCorrection = maxFontSize + outerPadding
      }

      return adjustLabelToNewY({
        labelDatum: label,
        anchor,
        newY,
        labelRadius: outerRadius + labelOffset,
        yRange: outerRadius + maxVerticalOffset - apexLabelCorrection,
        labelLiftOffAngle: liftOffAngle,
        pieCenter: pieCenter,
        topIsLifted,
        bottomIsLifted,
      })
    }
    return canvas
  }

  // TODO rename to getOuterLabelStats, or include inner stats
  getLabelStats () {
    return computeLabelStats(this.labelSets.primary.outer, this._invariant.outerPadding)
  }

  getLabels () {
    return this.labelSets.primary
  }

  preprocessLabelSet () {
    const canvasHeight = this.interface.canvas.height

    let labelStats = this.getLabelStats()
    if (labelStats.totalDesiredHeight > canvasHeight) {
      this.doMutation(shrinkFontSizesUntilLabelsFitCanvasVertically)
    }

    labelStats = this.getLabelStats()
    if (labelStats.totalDesiredHeight > canvasHeight) {
      labelLogger.info('all font shrinking options exhausted, must now start removing labels by increasing minProportion')
      this.doMutation(removeLabelsUntilLabelsFitCanvasVertically)
    }

    labelLogger.info('Done Preprocessing Labelset. MutationHistory:')
    labelLogger.info(JSON.stringify(this.mutationHistory, {}, 2))
  }

  processConfig (config) {
    const variant = _.pick(config, VARIABLE_CONFIG)
    const invariant = _.pick(config, INVARIABLE_CONFIG)
    return { variant, invariant }
  }

  clearPreviousFromCanvas () {
    const { svg, cssPrefix } = this.interface.canvas
    svg.selectAll(`.${cssPrefix}labels-outer`).remove()
    svg.selectAll(`.${cssPrefix}labels-inner`).remove()
    svg.selectAll(`.${cssPrefix}labels-extra`).remove() // TODO dont need
    svg.selectAll(`.${cssPrefix}labels-group`).remove() // TODO shouldn't be done here
    svg.selectAll(`.${cssPrefix}lineGroups-outer`).remove()
    svg.selectAll(`.${cssPrefix}lineGroups-inner`).remove()
    svg.selectAll(`.${cssPrefix}tooltips`).remove() // TODO shouldn't be done here. Also wont work any more (not in svg)
    svg.selectAll(`.${cssPrefix}gtooltips`).remove() // TODO shouldn't be done here. Also wont work any more (not in svg)
  }

  draw () {
    const { canvas } = this.interface
    const { color, innerPadding } = this._invariant
    const { inner, outer } = this.labelSets.primary

    drawFunctions.drawLabelSet({
      canvas,
      labels: outer,
      labelColor: color,
      innerPadding: innerPadding,
      labelType: 'outer',
    })

    drawFunctions.drawLabelSet({
      canvas,
      labels: inner,
      labelColor: color,
      innerPadding: innerPadding,
      labelType: 'inner',
    })

    if (this.linesConfig.enabled) {
      drawFunctions.drawOuterLabelLines({
        canvas,
        labels: outer,
        config: this.linesConfig.outer,
      })
      drawFunctions.drawInnerLabelLines({
        canvas,
        labels: inner,
      })
    }

    drawFunctions.fadeInLabelsAndLines({
      canvas,
      animationConfig: this.animationConfig,
    })
  }
}

module.exports = SegmentLabeller
