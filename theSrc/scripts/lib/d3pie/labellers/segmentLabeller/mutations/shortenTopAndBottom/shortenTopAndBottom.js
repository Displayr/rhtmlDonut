import _ from 'lodash'
import * as rootLog from 'loglevel'
import RBush from 'rbush'
import { extractAndThrowIfNullFactory } from '../../mutationHelpers'
import { terminateLoop } from '../../../../../loopControls'
import { computeIntersection, rotate } from '../../../../math'
const labelLogger = rootLog.getLogger('label')

// TODO temp hack
const spacingBetweenUpperTrianglesAndCenterMeridian = 7

const VARIABLE_CONFIG = [
  'bottomIsLifted',
  'hasBottomLabel',
  'hasTopLabel',
  'labelMaxLineAngle',
  'maxFontSize',
  'topIsLifted',
]

const INVARIABLE_CONFIG = [
  'liftOffAngle',
  'outerPadding',
]

class ShortenTopAndBottom {
  constructor ({ labelSet, variant, invariant, canvas }) {
    this.extractConfig({ variant, invariant })
    this.canvas = canvas
    this.stats = {}
    this.inputLabelSet = labelSet
  }

  extractConfig ({ variant, invariant }) {
    const extractAndThrowIfNull = extractAndThrowIfNullFactory('ShortenTopAndBottom')
    this.variant = {}
    this.invariant = {}

    /* eslint-disable no-return-assign */
    VARIABLE_CONFIG.forEach(key => this.variant[key] = extractAndThrowIfNull(variant, key))
    INVARIABLE_CONFIG.forEach(key => this.invariant[key] = extractAndThrowIfNull(invariant, key))
    /* eslint-enable no-return-assign */
  }

  go () {
    this.shortenLiftedTopLabels()
    this.shortenTopLabel()
    this.shortenLiftedBottomLabels()
    this.shortenBottomLabel()

    return {
      outer: this.inputLabelSet,
      newVariants: {},
      stats: {},
    }
  }

