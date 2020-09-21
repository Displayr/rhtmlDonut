import _ from 'lodash'
import * as rootLog from 'loglevel'

import { extractAndThrowIfNullFactory } from '../../mutationHelpers'
import { terminateLoop } from '../../../../../loopControls'
import RBush from 'rbush'
const labelLogger = rootLog.getLogger('label')

const CC = 'COUNTER_CLOCKWISE'
const CW = 'CLOCKWISE'

const VARIABLE_CONFIG = [
  'labelMaxLineAngle',
  'minProportion',
]

const INVARIABLE_CONFIG = [
  'liftOffAngle',
  'outerPadding',
]

const debugLogs = () => (rootLog.getLevel() <= rootLog.levels.DEBUG)

class DescendingOrderCollisionResolver {
  constructor ({ labelSet, variant, invariant, canvas }) {
    this.extractConfig({ variant, invariant })
    this.canvas = canvas
    this.inputLabelSet = labelSet
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
    const { maxVerticalOffset, labelOffset, outerRadius } = this.canvas
    const safetyPadding = 10
    const heightIncrement = 25
    const availableHeightForLabelEllipse = Math.max(0, maxVerticalOffset - labelOffset - safetyPadding)
    const numberOfVariationsToTry = Math.max(1, Math.floor(availableHeightForLabelEllipse / heightIncrement))
    const extraHeightOptions = _.range(numberOfVariationsToTry).map(index => index * heightIncrement)
    if (_.last(extraHeightOptions) !== availableHeightForLabelEllipse) { extraHeightOptions.push(availableHeightForLabelEllipse) }

    const solutions = []
    _(extraHeightOptions).each(extraHeight => {
      let labelSet = _.cloneDeep(this.inputLabelSet)
      const radialWidth = outerRadius + labelOffset
      const radialHeight = outerRadius + labelOffset + extraHeight
      
      const { acceptedLabels, newVariants } = this.placeOnLabelEllipseAndResolveCollisions({ 
        iterationName: extraHeight.toFixed(0), 
        labelSet, 
        radialWidth, 
        radialHeight 
      })
      const loss = this.inputLabelSet.length - acceptedLabels.length
      solutions.push({ extraHeight, acceptedLabels, loss, newVariants })

      if (loss === 0) {
        labelLogger.info(`DOCR: extraHeight ${extraHeight} yields solution with no loss. Done`)
        return terminateLoop
      } else {
        labelLogger.info(`DOCR: extraHeight ${extraHeight} yields solution with loss of ${loss} labels.`)
      }
    })

    const bestSolution = _(solutions)
      .sortBy('loss', 'extraHeight')
      .first()

    labelLogger.info(`DOCR: chose solution with extraHeight ${bestSolution.extraHeight} and loss of ${bestSolution.loss} labels`)

    return {
      inner: [],
      outer: bestSolution.acceptedLabels,
      newVariants: bestSolution.newVariants,
      stats: {},
    }
  }

