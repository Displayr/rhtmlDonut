import _ from 'lodash'
import * as rootLog from 'loglevel'

import { extractAndThrowIfNullFactory } from '../../mutationHelpers'
import {findLabelsExceedingMaxLabelLineAngle, findLabelsIntersecting, findLabelsOutOfBounds} from '../../../labelUtils'
import UnexpectedCondition from '../../../../interrupts/unexpectedCondition'
import { toRadians, computeIntersectionOfLineAndCircle } from '../../../../math'
import computeLabelLineMaxAngleCoords from '../../utils/computeLabelLineMaxAngleCoords'

const labelLogger = rootLog.getLogger('label')

const VARIABLE_CONFIG = [
  'labelMaxLineAngle',
  'minProportion'
]

const INVARIABLE_CONFIG = [
  'liftOffAngle',
  'outerPadding',
]

// NB DOCR in logger statemeents : DescendingOrderCollisionResolver
class DescendingOrderCollisionResolver {
  constructor ({ labelSet, variant, invariant, canvas }) {
    this.extractConfig({ variant, invariant })
    this.canvas = canvas
    this.stats = {}
    this.inputLabelSet = labelSet // TODO rename to this.labelSet
  }

  extractConfig ({ variant, invariant }) {
    const extractAndThrowIfNull = extractAndThrowIfNullFactory('DescendingOrderCollisionResolver')
    this.variant = {}
    this.invariant = {}

    /* eslint-disable no-return-assign */
    VARIABLE_CONFIG.forEach(key => this.variant[key] = extractAndThrowIfNull(variant, key))
    INVARIABLE_CONFIG.forEach(key => this.invariant[key] = extractAndThrowIfNull(invariant, key))
    /* eslint-enable no-return-assign */
  }

  go () {
    // First place labels using a liftOff of 0
    // if there are any collisions do we apply a liftOffAngle
    _(this.inputLabelSet).each(label => {
      this.canvas.placeLabelAlongLabelRadius({
        label,
        hasTopLabel: false,
        hasBottomLabel: false,
      })
    })

    const initialCollisions = findLabelsIntersecting(this.inputLabelSet)
    if (initialCollisions.length === 0) {
      labelLogger.info(`no collisions detected in initial layout. Terminating collision detection.`)
      this.stats.skipped = true
    } else {
      labelLogger.info(`collisions detected in initial layout. Proceeding with descending order collision detection.`)

      const ignoreThreshold = 0.1
      const bigLabelsToIgnore = this.inputLabelSet.filter(label => label.fractionalValue > ignoreThreshold)
      const labelsToPlace = this.inputLabelSet.filter(label => label.fractionalValue <= ignoreThreshold)

      const { acceptedLabels: topLeftAcceptedLabels } = this.placeTopLeft({
        existingLabels: bigLabelsToIgnore,
        labelSet: labelsToPlace, // TODO the fn does the filtering, but maybe we should do the filtering in the callee ?
      })

      const { acceptedLabels: rightAcceptedLabels } = this.placeRight({
        existingLabels: bigLabelsToIgnore.concat(topLeftAcceptedLabels),
        labelSet: labelsToPlace, // TODO the fn does the filtering, but maybe we should do the filtering in the callee ?
      })

      const { acceptedLabels: bottomLeftAcceptedLabels } = this.placeBottomLeft({
        existingLabels: bigLabelsToIgnore.concat(topLeftAcceptedLabels).concat(rightAcceptedLabels),
        labelSet: labelsToPlace, // TODO the fn does the filtering, but maybe we should do the filtering in the callee ?
      })

      this.inputLabelSet = _([
        bigLabelsToIgnore,
        topLeftAcceptedLabels,
        rightAcceptedLabels,
        bottomLeftAcceptedLabels,
      ])
        .flatten()
        .filter(label => !_.isNull(label))
        .sortBy('value')
        .reverse()
        .value()
    }

    return {
      inner: [],
      outer: this.inputLabelSet,
      newVariants: this.variant,
      stats: this.stats
    }
  }