  shortenLiftedTopLabels () {
    if (!this.variant.topIsLifted) {
      return
    }

    try {
      const { pieCenter, outerRadius, labelOffset } = this.canvas
      const { hasTopLabel, maxFontSize } = this.variant
      const { liftOffAngle, outerPadding } = this.invariant
      const outerRadiusYCoord = pieCenter.y - outerRadius
      const baseLabelOffsetYCoord = outerRadiusYCoord - labelOffset
      const labelMaxLineAngle = this.variant.labelMaxLineAngle

      const maxVerticalOffset = (hasTopLabel)
        ? this.canvas.maxVerticalOffset - maxFontSize - outerPadding
        : this.canvas.maxVerticalOffset
      const maxVerticalOffsetYValue = outerRadiusYCoord - maxVerticalOffset

      const pointAtZeroDegreesAlongLabelOffset = {
        x: pieCenter.x - outerRadius - labelOffset,
        y: pieCenter.y,
      }

      const leftPointWhereTriangleMeetsLabelRadius = rotate(pointAtZeroDegreesAlongLabelOffset, this.canvas.pieCenter, 90 - liftOffAngle)
      const rightPointWhereTriangleMeetsLabelRadius = rotate(pointAtZeroDegreesAlongLabelOffset, this.canvas.pieCenter, 90 + liftOffAngle)

      // TODO can I add this cloneDeep in the chain ?
      const setsSortedVerticallyOutward = {
        left: _.cloneDeep(_(this.inputLabelSet)
          .filter('isLifted')
          .filter('inLeftHalf')
          .filter(({ topY }) => topY <= leftPointWhereTriangleMeetsLabelRadius.y)
          .filter(({ isTopApexLabel }) => !isTopApexLabel)
          .sortBy([({ lineConnectorCoord }) => { return -1 * lineConnectorCoord.y }, ({ id }) => { return -1 * id }])
          .value()),
        right: _.cloneDeep(_(this.inputLabelSet)
          .filter('isLifted')
          .filter('inRightHalf')
          .filter(({ topY }) => topY <= rightPointWhereTriangleMeetsLabelRadius.y)
          .filter(({ isTopApexLabel }) => !isTopApexLabel)
          .sortBy([({ lineConnectorCoord }) => { return -1 * lineConnectorCoord.y }, ({ id }) => { return -1 * id }])
          .value()),
      }

      const setFacts = {
        left: {
          length: setsSortedVerticallyOutward.left.length,
          totalHeight: _(setsSortedVerticallyOutward.left).map('height').sum(),
          originalLineConnectorCoords: _(setsSortedVerticallyOutward.left).map('lineConnectorCoord').value(),
          nearestNeighborInwards: this.nearestNeighborBelow(setsSortedVerticallyOutward.left[0]),
        },
        right: {
          length: setsSortedVerticallyOutward.right.length,
          totalHeight: _(setsSortedVerticallyOutward.right).map('height').sum(),
          originalLineConnectorCoords: _(setsSortedVerticallyOutward.right).map('lineConnectorCoord').value(),
          nearestNeighborInwards: this.nearestNeighborBelow(setsSortedVerticallyOutward.right[0]),
        },
      }

      setFacts.left.idealStartingPoint = _([
        leftPointWhereTriangleMeetsLabelRadius.y,
        (setFacts.left.nearestNeighborInwards) ? setFacts.left.nearestNeighborInwards.topY : null,
      ])
        .filter(x => !_.isNull(x))
        .filter(x => !_.isUndefined(x))
        .min()

      setFacts.right.idealStartingPoint = _([
        rightPointWhereTriangleMeetsLabelRadius.y,
        (setFacts.right.nearestNeighborInwards) ? setFacts.right.nearestNeighborInwards.topY : null,
      ])
        .filter(x => !_.isNull(x))
        .filter(x => !_.isUndefined(x))
        .min()

      const idealouterPadding = 2

      // TODO setFacts.left.simpleWorked has not been set yet so it can be removed from conditionals below
      // unless this is called iteratively ?
      const newApexYCoord = _([
        (_.isEmpty(setsSortedVerticallyOutward.left)) ? null : setFacts.left.idealStartingPoint - setFacts.left.totalHeight - (setFacts.left.length) * idealouterPadding,
        (_.isEmpty(setsSortedVerticallyOutward.right)) ? null : setFacts.right.idealStartingPoint - setFacts.right.totalHeight - (setFacts.right.length) * idealouterPadding,
        baseLabelOffsetYCoord, // ensure a minimum amount of lift
      ])
        .filter(x => !_.isNull(x))
        .filter(x => !_.isUndefined(x))
        .min()

      if (newApexYCoord < maxVerticalOffsetYValue) {
        labelLogger.info(`not enough free vertical space to shorten. aborting shorten top`)
        return
      }

      if (setFacts.left.length === 0) {
        labelLogger.info(`shorten top: 0 left labels, skipping`)
      } else {
        // first try to just place them on the labelOffsetRadius, and only proceed to more complex steps below if collisions are detected or labels exceed maxLabelLineAngle
        const collisionDetected = this.placeLabelsAlongLabelRadiusAndReportCollisions({
          labelsToPlace: setsSortedVerticallyOutward.left,
          labelsToTestForCollision: this.inputLabelSet.filter(label => label.inLeftHalf),
        })

        let labelsExceedingMaxLineAngleCount = exceedsLabelLineAngleThresholdCount({
          labels: setsSortedVerticallyOutward.left, threshold: labelMaxLineAngle,
        })

        if (!collisionDetected && labelsExceedingMaxLineAngleCount === 0) {
          setFacts.left.simpleWorked = true
          labelLogger.info(`shorten top: placing left labels along label offset radius worked`)
        } else {
          labelLogger.info(`shorten top: placing left labels along label offset radius did not work. Proceeding with spacing along new lift triangle`)
          _(setsSortedVerticallyOutward.left).each((label, index) => {
            label.placeLabelViaConnectorCoord(setFacts.left.originalLineConnectorCoords[index])
          })
          setFacts.left.simpleWorked = false
        }

        // if simple didn't work proceed with more complicated solution
        if (!setFacts.left.simpleWorked) {
          const leftPlacementTriangleLine = [
            leftPointWhereTriangleMeetsLabelRadius,
            { x: this.canvas.pieCenter.x - spacingBetweenUpperTrianglesAndCenterMeridian, y: newApexYCoord },
          ]

          const availableVerticalSpace = setFacts.left.idealStartingPoint - newApexYCoord
          let newouterPadding = (availableVerticalSpace - setFacts.left.totalHeight) / setFacts.left.length
          let leftFrontierYCoord = setFacts.left.idealStartingPoint - newouterPadding
          _(setsSortedVerticallyOutward.left).each((label, index) => {
            const newLineConnectorY = leftFrontierYCoord - label.lineConnectorOffsetFromBottom
            const newLineConnectorLatitude = [
              { x: 0, y: newLineConnectorY },
              { x: parseFloat(this.canvas.width), y: newLineConnectorY },
            ]
            const intersection = computeIntersection(leftPlacementTriangleLine, newLineConnectorLatitude)
            if (intersection) {
              labelLogger.debug(`shorten top: left side: placing ${label.shortText} lineConnector at x:${intersection.x}, y: ${newLineConnectorY}`)
              label.placeLabelViaConnectorCoord({
                x: intersection.x,
                y: newLineConnectorY,
              })
              leftFrontierYCoord = label.topY - newouterPadding
            } else {
              labelLogger.error(`unexpected condition. could not compute intersection with new placementTriangleLine and newLineConnectorLatitude for ${label.shortText}`)
            }
          })
        }

        labelsExceedingMaxLineAngleCount = exceedsLabelLineAngleThresholdCount({
          labels: setsSortedVerticallyOutward.left, threshold: labelMaxLineAngle,
        })
        if (labelsExceedingMaxLineAngleCount > 0) {
          labelLogger.info(`shorten top: left side: labelLineAngle exceeded. Aborting`)
          return
        }

        // getting here means success ! Apply the cloned labels back to the mainline
        _(setsSortedVerticallyOutward.left).each(clonedLabel => {
          const index = _.findIndex(this.inputLabelSet, { id: clonedLabel.id })
          if (index !== -1) {
            this.inputLabelSet[index] = clonedLabel
          }
        })
      }

      if (setFacts.right.length === 0) {
        labelLogger.info(`shorten top: 0 right labels, skipping`)
      } else {
        // first try to just place them on the labelOffsetRadius, and only proceed to more complex steps below if collisions are detected or labels exceed maxLabelLineAngle
        const collisionDetected = this.placeLabelsAlongLabelRadiusAndReportCollisions({
          labelsToPlace: setsSortedVerticallyOutward.right,
          labelsToTestForCollision: this.inputLabelSet.filter(label => label.inRightHalf),
        })

        let labelsExceedingMaxLineAngleCount = exceedsLabelLineAngleThresholdCount({
          labels: setsSortedVerticallyOutward.right, threshold: labelMaxLineAngle,
        })
        if (!collisionDetected && labelsExceedingMaxLineAngleCount === 0) {
          setFacts.right.simpleWorked = true
          labelLogger.info(`shorten top: placing right labels along label offset radius worked`)
        } else {
          labelLogger.info(`shorten top: placing right labels along label offset radius did not work. Proceeding with spacing along new lift triangle`)
          _(setsSortedVerticallyOutward.right).each((label, index) => {
            label.placeLabelViaConnectorCoord(setFacts.right.originalLineConnectorCoords[index])
          })
          setFacts.right.simpleWorked = false
        }

        // if simple didn't work proceed with more complicated solution
        if (!setFacts.right.simpleWorked) {
          const rightPlacementTriangleLine = [
            rightPointWhereTriangleMeetsLabelRadius,
            { x: this.canvas.pieCenter.x + spacingBetweenUpperTrianglesAndCenterMeridian, y: newApexYCoord },
          ]

          const availableVerticalSpace = setFacts.right.idealStartingPoint - newApexYCoord
          let newOuterPadding = (availableVerticalSpace - setFacts.right.totalHeight) / setFacts.right.length
          let rightFrontierYCoord = setFacts.right.idealStartingPoint - newOuterPadding
          _(setsSortedVerticallyOutward.right).each((label, index) => {
            const newLineConnectorY = rightFrontierYCoord - label.lineConnectorOffsetFromBottom
            const newLineConnectorLatitude = [
              { x: 0, y: newLineConnectorY },
              { x: parseFloat(this.canvas.width), y: newLineConnectorY },
            ]
            const intersection = computeIntersection(rightPlacementTriangleLine, newLineConnectorLatitude)
            if (intersection) {
              labelLogger.debug(`shorten top: right side: placing ${label.shortText} lineConnector at x:${intersection.x}, y: ${newLineConnectorY}`)
              label.placeLabelViaConnectorCoord({
                x: intersection.x,
                y: newLineConnectorY,
              })
              rightFrontierYCoord = label.topY - newOuterPadding
            } else {
              labelLogger.error(`unexpected condition. could not compute intersection with new placementTriangleLine and newLineConnectorLatitude for ${label.shortText}`)
            }
          })
        }

        labelsExceedingMaxLineAngleCount = exceedsLabelLineAngleThresholdCount({
          labels: setsSortedVerticallyOutward.right, threshold: labelMaxLineAngle,
        })
        if (labelsExceedingMaxLineAngleCount > 0) {
          labelLogger.info(`shorten top: right side: labelLineAngle exceeded. Aborting`)
          return
        }

        // getting here means success ! Apply the cloned labels back to the mainline
        _(setsSortedVerticallyOutward.right).each(clonedLabel => {
          const index = _.findIndex(this.inputLabelSet, { id: clonedLabel.id })
          if (index !== -1) {
            this.inputLabelSet[index] = clonedLabel
          }
        })
      }
    } catch (error) {
      console.error(error)
    }
  }