  placeOnLabelEllipseAndResolveCollisions ({ iterationName, labelSet, radialWidth, radialHeight }) {
    const logPrefix = `DOCR(${iterationName}):`

    // initial placement
    _(labelSet).each(label => {
      const newLineConnectorCoord = this.canvas.computeCoordOnEllipse({ angle: label.segmentAngleMidpoint, radialWidth, radialHeight })
      label.placeLabelViaConnectorCoordOnEllipse(newLineConnectorCoord, label.segmentAngleMidpoint)
    })
    
    // TODO this is odd because I am alternating between accessing wrappedLabelSet and labelSet directly ...
    const wrappedLabelSet = new LabelSet(labelSet)
    const initialCollisions = wrappedLabelSet.findAllCollisions()
    if (initialCollisions.length === 0) {
      labelLogger.info(`${logPrefix} no collisions detected in initial layout. Terminating collision detection.`)
      return { acceptedLabels: labelSet, newVariants: {} }
    }

    const maxSweeps = 10
    const angleIncrement = 0.5

    const sweepState = {
      direction: CW,
      sweepCount: 0,
      placedAllLabels: false,
      barrierAngle: wrappedLabelSet.getLabelByIndex(0).labelAngle,
      frontierPerSweep: [],
      hasHitMaxAngle: {
        [CW]: false,
        [CC]: false,
      },
      barrierAngleExceeded: false,
    }
    const startNewSweep = () => sweepState.sweepCount++
    const recordSweepLimit = (index) => sweepState.frontierPerSweep.push(index)
    const recordHitMaxAngle = (type) => { sweepState.hasHitMaxAngle[type] = true }
    const recordBarrierAngleExceeded = () => { sweepState.barrierAngleExceeded = true }

    const lastTwoFrontiersAreSame = () => {
      const numSweepRecords = sweepState.frontierPerSweep.length
      if (numSweepRecords < 2) { return null }
      return sweepState.frontierPerSweep[numSweepRecords - 1] === sweepState.frontierPerSweep[numSweepRecords - 2]
    }

    //the "barrier angle" is where the largest label meets the smallest label (around 0 degrees)
    const isBarrierAngleExceeded = (label) => {
      const barrierAngleIsInBottomLeftQuadrant = (sweepState.barrierAngle >= 270)
      const newLabelAngleInTopLeftQuadrant = (label.labelAngle < 90)
      return (
        label.inBottomLeftQuadrant && // NB this is actually "the segment is in bottom left quadrant"
        (
          (barrierAngleIsInBottomLeftQuadrant && label.labelAngle >= sweepState.barrierAngle) ||
          (!barrierAngleIsInBottomLeftQuadrant && newLabelAngleInTopLeftQuadrant && label.labelAngle >= sweepState.barrierAngle)
        )
      )
    }

    const keepSweeping = () => {
      const { placedAllLabels, direction, sweepCount, hasHitMaxAngle, barrierAngleExceeded } = sweepState
      if (placedAllLabels) { return false }
      const lastPhaseCompleted = (direction === CW) ? CC : CW
      if (lastPhaseCompleted === CC) { return true } // always finish with a CW sweep

      if (barrierAngleExceeded) { return false }
      if (sweepCount > maxSweeps) { return false }
      if (!hasHitMaxAngle[CW] || !hasHitMaxAngle[CC]) { return true }
      if (lastTwoFrontiersAreSame()) { return false }

      return true
    }

    const { labelMaxLineAngle } = this.variant
    const getLabelCoordAt = (angle) => this.canvas.computeCoordOnEllipse({ angle, radialWidth, radialHeight })

    while (keepSweeping()) {
      const { direction } = sweepState
      if (direction === CW) {
        startNewSweep()
        labelLogger.info(`${logPrefix} sweep${sweepState.sweepCount} starting CW`)
        const collisions = wrappedLabelSet.findAllCollisions()
        const largestCollidingLabel = _(collisions).sortBy('fractionalValue').last()
        const frontierIndex = wrappedLabelSet.getIndexByLabel(largestCollidingLabel)
        sweepState.frontierLabel = largestCollidingLabel

        // NB frontierIndex + 1 as the largest colliding label doesn't need to be moved,
        // the labels colliding with it need to be moved and so on
        _(_.range(frontierIndex + 1, wrappedLabelSet.getLength())).each(index => {
          const label = wrappedLabelSet.getLabelByIndex(index)

          if (debugLogs()) {
            labelLogger.debug([
              `${logPrefix} sweep${sweepState.sweepCount}`,
              `CW: frontier ${label.shortText}.`,
              `labelLineAngle: ${label.labelLineAngle.toFixed(2)}`,
              `labelAngle: ${label.labelAngle.toFixed(2)}`,
            ].join(' '))
          }

          while (wrappedLabelSet.findAllCollisionsWithGreaterLabels(label).length > 0 && !(label.labelLineAngle > labelMaxLineAngle) && !isBarrierAngleExceeded(label)) {
            if (debugLogs()) {
              labelLogger.debug(`${logPrefix} sweep${sweepState.sweepCount} CW: moving ${label.shortText}`)
              labelLogger.debug(`${label.labelPositionSummary} collides with`)
              wrappedLabelSet.findAllCollisionsWithGreaterLabels(label).map(x => labelLogger.debug(`  ${x.labelPositionSummary}`))
            }
            const newLineConnectorCoord = getLabelCoordAt(label.labelAngle + angleIncrement)
            wrappedLabelSet.moveLabel(label, newLineConnectorCoord, label.labelAngle + angleIncrement)
          }

          sweepState.frontierLabel = label

          if (label.labelLineAngle > labelMaxLineAngle) {
            labelLogger.info(`${logPrefix} sweep${sweepState.sweepCount} CW: frontier ${label.shortText}. Max angle exceed. Terminate CW`)
            wrappedLabelSet.resetLabel(label)
            sweepState.direction = CC
            recordSweepLimit(index)
            recordHitMaxAngle(CW)
            return terminateLoop
          }

          if (isBarrierAngleExceeded(label)) {
            labelLogger.info(`${logPrefix} sweep${sweepState.sweepCount} CW: frontier ${label.shortText}. Barrier angle exceeded. Terminate CW`)
            wrappedLabelSet.resetLabel(label)
            sweepState.direction = CC
            recordSweepLimit(index)
            recordBarrierAngleExceeded()
            return terminateLoop
          }
        })

        if (
          (!sweepState.hasHitMaxAngle[CW] && !sweepState.barrierAngleExceeded) ||
          collisions.length === 0
        ) { sweepState.placedAllLabels = true }
      } else { // Start CC Sweep
        labelLogger.info(`${logPrefix} sweep${sweepState.sweepCount} starting CC`)
        const frontierIndex = wrappedLabelSet.getIndexByLabel(sweepState.frontierLabel)
        _(_.range(frontierIndex, -1, -1)).each(index => {
          const label = wrappedLabelSet.getLabelByIndex(index)

          if (debugLogs()) {
            labelLogger.debug([
              `${logPrefix} sweep${sweepState.sweepCount}`,
              `CC: frontier ${label.shortText}.`,
              `labelLineAngle: ${label.labelLineAngle.toFixed(2)}`,
              `labelAngle: ${label.labelAngle.toFixed(2)}`,
            ].join(' '))
          }

          while (wrappedLabelSet.findAllCollisionsWithLesserLabels(label).length > 0 && !(label.labelLineAngle > labelMaxLineAngle)) {
            if (debugLogs()) {
              labelLogger.debug(`${logPrefix} sweep${sweepState.sweepCount} CC: moving ${label.shortText}`)
              labelLogger.debug(`${label.labelPositionSummary} collides with`)
              wrappedLabelSet.findAllCollisionsWithGreaterLabels(label).map(x => labelLogger.debug(`  ${x.labelPositionSummary}`))
            }
            const newLineConnectorCoord = getLabelCoordAt(label.labelAngle - angleIncrement)
            wrappedLabelSet.moveLabel(label, newLineConnectorCoord, label.labelAngle - angleIncrement)
          }

          if (label.labelLineAngle > labelMaxLineAngle) {
            labelLogger.info(`${logPrefix} sweep${sweepState.sweepCount} CC: frontier ${label.shortText}. Max angle exceed. Reset Label and continue CC`)
            wrappedLabelSet.resetLabel(label)
            recordHitMaxAngle(CC)
          }

          if (index === 0) {
            sweepState.barrierAngle = label.labelAngle
          }
        })

        sweepState.direction = CW
      }
    }

    let acceptedLabels = wrappedLabelSet.getLabels()
    let newVariants = {}

    if (!sweepState.placedAllLabels) {
      const indexOfFrontier = acceptedLabels.indexOf(sweepState.frontierLabel)
      acceptedLabels = acceptedLabels
        .filter((label, index) => index < indexOfFrontier)
      newVariants.minProportion = _(acceptedLabels).map('fractionalValue').min()
    }

    return { acceptedLabels, newVariants }
  }
}