  placeTopLeft ({ existingLabels, labelSet }) {
    let acceptedLabels = null

    const { labelMaxLineAngle } = this.variant
    const { height: canvasHeight, pieCenter, outerRadius, labelOffset } = this.canvas
    const topIsLifted = false
    const bottomIsLifted = false

    const topLeftLabels = _(labelSet)
      .filter('inTopLeftQuadrant')
      .filter(({ fractionalValue }) => fractionalValue >= this.variant.minProportion)
      .value()
    const collisionsInTopLeft = findLabelsIntersecting(existingLabels.concat(topLeftLabels))

    if (collisionsInTopLeft.length === 0 || topLeftLabels.length === 0) {
      acceptedLabels = topLeftLabels
    } else {
      const getLargestLabel = labelSet => labelSet[0]
      labelLogger.info('DOCR: top left: collisions detected')
      const stepSize = 5

      // each iteration: move the starting point of the "lowest and largest" label lower,
      // and then place the remaining labels going up
      let largestLabel = getLargestLabel(topLeftLabels)
      let startingBottomYPositionOfBiggestLabel = largestLabel.maxY - stepSize // NB ensure at least one iteration
      const initialLabelStartingY = largestLabel.maxY

      const maxLabelLineAngleCoords = computeLabelLineMaxAngleCoords({
        pieCenter: pieCenter,
        segmentAngle : largestLabel.segmentAngleMidpoint,
        labelMaxLineAngle,
        segmentRadius: outerRadius,
        labelRadius: outerRadius + labelOffset,
      })
      const maxAllowableLargestLabelY = _([
        _.get(maxLabelLineAngleCoords, 'counterClockwiseCoord.y', canvasHeight),
        canvasHeight
      ]).min()

      let allLabelsSuccessfullyPlaced = false // loop condition
      let workingLabelSet = null // persist outside of loop
      while (!allLabelsSuccessfullyPlaced && startingBottomYPositionOfBiggestLabel + stepSize < maxAllowableLargestLabelY) {
        startingBottomYPositionOfBiggestLabel += stepSize
        labelLogger.info(`DOCR: top left: placing largest label ${largestLabel.shortText} ${startingBottomYPositionOfBiggestLabel - initialLabelStartingY} px below ideal placement`)

        workingLabelSet = _.cloneDeep(topLeftLabels)
        const {
          collidingLabels,
          outOfBoundsLabels,
          maxAngleExceededLabels,
        } = this.moveLabelsUp({
          phase: 'top left',
          placedSet: existingLabels,
          labelSet: workingLabelSet,
          startingY: startingBottomYPositionOfBiggestLabel,
          topIsLifted,
          bottomIsLifted,
        })

        allLabelsSuccessfullyPlaced = _.isEmpty(collidingLabels) && _.isEmpty(outOfBoundsLabels) && _.isEmpty(maxAngleExceededLabels)
      }

      if (allLabelsSuccessfullyPlaced) {
        labelLogger.info('DOCR: top left: worked - all labels placed')
        acceptedLabels = workingLabelSet
      } else if (startingBottomYPositionOfBiggestLabel + stepSize >= maxAllowableLargestLabelY) {
        labelLogger.info('DOCR: top left: Hit maxAllowableLargestLabelY')
        if (workingLabelSet) {
          this.variant.minProportion = this.getNewMinProportion({ placedSet: existingLabels, workingSet: workingLabelSet })
          acceptedLabels = workingLabelSet.filter(label => label.fractionalValue > this.variant.minProportion)
        }
      } else {
        throw new UnexpectedCondition('DOCR: top left: Unexplained loop break')
      }
    }

    return { acceptedLabels }
  }

