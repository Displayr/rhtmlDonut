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
const infoLogs = () => (rootLog.getLevel() <= rootLog.levels.INFO)

class DescendingOrderCollisionResolver {
  constructor ({ labelSet, variant, invariant, canvas }) {
    this.extractConfig({ variant, invariant })
    this.canvas = canvas
    this.stats = {}
    this.labels = labelSet
    this.attempts = []
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
    const radialWidth = this.canvas.outerRadius + this.canvas.labelOffset
    const radialHeight = this.canvas.outerRadius + this.canvas.maxVerticalOffset - 20
    _(this.labels).each(label => {
      const newLineConnectorCoord = this.canvas.computeCoordOnEllipse({angle: label.segmentAngleMidpoint, radialWidth, radialHeight})
      label.placeLabelViaConnectorCoordOnEllipse(newLineConnectorCoord, label.segmentAngleMidpoint)
    })

    this.buildCollisionTree()
    const initialCollisions = this.findAllCollisions()
    if (initialCollisions.length === 0) {
      labelLogger.info(`no collisions detected in initial layout. Terminating collision detection.`)
      this.stats.skipped = true
    } else {
      this.sweepBackAndForthUntilComplete()
    }

    return {
      inner: [],
      outer: this.labels,
      newVariants: this.variant,
      stats: this.stats,
    }
  }