class LabelSet {
  constructor (labelSet) {
    this.labelSet = labelSet
    this._buildCollisionTree(labelSet)
  }

  _buildCollisionTree (labels) {
    this.collisionTree = new RBush()
    this.collisionTree.load(labels)
  }

  findAllCollisions () {
    return this.labelSet
      .filter(label => {
        const collisions = this.collisionTree.search(label)
          .filter(intersectingLabel => intersectingLabel.id !== label.id)
        return collisions.length
      })
  }

  findAllCollisionsWithGreaterLabels (label) {
    return this.collisionTree.search(label)
      .filter(intersectingLabel => intersectingLabel.id < label.id)
  }

  findAllCollisionsWithLesserLabels (label) {
    return this.collisionTree.search(label)
      .filter(intersectingLabel => intersectingLabel.id > label.id)
  }

  moveLabel (label, newLineConnectorCoord, labelAngle) {
    this.collisionTree.remove(label)
    // label.placeLabelViaConnectorCoord(newLineConnectorCoord) // for circle
    label.placeLabelViaConnectorCoordOnEllipse(newLineConnectorCoord, labelAngle) // for ellipse
    this.collisionTree.insert(label)
  }

  resetLabel (label) {
    this.collisionTree.remove(label)
    label.reset()
    this.collisionTree.insert(label)
  }

  getLabelByIndex (index) { return this.labelSet[index] }
  getIndexByLabel (label) { return this.labelSet.indexOf(label) }
  getLabels () { return this.labelSet }
  getLength () { return this.labelSet.length }
}

module.exports = DescendingOrderCollisionResolver