  placeRight ({ existingLabels, labelSet }) {
    let acceptedLabels = null
    const { labelMaxLineAngle } = this.variant
    const { pieCenter, outerRadius, labelOffset } = this.canvas
    const topIsLifted = false
    const bottomIsLifted = false

    const rightLabels = _(labelSet)
      .filter('inRightHalf')
      .filter(({ fractionalValue }) => fractionalValue >= this.variant.minProportion)
      .value()
    const collisionsInRight = findLabelsIntersecting(existingLabels.concat(rightLabels))

    if (collisionsInRight.length === 0 || rightLabels.length === 0) {
      acceptedLabels = rightLabels
    } else {
      const getLargestLabel = labelSet => labelSet[0]
      labelLogger.info('DOCR: right: collisions detected')
      const stepSize = 5

      // each iteration: move the starting point of the "highest and largest" label higher,
      // and then place the remaining labels going down
      let largestLabel = getLargestLabel(rightLabels)
      let startingTopYPositionOfBiggestLabel = largestLabel.minY + stepSize // NB ensure at least one iteration
      const initialLabelStartingY = largestLabel.minY

      const maxLabelLineAngleCoords = computeLabelLineMaxAngleCoords({
        pieCenter: pieCenter,
        segmentAngle : largestLabel.segmentAngleMidpoint,
        labelMaxLineAngle,
        segmentRadius: outerRadius,
        labelRadius: outerRadius + labelOffset,
      })
      const minYFromCounterClockwiseCoord = (maxLabelLineAngleCoords.counterClockwiseCoord.x >= pieCenter.x)
        ? maxLabelLineAngleCoords.counterClockwiseCoord.y
        : null

      const minAllowableLargestLabelY = _([
        minYFromCounterClockwiseCoord,
        pieCenter.y - outerRadius - labelOffset - largestLabel.height
      ])
        .filter(y => !_.isNull(y))
        .max()


      let allLabelsSuccessfullyPlaced = false // loop condition
      let workingLabelSet = null // persist outside of loop
      while (!allLabelsSuccessfullyPlaced && startingTopYPositionOfBiggestLabel - stepSize > minAllowableLargestLabelY) {
        startingTopYPositionOfBiggestLabel -= stepSize
        labelLogger.info(`DOCR: right: placing largest label ${largestLabel.shortText} ${initialLabelStartingY - startingTopYPositionOfBiggestLabel} px above ideal placement`)
        workingLabelSet = _.cloneDeep(rightLabels)
        const {
          collidingLabels,
          outOfBoundsLabels,
          maxAngleExceededLabels,
        } = this.moveLabelsDown({
          phase: 'right',
          placedSet: existingLabels,
          labelSet: workingLabelSet,
          startingY: startingTopYPositionOfBiggestLabel,
          topIsLifted,
          bottomIsLifted,
        })

        allLabelsSuccessfullyPlaced = _.isEmpty(collidingLabels) && _.isEmpty(outOfBoundsLabels) && _.isEmpty(maxAngleExceededLabels)
      }

      if (allLabelsSuccessfullyPlaced) {
        labelLogger.info('DOCR: right: worked - all labels placed')
        acceptedLabels = workingLabelSet
      } else if (startingTopYPositionOfBiggestLabel - stepSize <= minAllowableLargestLabelY) {
        labelLogger.info('DOCR: right: Hit minAllowableLargestLabelY')
        if (workingLabelSet) {
          this.variant.minProportion = this.getNewMinProportion({ placedSet: existingLabels, workingSet: workingLabelSet })
          acceptedLabels = workingLabelSet.filter(label => label.fractionalValue > this.variant.minProportion)
        }
      } else {
        throw new UnexpectedCondition('DOCR: right: Unexplained loop break')
      }
    }

    return { acceptedLabels }
  }

