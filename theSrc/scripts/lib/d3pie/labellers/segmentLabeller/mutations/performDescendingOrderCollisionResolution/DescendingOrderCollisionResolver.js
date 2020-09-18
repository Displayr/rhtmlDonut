import _ from 'lodash'
import * as rootLog from 'loglevel'

import { extractAndThrowIfNullFactory } from '../../mutationHelpers'
import {findLabelsExceedingMaxLabelLineAngle, findLabelsIntersecting, findLabelsOutOfBounds} from '../../../labelUtils'
import UnexpectedCondition from '../../../../interrupts/unexpectedCondition'
import { toRadians, computeIntersectionOfLineAndCircle } from '../../../../math'
const labelLogger = rootLog.getLogger('label')

const VARIABLE_CONFIG = [
  'labelMaxLineAngle',
  'minProportion'
]

const INVARIABLE_CONFIG = [
  'liftOffAngle',
  'outerPadding',
]

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
    const { height: canvasHeight } = this.canvas
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
      labelLogger.info('descending placement: top left: collisions detected')
      const stepSize = 5

      // loop conditions
      let allLabelsSuccessfullyPlaced = false
      let largestLabelExceedsMaxLabelLineAngle = false
      let haveHitBottom = false

      // data structures to persist out of loop
      let workingLabelSet = null
      let lastPlacementLabelSet = null

      // each iteration: move the starting point of the "lowest and largest" label lower,
      //   and then place the remaining labels going up
      let largestLabel = getLargestLabel(topLeftLabels)
      let startingBottomYPositionOfBiggestLabel = largestLabel.maxY
      const initialLargestLabelMaxY = startingBottomYPositionOfBiggestLabel

      const lowestAllowableLargestLabelMaxY = computeLabelLineMaxAngleCoords({ label: largestLabel, labelMaxLineAngle, canvas: this.canvas}).y

      while (!allLabelsSuccessfullyPlaced && !haveHitBottom && !largestLabelExceedsMaxLabelLineAngle && startingBottomYPositionOfBiggestLabel + stepSize < lowestAllowableLargestLabelMaxY) {
        startingBottomYPositionOfBiggestLabel += stepSize
        labelLogger.info(`placing largest label ${largestLabel.shortText} ${startingBottomYPositionOfBiggestLabel - initialLargestLabelMaxY} px below ideal placement`)
        if (startingBottomYPositionOfBiggestLabel > canvasHeight) {
          haveHitBottom = true
          break
        }

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

        if (getLargestLabel(workingLabelSet).labelLineAngle > labelMaxLineAngle) {
          labelLogger.info(`largestLabel ${getLargestLabel(workingLabelSet).shortText} exceeds angle with ${getLargestLabel(workingLabelSet).labelLineAngle.toFixed}`)
          largestLabelExceedsMaxLabelLineAngle = true
          break
        }

        lastPlacementLabelSet = workingLabelSet
      }

      if (allLabelsSuccessfullyPlaced) {
        labelLogger.info('descending placement: top left: worked - all labels placed')
        acceptedLabels = workingLabelSet
      } else if (largestLabelExceedsMaxLabelLineAngle) {
        labelLogger.info('descending placement: top left: Largest label exceeds maxLabelLineAngle')

        // must use the previous run, not the current run, because this test runs after mod of workingSet, so working set is invalid
        if (lastPlacementLabelSet) {
          this.variant.minProportion = this.getNewMinProportion({ placedSet: existingLabels, workingSet: lastPlacementLabelSet })
          acceptedLabels = lastPlacementLabelSet.filter(label => label.fractionalValue > this.variant.minProportion)
        }
      } else if (haveHitBottom) {
        // NB this condition should be impossible as maxLineAngle will always be exceeded before we go off bottom,
        // but for symmetry with placeRight and placeBottomLeft we keep it
        labelLogger.info('descending placement: top left: Hit bottom')

        if (workingLabelSet) {
          this.variant.minProportion = this.getNewMinProportion({ placedSet: existingLabels, workingSet: workingLabelSet })
          acceptedLabels = workingLabelSet.filter(label => label.fractionalValue > this.variant.minProportion)
        }
      } else if (startingBottomYPositionOfBiggestLabel + stepSize >= lowestAllowableLargestLabelMaxY) {
        // NB this condition should be impossible as maxLineAngle will always be exceeded before we go off bottom,
        // but for symmetry with placeRight and placeBottomLeft we keep it
        labelLogger.info('descending placement: top left: Hit lowestAllowableLargestLabelMaxY')

        if (workingLabelSet) {
          this.variant.minProportion = this.getNewMinProportion({ placedSet: existingLabels, workingSet: workingLabelSet })
          acceptedLabels = workingLabelSet.filter(label => label.fractionalValue > this.variant.minProportion)
        }
      } else {
        throw new UnexpectedCondition('descending placement: top left: Unexplained loop break')
      }
    }

    return { acceptedLabels }
  }

  placeRight ({ existingLabels, labelSet }) {
    let acceptedLabels = null

    const { labelMaxLineAngle } = this.variant
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
      labelLogger.info('descending placement: right: collisions detected')

      const stepSize = 5

      // loop conditions
      let allLabelsSuccessfullyPlaced = false
      let largestLabelExceedsMaxLabelLineAngle = false
      let haveHitTop = false

      // data structures to persist out of loop
      let workingLabelSet = null
      let lastPlacementLabelSet = null

      // each iteration: move the starting point of the "highest and largest" label higher,
      //   and then place the remaining labels going down
      let startingTopYPositionOfBiggestLabel = getLargestLabel(rightLabels).minY
      while (!allLabelsSuccessfullyPlaced && !haveHitTop && !largestLabelExceedsMaxLabelLineAngle) {
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

        if (getLargestLabel(workingLabelSet).labelLineAngle > labelMaxLineAngle) {
          largestLabelExceedsMaxLabelLineAngle = true
          break
        }

        startingTopYPositionOfBiggestLabel -= stepSize
        if (startingTopYPositionOfBiggestLabel < 0) {
          haveHitTop = true
          break
        }

        lastPlacementLabelSet = workingLabelSet
      }

      if (allLabelsSuccessfullyPlaced) {
        labelLogger.info('descending placement: right: worked - all labels placed')
        acceptedLabels = workingLabelSet
      } else if (largestLabelExceedsMaxLabelLineAngle) {
        labelLogger.info('descending placement: right: Largest label exceeds maxLabelLineAngle')

        // must use the previous run, not the current run, because currently the largestLabelExceedsMaxLabelLineAngle test run after modification of workingSet, therefore workingset at this point is "one loop iteration too far"
        if (lastPlacementLabelSet) {
          this.variant.minProportion = this.getNewMinProportion({ placedSet: existingLabels, workingSet: lastPlacementLabelSet })
          acceptedLabels = lastPlacementLabelSet.filter(label => label.fractionalValue > this.variant.minProportion)
        }
      } else if (haveHitTop) {
        labelLogger.info('descending placement: right: Hit top')

        if (workingLabelSet) {
          this.variant.minProportion = this.getNewMinProportion({ placedSet: existingLabels, workingSet: workingLabelSet })
          acceptedLabels = workingLabelSet.filter(label => label.fractionalValue > this.variant.minProportion)
        }
      } else {
        throw new UnexpectedCondition('descending placement: right: Unexplained loop break')
      }
    }

    return { acceptedLabels }
  }

  placeBottomLeft ({ existingLabels, labelSet }) {
    let acceptedLabels = null

    const { labelMaxLineAngle } = this.variant
    const { height: canvasHeight } = this.canvas
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
      labelLogger.info('descending placement: bottom left: collisions detected')
      const stepSize = 5

      // loop conditions
      let allLabelsSuccessfullyPlaced = false
      let largestLabelExceedsMaxLabelLineAngle = false
      let haveHitBottom = false

      // data structures to persist out of loop
      let workingLabelSet = null
      let lastPlacementLabelSet = null

      // each iteration: move the starting point of the "lowest and largest" label lower,
      //   and then place the remaining labels going up
      let startingBottomYPositionOfBiggestLabel = getLargestLabel(bottomLeftLabels).maxY
      while (!allLabelsSuccessfullyPlaced && !haveHitBottom && !largestLabelExceedsMaxLabelLineAngle) {
        startingBottomYPositionOfBiggestLabel += stepSize
        if (startingBottomYPositionOfBiggestLabel > canvasHeight) {
          haveHitBottom = true
          break
        }

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

        if (getLargestLabel(workingLabelSet).labelLineAngle > labelMaxLineAngle) {
          largestLabelExceedsMaxLabelLineAngle = true
          break
        }

        lastPlacementLabelSet = workingLabelSet
      }

      if (allLabelsSuccessfullyPlaced) {
        labelLogger.info('descending placement: bottom left: worked - all labels placed')
        acceptedLabels = workingLabelSet
      } else if (largestLabelExceedsMaxLabelLineAngle) {
        labelLogger.info('descending placement: bottom left: Largest label exceeds maxLabelLineAngle')

        // must use the previous run, not the current run, because currently this test run after mod of workingSet
        if (lastPlacementLabelSet) {
          this.variant.minProportion = this.getNewMinProportion({ placedSet: existingLabels, workingSet: lastPlacementLabelSet })
          acceptedLabels = lastPlacementLabelSet.filter(label => label.fractionalValue > this.variant.minProportion)
        }
      } else if (haveHitBottom) {
        labelLogger.info('descending placement: bottom left: Hit bottom')

        if (workingLabelSet) {
          this.variant.minProportion = this.getNewMinProportion({ placedSet: existingLabels, workingSet: workingLabelSet })
          acceptedLabels = workingLabelSet.filter(label => label.fractionalValue > this.variant.minProportion)
        }
      } else {
        throw new UnexpectedCondition('descending placement: bottom left: Unexplained loop break')
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
      const newY = (index === 0)
        ? startingY
        : labelSet[index - 1].maxY + outerPadding

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
      `descending placement: ${phase}:`,
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

      const labelCoordAtMaxAngleCounterClockwiseFromSegment = computeLabelLineMaxAngleCoords({
        label,
        labelMaxLineAngle,
        canvas: this.canvas
      })

      let newY = (index === 0)
        ? startingY
        : labelSet[index - 1].minY - outerPadding

      // console.log(`label at ${label.segmentAngleMidpoint.toFixed(2)}(${label.shortText}) newY ${newY} dodgy coord ${_.get(labelCoordAtMaxAngleCounterClockwiseFromSegment, 'y', 'null')}`)

      if (labelCoordAtMaxAngleCounterClockwiseFromSegment && newY > labelCoordAtMaxAngleCounterClockwiseFromSegment.y) {
        console.log(`limiting ${label.shortText} based on maxLineAngle`)
        newY = labelCoordAtMaxAngleCounterClockwiseFromSegment.y
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
      `descending placement: ${phase}:`,
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

const ensurePositive = x => (x > 0) ? x : -1 * x
const ensureNegative = x => (x < 0) ? x : -1 * -x

//https://owlcation.com/stem/Everything-About-Triangles-and-More-Isosceles-Equilateral-Scalene-Pythagoras-Sine-and-Cosine
const computeLabelLineMaxAngleCoords = ({ label, labelMaxLineAngle, canvas }) => {
  // NB var naming is consistent with triangle math on link. a,b,c are sides, A,B,C are angles
  // triangle in question:
  // b - side from pie center to segmentMidPoint on outerCircle - known length = outerRadius
  // a - side from pie center to the "labels furthest allowable placement" on labelCircle - known length = outerRadius + labelOffset
  // c - side from segmentMidPoint to "labels furthest allowable placement"
  // start with A, a, b
  const A = 180 - labelMaxLineAngle
  const a = canvas.outerRadius + canvas.labelOffset
  const b = canvas.outerRadius

  // get B using sine rule
  const B = Math.asin( b * Math.sin(toRadians(A)) / a )

  // get C using sum(angle) = 180
  const C = 180 - B - A
  const radC = toRadians(C)

  // get c using cosine rule
  const c = Math.sqrt(a * a + B * b - 2 * a * b * Math.cos(radC))

  if (label.inTopLeftQuadrant) {
    // counterclockwise calcs
    const angle = label.segmentAngleMidpoint - labelMaxLineAngle
    let counterClockwiseCoord, clockwiseCoord
    if (angle >= 0) {
      counterClockwiseCoord = {
        x: label.segmentMidpointCoord.x - c * Math.cos(radC),
        y: label.segmentMidpointCoord.y - c * Math.cos(radC)
      }
      clockwiseCoord = {}
    } else {
      counterClockwiseCoord = {
        x: label.segmentMidpointCoord.x - c * Math.cos(radC),
        y: label.segmentMidpointCoord.y + c * Math.cos(radC)
      }
      clockwiseCoord = {}
    }
    return counterClockwiseCoord
  }
  return null
}