  shortenTopLabel () {
    const topLabel = _(this.inputLabelSet).find('isTopApexLabel')
    if (topLabel) {
      const topLabelIndex = this.inputLabelSet.indexOf(topLabel)
      const nearestNeighbors = []
      if (topLabelIndex > 0) { nearestNeighbors.push(this.inputLabelSet[topLabelIndex - 1]) }
      if (topLabelIndex < this.inputLabelSet.length - 1) { nearestNeighbors.push(this.inputLabelSet[topLabelIndex + 1]) }
      const topYOfNearestLabel = _(nearestNeighbors).map('topLeftCoord.y').min()

      const newBottomYCoord = _.min([
        topYOfNearestLabel - parseFloat(this.invariant.outerPadding),
        this.canvas.pieCenter.y - this.canvas.outerRadius - this.canvas.labelOffset,
      ])

      if (newBottomYCoord > topLabel.bottomLeftCoord.y) {
        topLabel.placeLabelViaConnectorCoord({ x: topLabel.lineConnectorCoord.x, y: newBottomYCoord })
      }
    }
  }

  shortenLiftedBottomLabels () {
    if (!this.variant.bottomIsLifted) {
      return
    }

    try {
      const { pieCenter, outerRadius, labelOffset } = this.canvas
      const { hasBottomLabel, maxFontSize } = this.variant
      const { liftOffAngle, outerPadding } = this.invariant
      const outerRadiusYCoord = pieCenter.y + outerRadius
      const baseLabelOffsetYCoord = outerRadiusYCoord + labelOffset
      const labelMaxLineAngle = this.variant.labelMaxLineAngle

      const maxVerticalOffset = hasBottomLabel
        ? this.canvas.maxVerticalOffset - maxFontSize - outerPadding
        : this.canvas.maxVerticalOffset
      const maxVerticalOffsetYValue = outerRadiusYCoord + maxVerticalOffset

      const pointAtZeroDegreesAlongLabelOffset = {
        x: pieCenter.x - outerRadius - labelOffset,
        y: pieCenter.y,
      }

      const leftPointWhereTriangleMeetsLabelRadius = rotate(pointAtZeroDegreesAlongLabelOffset, this.canvas.pieCenter, 270 + liftOffAngle)
      const rightPointWhereTriangleMeetsLabelRadius = rotate(pointAtZeroDegreesAlongLabelOffset, this.canvas.pieCenter, 270 - liftOffAngle)

      // TODO can I add this cloneDeep in the chain ?
      const setsSortedVerticallyOutward = {
        left: _.cloneDeep(_(this.inputLabelSet)
          .filter('inLeftHalf')
          .filter('isLifted')
          .filter(({ bottomY }) => bottomY >= leftPointWhereTriangleMeetsLabelRadius.y)
          .filter(({ isBottomApexLabel }) => !isBottomApexLabel)
          .sortBy([({ lineConnectorCoord }) => { return lineConnectorCoord.y }, ({ id }) => { return -1 * id }])
          .value()),
        right: _.cloneDeep(_(this.inputLabelSet)
          .filter('inRightHalf')
          .filter('isLifted')
          .filter(({ bottomY }) => bottomY >= rightPointWhereTriangleMeetsLabelRadius.y)
          .filter(({ isBottomApexLabel }) => !isBottomApexLabel)
          .sortBy([({ lineConnectorCoord }) => { return lineConnectorCoord.y }, ({ id }) => { return -1 * id }])
          .value()),
      }

      const setFacts = {
        left: {
          length: setsSortedVerticallyOutward.left.length,
          totalHeight: _(setsSortedVerticallyOutward.left).map('height').sum(),
          originalLineConnectorCoords: _(setsSortedVerticallyOutward.left).map('lineConnectorCoord').value(),
          nearestNeighborInwards: this.nearestNeighborAbove(setsSortedVerticallyOutward.left[0]),
        },
        right: {
          length: setsSortedVerticallyOutward.right.length,
          originalLineConnectorCoords: _(setsSortedVerticallyOutward.right).map('lineConnectorCoord').value(),
          totalHeight: _(setsSortedVerticallyOutward.right).map('height').sum(),
          nearestNeighborInwards: this.nearestNeighborAbove(setsSortedVerticallyOutward.right[0]),
        },
      }

      setFacts.left.idealStartingPoint = _([
        leftPointWhereTriangleMeetsLabelRadius.y,
        (setFacts.left.nearestNeighborInwards) ? setFacts.left.nearestNeighborInwards.bottomY : null,
      ])
        .filter(x => !_.isNull(x))
        .filter(x => !_.isUndefined(x))
        .max()

      setFacts.right.idealStartingPoint = _([
        rightPointWhereTriangleMeetsLabelRadius.y,
        (setFacts.right.nearestNeighborInwards) ? setFacts.right.nearestNeighborInwards.bottomY : null,
      ])
        .filter(x => !_.isNull(x))
        .filter(x => !_.isUndefined(x))
        .max()

      const idealOuterPadding = 2

      const newApexYCoord = _([
        (_.isEmpty(setsSortedVerticallyOutward.left)) ? null : setFacts.left.idealStartingPoint + setFacts.left.totalHeight + (setFacts.left.length) * idealOuterPadding,
        (_.isEmpty(setsSortedVerticallyOutward.right)) ? null : setFacts.right.idealStartingPoint + setFacts.right.totalHeight + (setFacts.right.length) * idealOuterPadding,
        baseLabelOffsetYCoord, // ensure a minimum amount of lift
      ])
        .filter(x => !_.isNull(x))
        .filter(x => !_.isUndefined(x))
        .max()

      if (newApexYCoord > maxVerticalOffsetYValue) {
        labelLogger.info(`not enough free vertical space to shorten. aborting shorten bottom`)
        return
      }

      if (setFacts.left.length === 0) {
        labelLogger.info(`shorten bottom: 0 left labels, skipping`)
      } else {
        // first try to just place them on the labelOffsetRadius, and only proceed to more complex steps below if collisions are detected or labels exceed maxLabelLineAngle
        const collisionDetected = this.placeLabelsAlongLabelRadiusAndReportCollisions({
          labelsToPlace: setsSortedVerticallyOutward.left,
          labelsToTestForCollision: this.inputLabelSet.filter(label => label.inLeftHalf),
        })

        let labelsExceedingMaxLineAngleCount = exceedsLabelLineAngleThresholdCount({
          labels: setsSortedVerticallyOutward.left, threshold: labelMaxLineAngle,
        })
        if (!collisionDetected && labelsExceedingMaxLineAngleCount === 0) {
          setFacts.left.simpleWorked = true
          labelLogger.info(`shorten bottom: placing left labels along label offset radius worked`)
        } else {
          labelLogger.info(`shorten bottom: placing left labels along label offset radius did not work. Proceeding with spacing along new lift triangle`)
          _(setsSortedVerticallyOutward.left).each((label, index) => {
            label.placeLabelViaConnectorCoord(setFacts.left.originalLineConnectorCoords[index])
          })
          setFacts.left.simpleWorked = false
        }

        // if simple didn't work proceed with more complicated solution
        if (!setFacts.left.simpleWorked) {
          const leftPlacementTriangleLine = [
            leftPointWhereTriangleMeetsLabelRadius,
            { x: this.canvas.pieCenter.x - spacingBetweenUpperTrianglesAndCenterMeridian, y: newApexYCoord },
          ]

          const availableVerticalSpace = newApexYCoord - setFacts.left.idealStartingPoint
          let newouterPadding = (availableVerticalSpace - setFacts.left.totalHeight) / setFacts.left.length
          let leftFrontierYCoord = setFacts.left.idealStartingPoint + newouterPadding
          _(setsSortedVerticallyOutward.left).each((label, index) => {
            const newLineConnectorY = leftFrontierYCoord + label.lineConnectorOffsetFromTop
            const newLineConnectorLatitude = [
              { x: 0, y: newLineConnectorY },
              { x: parseFloat(this.canvas.width), y: newLineConnectorY },
            ]
            const intersection = computeIntersection(leftPlacementTriangleLine, newLineConnectorLatitude)
            if (intersection) {
              labelLogger.debug(`shorten bottom: left side: placing ${label.shortText} lineConnector at x:${intersection.x}, y: ${newLineConnectorY}`)
              label.placeLabelViaConnectorCoord({
                x: intersection.x,
                y: newLineConnectorY,
              })
              leftFrontierYCoord = label.bottomY + newouterPadding
            } else {
              labelLogger.error(`unexpected condition. could not compute intersection with new placementTriangleLine and newLineConnectorLatitude for ${label.shortText}`)
            }
          })
        }

        labelsExceedingMaxLineAngleCount = exceedsLabelLineAngleThresholdCount({
          labels: setsSortedVerticallyOutward.left, threshold: labelMaxLineAngle,
        })
        if (labelsExceedingMaxLineAngleCount > 0) {
          labelLogger.info(`shorten bottom: left side: labelLineAngle exceeded. Aborting`)
          return
        }

        // getting here means success ! Apply the cloned labels back to the mainline
        _(setsSortedVerticallyOutward.left).each(clonedLabel => {
          const index = _.findIndex(this.inputLabelSet, { id: clonedLabel.id })
          if (index !== -1) {
            this.inputLabelSet[index] = clonedLabel
          }
        })
      }

      if (setFacts.right.length === 0) {
        labelLogger.info(`shorten bottom: 0 right labels, skipping`)
      } else {
        // first try to just place them on the labelOffsetRadius, and only proceed to more complex steps below if collisions are detected or labels exceed maxLabelLineAngle
        const collisionDetected = this.placeLabelsAlongLabelRadiusAndReportCollisions({
          labelsToPlace: setsSortedVerticallyOutward.right,
          labelsToTestForCollision: this.inputLabelSet.filter(label => label.inRightHalf),
        })

        let labelsExceedingMaxLineAngleCount = exceedsLabelLineAngleThresholdCount({
          labels: setsSortedVerticallyOutward.right, threshold: labelMaxLineAngle,
        })
        if (!collisionDetected && labelsExceedingMaxLineAngleCount === 0) {
          setFacts.right.simpleWorked = true
          labelLogger.info(`shorten bottom: placing right labels along label offset radius worked`)
        } else {
          labelLogger.info(`shorten bottom: placing right labels along label offset radius did not work. Proceeding with spacing along new lift triangle`)
          _(setsSortedVerticallyOutward.right).each((label, index) => {
            label.placeLabelViaConnectorCoord(setFacts.right.originalLineConnectorCoords[index])
          })
          setFacts.right.simpleWorked = false
        }

        // if simple didn't work proceed with more complicated solution
        if (!setFacts.right.simpleWorked) {
          const rightPlacementTriangleLine = [
            rightPointWhereTriangleMeetsLabelRadius,
            { x: this.canvas.pieCenter.x + spacingBetweenUpperTrianglesAndCenterMeridian, y: newApexYCoord },
          ]

          const availableVerticalSpace = newApexYCoord - setFacts.right.idealStartingPoint
          let newouterPadding = (availableVerticalSpace - setFacts.right.totalHeight) / setFacts.right.length
          let rightFrontierYCoord = setFacts.right.idealStartingPoint + newouterPadding
          _(setsSortedVerticallyOutward.right).each((label, index) => {
            const newLineConnectorY = rightFrontierYCoord + label.lineConnectorOffsetFromTop
            const newLineConnectorLatitude = [
              { x: 0, y: newLineConnectorY },
              { x: parseFloat(this.canvas.width), y: newLineConnectorY },
            ]
            const intersection = computeIntersection(rightPlacementTriangleLine, newLineConnectorLatitude)
            if (intersection) {
              labelLogger.debug(`shorten bottom: right side: placing ${label.shortText} lineConnector at x:${intersection.x}, y: ${newLineConnectorY}`)
              label.placeLabelViaConnectorCoord({
                x: intersection.x,
                y: newLineConnectorY,
              })
              rightFrontierYCoord = label.bottomY + newouterPadding
            } else {
              labelLogger.error(`unexpected condition. could not compute intersection with new placementTriangleLine and newLineConnectorLatitude for ${label.shortText}`)
            }
          })
        }

        labelsExceedingMaxLineAngleCount = exceedsLabelLineAngleThresholdCount({
          labels: setsSortedVerticallyOutward.right, threshold: labelMaxLineAngle,
        })
        if (labelsExceedingMaxLineAngleCount > 0) {
          labelLogger.info(`shorten bottom: right side: labelLineAngle exceeded. Aborting`)
          return
        }

        // getting here means success ! Apply the cloned labels back to the mainline
        _(setsSortedVerticallyOutward.right).each(clonedLabel => {
          const index = _.findIndex(this.inputLabelSet, { id: clonedLabel.id })
          if (index !== -1) {
            this.inputLabelSet[index] = clonedLabel
          }
        })
      }
    } catch (error) {
      console.error(error.stack)
    }
  }