  placeBottomLeft ({ existingLabels, labelSet }) {
    let acceptedLabels = null

    const { labelMaxLineAngle } = this.variant
    const { height: canvasHeight, pieCenter, outerRadius, labelOffset } = this.canvas
    const topIsLifted = false
    const bottomIsLifted = false

    const bottomLeftLabels = _(labelSet)
      .filter('inBottomLeftQuadrant')
      .filter(({ fractionalValue }) => fractionalValue >= this.variant.minProportion)
      .value()
    const collisionsInBottomLeft = findLabelsIntersecting(existingLabels.concat(bottomLeftLabels))

    if (collisionsInBottomLeft.length === 0 || bottomLeftLabels.length === 0) {
      acceptedLabels = bottomLeftLabels
    } else {
      const getLargestLabel = labelSet => labelSet[0]
      labelLogger.info('DOCR: bottom left: collisions detected')
      const stepSize = 5

      // each iteration: move the starting point of the "lowest and largest" label lower,
      //   and then place the remaining labels going up
      let largestLabel = getLargestLabel(bottomLeftLabels)
      let startingBottomYPositionOfBiggestLabel = largestLabel.maxY - stepSize // NB ensure at least one iteration
      const initialLabelStartingY = largestLabel.maxY

      const maxLabelLineAngleCoords = computeLabelLineMaxAngleCoords({
        pieCenter: pieCenter,
        segmentAngle : largestLabel.segmentAngleMidpoint,
        labelMaxLineAngle,
        segmentRadius: outerRadius,
        labelRadius: outerRadius + labelOffset,
      })
      const maxYFromCounterClockwiseCoord = (maxLabelLineAngleCoords.counterClockwiseCoord.x <= pieCenter.x)
        ? maxLabelLineAngleCoords.counterClockwiseCoord.y
        : null

      const maxAllowableLargestLabelY = _([
        maxYFromCounterClockwiseCoord,
        canvasHeight
      ])
        .filter(y => !_.isNull(y))
        .min()

      let allLabelsSuccessfullyPlaced = false // loop condition
      let workingLabelSet = null // persist outside of loop
      while (!allLabelsSuccessfullyPlaced && startingBottomYPositionOfBiggestLabel + stepSize < maxAllowableLargestLabelY) {
        startingBottomYPositionOfBiggestLabel += stepSize
        labelLogger.info(`DOCR: bottom left: placing largest label ${largestLabel.shortText} ${startingBottomYPositionOfBiggestLabel - initialLabelStartingY} px below ideal placement`)

        workingLabelSet = _.cloneDeep(bottomLeftLabels)
        const {
          collidingLabels,
          outOfBoundsLabels,
          maxAngleExceededLabels,
        } = this.moveLabelsUp({
          phase: 'bottom left',
          placedSet: existingLabels,
          labelSet: workingLabelSet,
          startingY: startingBottomYPositionOfBiggestLabel,
          topIsLifted,
          bottomIsLifted,
        })

        allLabelsSuccessfullyPlaced = _.isEmpty(collidingLabels) && _.isEmpty(outOfBoundsLabels) && _.isEmpty(maxAngleExceededLabels)
      }

      if (allLabelsSuccessfullyPlaced) {
        labelLogger.info('DOCR: bottom left: worked - all labels placed')
        acceptedLabels = workingLabelSet
      } else if (startingBottomYPositionOfBiggestLabel + stepSize >= maxAllowableLargestLabelY) {
        labelLogger.info('DOCR: bottom left: Hit maxAllowableLargestLabelY')
        if (workingLabelSet) {
          this.variant.minProportion = this.getNewMinProportion({ placedSet: existingLabels, workingSet: workingLabelSet })
          acceptedLabels = workingLabelSet.filter(label => label.fractionalValue > this.variant.minProportion)
        }
      } else {
        throw new UnexpectedCondition('DOCR: bottom left: Unexplained loop break')
      }
    }

    return { acceptedLabels }
  }

  /* assume:
    * every label in the placed set is greater than every label in the working set
    * placedSet is sorted in value order descending
   */
  getNewMinProportion ({ workingSet, placedSet }) {
    const { labelMaxLineAngle } = this.variant
    const { width: canvasWidth, height: canvasHeight } = this.canvas
    const minPlacedFractionalValue = _(placedSet).map('fractionalValue').min()

    const largestInvalidLabel = _([
      findLabelsIntersecting(placedSet.concat(workingSet)),
      findLabelsOutOfBounds(workingSet, canvasWidth, canvasHeight),
      findLabelsExceedingMaxLabelLineAngle(workingSet, labelMaxLineAngle),
    ])
      .flatten()
      .filter(({ fractionalValue }) => fractionalValue < minPlacedFractionalValue) // TODO fix : not strictly true. what if they are == to each other
      .sortBy('fractionalValue')
      .last()

    if (!largestInvalidLabel) {
      return this.variant.minProportion
    } else {
      const indexOfLargestInvalidLabelInWorkingSet = workingSet.indexOf(largestInvalidLabel)
      const smallestValidLabel = (indexOfLargestInvalidLabelInWorkingSet === 0)
        ? _.last(placedSet)
        : workingSet[indexOfLargestInvalidLabelInWorkingSet - 1]
      return smallestValidLabel.fractionalValue
    }
  }