  sweepBackAndForthUntilComplete () {
    const maxSweeps = 10
    const angleIncrement = 0.5

    this.sweepState = {
      direction: CW,
      sweepCount: 0,
      placedAllLabels: false,
      barrierAngle: this.labels[0].labelAngle,
      frontierPerSweep: [],
      hasHitMaxAngle: {
        [CW]: false,
        [CC]: false,
      },
      barrierAngleExceeded: false,
    }
    const startNewSweep = () => {
      this.sweepState.sweepCount++
    }
    const recordSweepLimit = (index) => {
      this.sweepState.frontierPerSweep.push(index)
    }
    const recordHitMaxAngle = (type) => {
      this.sweepState.hasHitMaxAngle[type] = true
    }
    const recordBarrierAngleExceeded = () => {
      this.sweepState.barrierAngleExceeded = true
    }
    const lastTwoFrontiersAreSame = () => {
      const numSweepRecords = this.sweepState.frontierPerSweep.length
      if (numSweepRecords < 2) { return null }
      return this.sweepState.frontierPerSweep[numSweepRecords - 1] === this.sweepState.frontierPerSweep[numSweepRecords - 2]
    }
    const isBarrierAngleExceeded = (label) => {
      const barrierAngleIsInBottomLeftQuadrant = (this.sweepState.barrierAngle >= 270)
      const newLabelAngleInTopLeftQuadrant = (label.labelAngle < 90)
      return (
        label.inBottomLeftQuadrant && // NB this is actually "the segment is in bottom left quadrant"
        (
          (barrierAngleIsInBottomLeftQuadrant && label.labelAngle >= this.sweepState.barrierAngle) ||
          (!barrierAngleIsInBottomLeftQuadrant && newLabelAngleInTopLeftQuadrant && label.labelAngle >= this.sweepState.barrierAngle)
        )
      )
    }
    const keepSweeping = () => {
      const { placedAllLabels, direction, sweepCount, hasHitMaxAngle, barrierAngleExceeded } = this.sweepState
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
    const radialWidth = this.canvas.outerRadius + this.canvas.labelOffset
    const radialHeight = this.canvas.outerRadius + this.canvas.maxVerticalOffset - 20
    const getLabelCoordAt = (angle) => this.canvas.computeCoordOnEllipse({ angle, radialWidth, radialHeight })

    while (keepSweeping()) {
      const { direction } = this.sweepState
      if (direction === CW) {
        startNewSweep()
        labelLogger.info(`DOCR: sweep${this.sweepState.sweepCount} starting CW`)
        const collisions = this.findAllCollisions()
        const largestCollidingLabel = _(collisions).sortBy('fractionalValue').last()
        const frontierIndex = this.labels.indexOf(largestCollidingLabel)
        this.sweepState.frontierLabel = largestCollidingLabel

        _(_.range(frontierIndex + 1, this.labels.length - 1)).each(index => {
          const label = this.labels[index]

          if (infoLogs()) {
            labelLogger.info([
              `DOCR: sweep${this.sweepState.sweepCount}`,
              `CW: frontier ${label.shortText}.`,
              `labelLineAngle: ${label.labelLineAngle.toFixed(2)}`,
              `labelAngle: ${label.labelAngle.toFixed(2)}`,
            ].join(' '))
          }

          while (this.findAllCollisionsWithGreaterLabels(label).length > 0 && !(label.labelLineAngle > labelMaxLineAngle) && !isBarrierAngleExceeded(label)) {
            if (debugLogs()) {
              labelLogger.debug(`DOCR: sweep${this.sweepState.sweepCount} CW: moving ${label.shortText}`)
              const labelPositionSummary = label => [
                `label ${label.shortText}(${label.labelAngle.toFixed(2)})`,
                `x: ${label.minX.toFixed(2)}-${label.maxX.toFixed(2)}`,
                `y: ${label.minY.toFixed(2)}-${label.maxY.toFixed(2)}`,
              ].join(' ')
              labelLogger.debug(labelPositionSummary(label))
              // labelLogger.debug('collides with')
              // this.findAllCollisionsWithGreaterLabels(label).map(x => labelLogger.debug(labelPositionSummary(x)))
            }
            const newLineConnectorCoord = getLabelCoordAt(label.labelAngle + angleIncrement)
            this.moveLabel(label, newLineConnectorCoord, label.labelAngle + angleIncrement)

            // if (label.shortText === '173') {
            //   debugger
            //   this.canvas.svg.append('circle')
            //     .attr('cx', newLineConnectorCoord.x)
            //     .attr('cy', newLineConnectorCoord.y)
            //     .attr('r', 3)
            //     .attr('fill', 'black')
            //     .attr('stroke', 'black')
            // }
          }

          this.sweepState.frontierLabel = label

          if (label.labelLineAngle > labelMaxLineAngle) {
            labelLogger.info(`DOCR: sweep${this.sweepState.sweepCount} CW: frontier ${label.shortText}. Max angle exceed. Terminate CW`)
            this.resetLabel(label)
            this.sweepState.direction = CC
            recordSweepLimit(index)
            recordHitMaxAngle(CW)
            return terminateLoop
          }

          if (isBarrierAngleExceeded(label)) {
            labelLogger.info(`DOCR: sweep${this.sweepState.sweepCount} CW: frontier ${label.shortText}. Barrier angle exceeded. Terminate CW`)
            this.resetLabel(label)
            this.sweepState.direction = CC
            recordSweepLimit(index)
            recordBarrierAngleExceeded()
            return terminateLoop
          }
        })

        if (!this.sweepState.hasHitMaxAngle[CW] && !this.sweepState.barrierAngleExceeded) { this.sweepState.placedAllLabels = true }
      } else { // Start CC Sweep
        labelLogger.info(`DOCR: sweep${this.sweepState.sweepCount} starting CC`)
        const frontierIndex = this.labels.indexOf(this.sweepState.frontierLabel)
        _(_.range(frontierIndex, -1, -1)).each(index => {
          const label = this.labels[index]

          if (infoLogs()) {
            labelLogger.info([
              `DOCR: sweep${this.sweepState.sweepCount}`,
              `CC: frontier ${label.shortText}.`,
              `labelLineAngle: ${label.labelLineAngle.toFixed(2)}`,
              `labelAngle: ${label.labelAngle.toFixed(2)}`,
            ].join(' '))
          }

          while (this.findAllCollisionsWithLesserLabels(label).length > 0 && !(label.labelLineAngle > labelMaxLineAngle)) {
            if (debugLogs()) {
              labelLogger.debug(`DOCR: sweep${this.sweepState.sweepCount} CC: moving ${label.shortText}`)
              const labelPositionSummary = label => [
                `label ${label.shortText}(${label.labelAngle.toFixed(2)})`,
                `x: ${label.minX.toFixed(2)}-${label.maxX.toFixed(2)}`,
                `y: ${label.minY.toFixed(2)}-${label.maxY.toFixed(2)}`,
              ].join(' ')
              labelLogger.debug(labelPositionSummary(label))
              labelLogger.debug('collides with')
              this.findAllCollisionsWithGreaterLabels(label).map(x => labelLogger.debug(labelPositionSummary(x)))
            }
            const newLineConnectorCoord = getLabelCoordAt(label.labelAngle - angleIncrement)
            this.moveLabel(label, newLineConnectorCoord, label.labelAngle - angleIncrement)
          }

          if (label.labelLineAngle > labelMaxLineAngle) {
            labelLogger.info(`DOCR: sweep${this.sweepState.sweepCount} CC: frontier ${label.shortText}. Max angle exceed. Reset Label and continue CC`)
            this.resetLabel(label)
            recordHitMaxAngle(CC)
          }

          if (index === 0) {
            this.sweepState.barrierAngle = label.labelAngle
          }
        })

        this.sweepState.direction = CW
      }
    }

    if (!this.sweepState.placedAllLabels) {
      const indexOfFrontier = this.labels.indexOf(this.sweepState.frontierLabel)
      this.labels = this.labels
        .filter((label, index) => index < indexOfFrontier)
      this.variant.minProportion = _(this.labels).map('fractionalValue').min()
    }
  }

  buildCollisionTree () {
    this.collisionTree = new RBush()
    this.collisionTree.load(this.labels)
  }

  findAllCollisions () {
    return this.labels
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
}

module.exports = DescendingOrderCollisionResolver