  shortenBottomLabel () {
    const bottomLabel = _(this.inputLabelSet).find('isBottomApexLabel')
    if (bottomLabel) {
      const bottomLabelIndex = this.inputLabelSet.indexOf(bottomLabel)
      const nearestNeighbors = []
      if (bottomLabelIndex > 0) { nearestNeighbors.push(this.inputLabelSet[bottomLabelIndex - 1]) }
      if (bottomLabelIndex < this.inputLabelSet.length - 1) { nearestNeighbors.push(this.inputLabelSet[bottomLabelIndex + 1]) }
      const bottomYOfNearestLabel = _(nearestNeighbors).map('bottomLeftCoord.y').max()

      const newTopYCoord = _.max([
        bottomYOfNearestLabel + parseFloat(this.invariant.outerPadding),
        this.canvas.pieCenter.y + this.canvas.outerRadius + this.canvas.labelOffset,
      ])

      if (newTopYCoord < bottomLabel.topLeftCoord.y) {
        bottomLabel.placeLabelViaConnectorCoord({ x: bottomLabel.lineConnectorCoord.x, y: newTopYCoord })
      }
    }
  }

  nearestNeighborAbove (label) {
    try {
      if (!label) { return null }
      if (label.isTopApexLabel) { return null }

      const labelIndex = _.findIndex(this.inputLabelSet, { id: label.id })
      if (labelIndex === -1) { return null }

      let labelAbove = null
      if (label.inTopLeftQuadrant) {
        labelAbove = this.inputLabelSet[labelIndex + 1]
      } else if (label.inTopRightQuadrant) {
        labelAbove = this.inputLabelSet[labelIndex - 1]
      } else if (label.inBottomLeftQuadrant) {
        if (labelIndex === this.inputLabelSet.length - 1) {
          labelAbove = _.first(this.inputLabelSet)
        } else {
          labelAbove = this.inputLabelSet[labelIndex + 1]
        }
      } else if (label.inBottomRightQuadrant) {
        labelAbove = this.inputLabelSet[labelIndex - 1]
      }

      // sanity check
      if (labelAbove.topLeftCoord.y < label.topLeftCoord.y) {
        return labelAbove
      } else {
        console.error(`nearestNeighborAbove yields incorrect results for label`, label)
        return null
      }
    } catch (e) {
      console.error(`nearestNeighborAbove failed on `, e)
      return null
    }
  }