  moveLabelsDown ({ phase, placedSet, labelSet, startingY, topIsLifted, bottomIsLifted }) {
    const { labelMaxLineAngle } = this.variant
    const { outerPadding } = this.invariant
    const { width: canvasWidth, height: canvasHeight } = this.canvas

    _(labelSet).each((label, index) => {
      const maxLabelLineAngleCoords = computeLabelLineMaxAngleCoords({
        pieCenter: this.canvas.pieCenter,
        segmentAngle : label.segmentAngleMidpoint,
        labelMaxLineAngle,
        segmentRadius: this.canvas.outerRadius,
        labelRadius: this.canvas.outerRadius + this.canvas.labelOffset,
      })
      const { clockwiseCoord } = maxLabelLineAngleCoords

      let newY = (index === 0)
        ? startingY
        : labelSet[index - 1].maxY + outerPadding

      if (clockwiseCoord && newY > clockwiseCoord.y) {
        labelLogger.debug(`DOCR: moveDown: limiting ${label.shortText} based on maxLineAngle`)
        newY = clockwiseCoord.y
      }

      this.canvas.adjustLabelToNewY({
        anchor: 'top',
        newY: Math.min(canvasHeight - label.height, newY),
        label,
        topIsLifted,
        bottomIsLifted,
      })
    })

    const collidingLabels = findLabelsIntersecting(placedSet.concat(labelSet))
    const outOfBoundsLabels = findLabelsOutOfBounds(labelSet, canvasWidth, canvasHeight)
    const maxAngleExceededLabels = findLabelsExceedingMaxLabelLineAngle(labelSet, labelMaxLineAngle)

    const largestLabel = labelSet[0]
    labelLogger.info([
      `DOCR: ${phase}:`,
      `placement offset for ${largestLabel.shortText}:`,
      `${startingY.toFixed(2)} (labelLineAngle: ${largestLabel.labelLineAngle.toFixed(2)}.`,
      `collidingLabels: ${collidingLabels.length} outOfBoundsLabels: ${outOfBoundsLabels.length} maxAngleExceededLabels: ${maxAngleExceededLabels.length}`
    ].join(' '))
    labelLogger.debug('details', {
      collidingLabels: collidingLabels.map(({ shortText }) => shortText).join(','),
      outOfBoundsLabels: outOfBoundsLabels.map(({ shortText }) => shortText).join(','),
      maxAngleExceededLabels: maxAngleExceededLabels.map(({ shortText, labelLineAngle }) => `${shortText}:${labelLineAngle.toFixed(2)}`).join(','),
    })

    return {
      collidingLabels,
      outOfBoundsLabels,
      maxAngleExceededLabels,
    }
  }

  moveLabelsUp ({ phase, placedSet, labelSet, startingY, topIsLifted, bottomIsLifted }) {
    const { labelMaxLineAngle } = this.variant
    const { outerPadding } = this.invariant
    const { width: canvasWidth, height: canvasHeight } = this.canvas

    _(labelSet).each((label, index) => {
      const maxLabelLineAngleCoords = computeLabelLineMaxAngleCoords({
        pieCenter: this.canvas.pieCenter,
        segmentAngle : label.segmentAngleMidpoint,
        labelMaxLineAngle,
        segmentRadius: this.canvas.outerRadius,
        labelRadius: this.canvas.outerRadius + this.canvas.labelOffset,
      })
      const { counterClockwiseCoord } = maxLabelLineAngleCoords

        let newY = (index === 0)
        ? startingY
        : labelSet[index - 1].minY - outerPadding

      if (counterClockwiseCoord && newY > counterClockwiseCoord.y) {
        labelLogger.debug(`DOCR: moveUp: limiting ${label.shortText} based on maxLineAngle`)
        newY = counterClockwiseCoord.y
      }

      this.canvas.adjustLabelToNewY({
        anchor: 'bottom',
        newY: Math.max(label.height, newY),
        label,
        topIsLifted,
        bottomIsLifted,
      })
    })

    const collidingLabels = findLabelsIntersecting(placedSet.concat(labelSet))
    const outOfBoundsLabels = findLabelsOutOfBounds(labelSet, canvasWidth, canvasHeight)
    const maxAngleExceededLabels = findLabelsExceedingMaxLabelLineAngle(labelSet, labelMaxLineAngle)

    const largestLabel = labelSet[0]
    labelLogger.info([
      `DOCR: ${phase}:`,
      `placement offset for ${largestLabel.shortText}:`,
      `${startingY.toFixed(2)} (labelLineAngle: ${largestLabel.labelLineAngle.toFixed(2)}.`,
      `collidingLabels: ${collidingLabels.length} outOfBoundsLabels: ${outOfBoundsLabels.length} maxAngleExceededLabels: ${maxAngleExceededLabels.length}`
    ].join(' '))
    labelLogger.debug('details', {
      collidingLabels: collidingLabels.map(({ shortText }) => shortText).join(','),
      outOfBoundsLabels: outOfBoundsLabels.map(({ shortText }) => shortText).join(','),
      maxAngleExceededLabels: maxAngleExceededLabels.map(({ shortText, labelLineAngle }) => `${shortText}:${labelLineAngle.toFixed(2)}`).join(','),
    })

    return {
      collidingLabels,
      outOfBoundsLabels,
      maxAngleExceededLabels,
    }
  }
}

module.exports = DescendingOrderCollisionResolver