  nearestNeighborBelow (label) {
    try {
      if (!label) { return null }
      if (label.isBottomApexLabel) { return null }

      const labelIndex = _.findIndex(this.inputLabelSet, { id: label.id })
      if (labelIndex === -1) { return null }

      let labelBelow = null
      if (label.inTopLeftQuadrant) {
        if (labelIndex === 0) {
          labelBelow = _.last(this.inputLabelSet)
        } else {
          labelBelow = this.inputLabelSet[labelIndex - 1]
        }
      } else if (label.inTopRightQuadrant) {
        labelBelow = this.inputLabelSet[labelIndex + 1]
      } else if (label.inBottomLeftQuadrant) {
        labelBelow = this.inputLabelSet[labelIndex - 1]
      } else if (label.inBottomRightQuadrant) {
        labelBelow = this.inputLabelSet[labelIndex + 1]
      }

      // sanity check
      if (labelBelow.topLeftCoord.y > label.topLeftCoord.y) {
        return labelBelow
      } else {
        console.error(`nearestNeighborBelow yields incorrect results for label`, label)
        return null
      }
    } catch (e) {
      console.error(`nearestNeighborBelow failed on `, e)
      return null
    }
  }

  placeLabelsAlongLabelRadiusAndReportCollisions ({ labelsToPlace, labelsToTestForCollision }) {
    const collisionTree = new RBush()
    collisionTree.load(labelsToTestForCollision)
    let collisionDetected = false
    _(labelsToPlace).each(label => {
      const oldPosition = {
        id: label.id,
        minY: label.minY,
        maxY: label.maxY,
        minX: label.minX,
        maxX: label.maxX,
      }

      this.canvas.placeLabelAlongLabelRadiusWithLiftOffAngle({
        label,
        hasTopLabel: this.variant.hasTopLabel,
        hasBottomLabel: this.variant.hasBottomLabel,
        labelLiftOffAngle: 0, // TODO : doing this is confusing. Make two fns !!
      })

      const newPosition = {
        minY: label.minY,
        maxY: label.maxY,
        minX: label.minX,
        maxX: label.maxX,
      }
      const collisions = collisionTree.search(newPosition)
        .filter(intersectingLabel => intersectingLabel.id !== label.id)
      if (collisions.length > 0) {
        collisionDetected = true
        return terminateLoop
      } else {
        // NB this looks wierd. see issue here : https://github.com/mourner/rbush/pull/101
        collisionTree.remove(oldPosition)
        collisionTree.insert(newPosition)
      }
    })
    return collisionDetected
  }
}

const exceedsLabelLineAngleThresholdCount = ({ labels, threshold }) =>
  labels
    .filter(({ labelLineAngle }) => labelLineAngle > threshold)
    .length

module.exports = ShortenTopAndBottom
