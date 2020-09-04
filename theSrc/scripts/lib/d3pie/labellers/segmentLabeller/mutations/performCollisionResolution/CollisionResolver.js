import _ from 'lodash'
import * as rootLog from 'loglevel'

import { extractAndThrowIfNullFactory } from '../../mutationHelpers'
import { between, rotate } from '../../../../math'
import { findLabelsIntersecting, ptInArc } from '../../../labelUtils'
import { continueLoop, terminateLoop } from '../../../../../loopControls'
import LabelPushedOffCanvas from '../../../../interrupts/labelPushedOffCanvas'
import AngleThresholdExceeded from '../../../../interrupts/angleThresholdExceeded'
import LabelCollision from '../../../../interrupts/labelCollision'
import InnerLabel from '../../innerLabel'
import CannotMoveToInner from '../../../../interrupts/cannotMoveToInner'
const labelLogger = rootLog.getLogger('label')

// TODO temp hack
const spacingBetweenUpperTrianglesAndCenterMeridian = 7

const VARIABLE_CONFIG = [
  'actualMaxFontSize',
  'bottomIsLifted',
  'hasBottomLabel',
  'hasTopLabel',
  'labelMaxLineAngle',
  'minProportion',
  'topIsLifted',
]

// TODO sort out local invariant : canUseInnerLabelsInTheseQuadrants
const INVARIABLE_CONFIG = [
  'liftOffAngle',
  'outerPadding',
  'sortOrder',
  'useInnerLabels',
]

class CollisionResolver {
  constructor ({ labelSet, variant, invariant, canvas }) {
    this.extractConfig({ variant, invariant })
    this.canvas = canvas
    this.stats = {}
    this.inputLabelSet = labelSet

    // use to determine what order should we hide labels as necessary
    this.removalOrder = _(labelSet)
      .orderBy(['value', 'id'], ['acs', 'desc'])
      .map('id')
      .value()
  }

  extractConfig ({ variant, invariant }) {
    const extractAndThrowIfNull = extractAndThrowIfNullFactory('CollisionResolver')
    this.variant = {}
    this.invariant = {}

    /* eslint-disable no-return-assign */
    VARIABLE_CONFIG.forEach(key => this.variant[key] = extractAndThrowIfNull(variant, key))
    INVARIABLE_CONFIG.forEach(key => this.invariant[key] = extractAndThrowIfNull(invariant, key))
    /* eslint-enable no-return-assign */

    this.invariant.canUseInnerLabelsInTheseQuadrants = (this.invariant.useInnerLabels)
      ? [1, 2, 3]
      : []
  }

  go () {
    return this.iterate({ iterationCount: 0 })
  }

  iterate ({ iterationCount }) {
    try {
      let { outer, inner } = this.step({ iterationCount })
      if (outer.length > 0 || inner.length > 0) {
        return {
          inner,
          outer,
          newVariants: this.variant,
          stats: this.stats,
        }
      } else {
        labelLogger.error(`collision resolution failed: it tried to removed all labels!`)
        return null
      }
    } catch (error) {
      if (error.isInterrupt) {
        const offendingLabel = error.labelDatum
        labelLogger.warn(`collision iteration failed: label '${offendingLabel.label}' triggered ${error.type}: ${error.description}`)

        /* four strategies :
         * lift top/bottom if not lifted. If both already lifted,
         * then start dropping the labels for the smallest segment
         * then increase maxLabelLineAngle threshold
           * not currently used, is enabled when maxLineAngleValue != maxLineAngleMaxValue via config
        */

        const availableStrategies = {
          liftTop: offendingLabel.inTopHalf && !this.variant.topIsLifted,
          liftBottom: offendingLabel.inBottomHalf && !this.variant.bottomIsLifted,
          removeLabel: this.removalOrder.length > 0,
        }

        if (availableStrategies.liftTop) {
          labelLogger.info('lifting top labels before next iteration')
          // note this is the 'master labelSet', not the clone passed to each iteration
          this.variant.topIsLifted = true
          _(this.inputLabelSet)
            .filter(({ segmentAngleMidpoint }) => between(90 - this.invariant.liftOffAngle, segmentAngleMidpoint, 90 + this.invariant.liftOffAngle))
            .each(label => {
              this.canvas.placeLabelAlongLabelRadiusWithLiftOffAngle({
                label,
                hasTopLabel: this.variant.hasTopLabel,
                hasBottomLabel: this.variant.hasBottomLabel,
                labelLiftOffAngle: this.invariant.liftOffAngle,
              })
          })
        } else if (availableStrategies.liftBottom) {
          labelLogger.info('lifting bottom labels before next iteration')
          // note this is the 'master labelSet', not the clone passed to each iteration
          this.variant.bottomIsLifted = true
          _(this.inputLabelSet)
            .filter(({ segmentAngleMidpoint }) => between(270 - this.invariant.liftOffAngle, segmentAngleMidpoint, 270 + this.invariant.liftOffAngle))
            .each(label => {
                this.canvas.placeLabelAlongLabelRadiusWithLiftOffAngle({
                  label,
                  hasTopLabel: this.variant.hasTopLabel,
                  hasBottomLabel: this.variant.hasBottomLabel,
                  labelLiftOffAngle: this.invariant.liftOffAngle,
                })
            })
        } else if (availableStrategies.removeLabel) {
          if (this.invariant.sortOrder === 'initial') {
            // sort by value, then as a tiebreak choose the label closest to the current offending label
            // removing a label closer to the offending label is more likely to solve the current labelling issue
            let idToRemove = _(this.inputLabelSet)
              .sortBy('value', ({ id }) => Math.abs(offendingLabel.id - id))
              .map('id')
              .first()

            this.removalOrder = this.removalOrder
              .filter(label => (label.id !== idToRemove))

            this.inputLabelSet = _(this.inputLabelSet)
              .filter(label => {
                if (label.id === idToRemove) { labelLogger.debug(`removing ${label.shortText} ${label.segmentQuadrant}`) }
                return (label.id !== idToRemove)
              })
              .value()
          } else {
            const idToRemove = this.removalOrder.shift()
            this.inputLabelSet = _(this.inputLabelSet)
              .filter(label => {
                if (label.id === idToRemove) { labelLogger.debug(`removing ${label.shortText} ${label.segmentQuadrant}`) }
                return (label.id !== idToRemove)
              })
              .value()
          }
        } else {
          // TODO DOES THIS MAKE SENSE STILL
          // labelLogger.error(`collision resolution failed: hit breakOutValue: ${breakOutAngleThreshold} and maxLineAngleMaxValue: ${maxLineAngleMaxValue}`)
        }

        return this.iterate({
          iterationCount: iterationCount + 1,
        })
      } else {
        labelLogger.error(`collision resolution failed: unexpected error: ${error}`)
        labelLogger.error(error)
      }
    }
  }

  step ({ iterationCount }) {
    labelLogger.info(`collision iteration started. iterationCount=${iterationCount} labelCount=${this.inputLabelSet.length}`)
    const outerLabelSet = _.cloneDeep(this.inputLabelSet)
    const innerLabelSet = []

    // NB could backfire : adding apex labels to both sets ...
    const leftOuterLabelsSortedTopToBottom = _(outerLabelSet)
      .filter(label => label.inLeftHalf || label.isTopApexLabel || label.isBottomApexLabel)
      .sortBy(['lineConnectorCoord.y', ({ id }) => { return -1 * id }])
      .value()

    const rightOuterLabelsSortedTopToBottom = _(outerLabelSet)
      .filter(label => label.inRightHalf || label.isTopApexLabel || label.isBottomApexLabel)
      .sortBy(['lineConnectorCoord.y', ({ id }) => { return -1 * id }])
      .value()

    // TODO add stage check for pie.options.labels.stages.initialClusterSpacing
    // NB at some point we should do both innerLabelling and performInitialClusterSpacing. However,
    // at present they dont work well together as the initialSpacing makes inner labels unecessary, even though the user may have preferred        the innerLabels to the spacing.
    if (!this.invariant.useInnerLabels) {
      this.performInitialClusterSpacing({
        outerLabelSetSortedTopToBottom: leftOuterLabelsSortedTopToBottom,
        hemisphere: 'left',
      })

      this.performInitialClusterSpacing({
        outerLabelSetSortedTopToBottom: rightOuterLabelsSortedTopToBottom,
        hemisphere: 'right',
      })
    }

    this.performTwoPhaseLabelAdjustment({
      stages: { upSweep: true, downSweep: true, finalPass: true },
      outerLabelSet: leftOuterLabelsSortedTopToBottom,
      innerLabelSet,
      hemisphere: 'left',
    })

    this.performTwoPhaseLabelAdjustment({
      stages: { upSweep: true, downSweep: true, finalPass: true },
      outerLabelSet: rightOuterLabelsSortedTopToBottom,
      innerLabelSet,
      hemisphere: 'right',
    })

    // the labelShown attribute is only used when we move a label to the inner, and it is odd
    return {
      outer: outerLabelSet.filter(label => label.labelShown),
      inner: innerLabelSet,
    }
  }

  performInitialClusterSpacing ({
    outerLabelSetSortedTopToBottom,
  }) {
    const { pieCenter, outerRadius, maxVerticalOffset } = this.canvas
    const { bottomIsLifted, hasTopLabel, hasBottomLabel, actualMaxFontSize: maxFontSize, topIsLifted } = this.variant
    const { outerPadding } = this.invariant

    const upperBoundary = pieCenter.y - outerRadius - maxVerticalOffset + ((hasTopLabel) ? maxFontSize : 0)
    const lowerBoundary = pieCenter.y + outerRadius + maxVerticalOffset - ((hasBottomLabel) ? maxFontSize : 0)

    const getLabelAbove = (label) => {
      const indexOf = outerLabelSetSortedTopToBottom.indexOf(label)
      return (indexOf !== -1 && indexOf !== 0)
        ? outerLabelSetSortedTopToBottom[indexOf - 1]
        : null
    }

    const getLabelBelow = (label) => {
      const indexOf = outerLabelSetSortedTopToBottom.indexOf(label)
      return (indexOf !== -1 && indexOf !== outerLabelSetSortedTopToBottom.length - 1)
        ? outerLabelSetSortedTopToBottom[indexOf + 1]
        : null
    }

    const pushLabelsUp = (labelsToPushUp) => {
      _(labelsToPushUp).each(labelToPushUp => {
        const labelBelow = getLabelBelow(labelToPushUp)
        if (labelBelow) {
          const newY = labelBelow.topLeftCoord.y - outerPadding
          if (newY - labelToPushUp.height < upperBoundary) {
            console.warn(`cancelling pushLabelsUp in performInitialClusterSpacing : exceeded upperBoundary`)
            return terminateLoop
          }

          const oldY = labelToPushUp.bottomLeftCoord.y
          this.canvas.adjustLabelToNewY({
            anchor: 'bottom',
            newY,
            label: labelToPushUp,
            topIsLifted: this.variant.topIsLifted,
            bottomIsLifted: this.variant.bottomIsLifted,
          })

          const angleBetweenRadialAndLabelLinesAfter = labelToPushUp.labelLineAngle
          if (angleBetweenRadialAndLabelLinesAfter > this.variant.labelMaxLineAngle) {
            labelLogger.info(`cancelling pushLabelsUp in performInitialClusterSpacing : exceeded max angle threshold. OldY: ${oldY}`)
            this.canvas.adjustLabelToNewY({
              anchor: 'bottom',
              newY: oldY,
              label: labelToPushUp,
              topIsLifted: this.variant.topIsLifted,
              bottomIsLifted: this.variant.bottomIsLifted,
            })
            return terminateLoop
          }
        } else {
          console.warn(`tried to push label '${labelToPushUp.shortText}' up, but there was no label below`)
        }
        return continueLoop
      })
    }

    const pushLabelsDown = (labelsToPushDown) => {
      _(labelsToPushDown).each(labelToPushDown => {
        const labelAbove = getLabelAbove(labelToPushDown)

        if (labelAbove) {
          const newY = labelAbove.bottomLeftCoord.y + outerPadding
          if (newY + labelToPushDown.height > lowerBoundary) {
            console.warn(`cancelling pushLabelsDown in performInitialClusterSpacing : exceeded lowerBoundary`)
            return terminateLoop
          }

          const oldY = labelToPushDown.topLeftCoord.y
          this.canvas.adjustLabelToNewY({
            anchor: 'top',
            newY,
            label: labelToPushDown,
            topIsLifted,
            bottomIsLifted,
          })

          const angleBetweenRadialAndLabelLinesAfter = labelToPushDown.labelLineAngle
          if (angleBetweenRadialAndLabelLinesAfter > this.variant.labelMaxLineAngle) {
            labelLogger.debug(`cancelling pushLabelsDown in performInitialClusterSpacing : exceeded max angle threshold`)
            this.canvas.adjustLabelToNewY({
              anchor: 'top',
              newY: oldY,
              label: labelToPushDown,
              topIsLifted,
              bottomIsLifted,
            })
            return terminateLoop
          }
        } else {
          console.warn(`tried to push label '${labelToPushDown.shortText}' down, but there was no label above`)
        }
        return continueLoop
      })
    }

    // TODO not sure this 'group collisions into sets' works anymore ...
    const collidingLabels = findLabelsIntersecting(outerLabelSetSortedTopToBottom)
    const collidingLabelSets = []
    let activeSet = []
    _(collidingLabels)
      .sortBy('id')
      .each(collidingLabel => {
        if (activeSet.length === 0) { activeSet.push(collidingLabel); return continueLoop }
        if (Math.abs(collidingLabel.id - activeSet[activeSet.length - 1].id) <= 1) {
          activeSet.push(collidingLabel)
        } else {
          collidingLabelSets.push(activeSet)
          activeSet = [collidingLabel]
        }
      })

    if (activeSet.length) {
      collidingLabelSets.push(activeSet)
    }

    _(collidingLabelSets).each(collidingLabelSet => {
      let verticalSpaceAbove = 0
      const nearestNonIntersectingLabelAbove = getLabelAbove(_.first(collidingLabelSet))
      if (nearestNonIntersectingLabelAbove) {
        verticalSpaceAbove = collidingLabelSet[0].topLeftCoord.y - nearestNonIntersectingLabelAbove.bottomLeftCoord.y
      }

      let verticalSpaceBelow = 0
      const nearestNonIntersectingLabelBelow = getLabelBelow(_.last(collidingLabelSet))
      if (nearestNonIntersectingLabelBelow) {
        verticalSpaceBelow = nearestNonIntersectingLabelBelow.topLeftCoord.y - collidingLabelSet[collidingLabelSet.length - 1].bottomLeftCoord.y
      }

      labelLogger.debug(`collidingLabelSet: ${collidingLabelSet.map(label => label.label).join(', ')}`)
      labelLogger.debug(`verticalSpaceAbove: ${verticalSpaceAbove} : verticalSpaceBelow: ${verticalSpaceBelow}`)

      let differenceInVerticalSpace = Math.abs(verticalSpaceBelow - verticalSpaceAbove)
      let sumOfVerticalSpace = verticalSpaceBelow + verticalSpaceAbove
      if (sumOfVerticalSpace > 10 && differenceInVerticalSpace > 10 && verticalSpaceAbove > verticalSpaceBelow) {
        labelLogger.debug(`pushing whole set up`)
        pushLabelsUp(_.reverse(collidingLabelSet))
      } else if (sumOfVerticalSpace > 10 && differenceInVerticalSpace > 10 && verticalSpaceBelow > verticalSpaceAbove) {
        labelLogger.debug(`pushing whole set down`)
        pushLabelsDown(collidingLabelSet)
      } else if (sumOfVerticalSpace > 10) {
        labelLogger.debug(`pushing 1/2 up and 1/2 down`)
        const [labelsToPushUp, labelsToPushDown] = _.chunk(collidingLabelSet, Math.ceil(collidingLabelSet.length / 2))
        pushLabelsUp(_.reverse(labelsToPushUp))
        pushLabelsDown(labelsToPushDown)
      } else {
        labelLogger.debug(`no room to space cluster. Skipping`)
      }
    })
  }

  performTwoPhaseLabelAdjustment ({
    stages,
    outerLabelSet,
    innerLabelSet,
    hemisphere,
  }) {
    /*
     Phase 1: push labels down
     For each label moving vertically down the hemisphere
       if it intersects with next neighbor
         then adjust all labels below so they dont intersect.
         During the adjustment if we hit the bottom of the canvas while adjusting, then completely terminate phase 1 and move to phase 2

     Phase 2: push labels up
        if phase 1 was cancelled, then start at the bottom and push labels up
          this should never run out of space because the font sizes of the labels have already been balanced so sum(fontheight) < canvasHeight

     Notes:
       * As soon as we have moved _a single label_ we must reposition the X coord of all labels
       * If at any point a label that has been adjusted has an between the radialLine and the labelLine that exceeds labelMaxLineAngle,
         then throw an interrupt and exit the function
    */

    const { pieCenter, outerRadius, maxVerticalOffset } = this.canvas
    const { hasTopLabel, hasBottomLabel, topIsLifted, bottomIsLifted, actualMaxFontSize: maxFontSize, labelMaxLineAngle } = this.variant
    const { canUseInnerLabelsInTheseQuadrants, outerPadding } = this.invariant

    // NB fundamental for understanding : _.each iterations are cancelled if the fn returns false
    let downSweepHitBottom = false
    let downSweepLineAngleExceeded = false

    let lp = `${hemisphere}:DOWN` // lp = logPrefix
    const inBounds = (candidateIndex, arrayLength = outerLabelSet.length) => candidateIndex >= 0 && candidateIndex < arrayLength
    const isLast = (candidateIndex, arrayLength = outerLabelSet.length) => candidateIndex === arrayLength - 1

    const getPreviousShownLabel = (labelSet, startingIndex) => {
      while (startingIndex - 1 >= 0) {
        if (labelSet[startingIndex - 1].labelShown) { return labelSet[startingIndex - 1] }
        startingIndex--
      }
      return null
    }

    const upperBoundary = pieCenter.y - outerRadius - maxVerticalOffset + ((hasTopLabel) ? maxFontSize : 0)
    const lowerBoundary = pieCenter.y + outerRadius + maxVerticalOffset - ((hasBottomLabel) ? maxFontSize : 0)

    if (stages.downSweep) {
      labelLogger.debug(`${lp} start. Size ${outerLabelSet.length}`)
      _(outerLabelSet).each((frontierLabel, frontierIndex) => {
        labelLogger.debug(`${lp} frontier: ${frontierLabel.shortText}`)
        if (downSweepHitBottom) { labelLogger.debug(`${lp} cancelled`); return terminateLoop }
        if (downSweepLineAngleExceeded) { labelLogger.debug(`${lp} cancelled`); return terminateLoop }
        if (isLast(frontierIndex)) { return terminateLoop }
        if (frontierLabel.hide) { return continueLoop }

        const nextLabel = outerLabelSet[frontierIndex + 1]
        if (nextLabel.hide) { return continueLoop }

        if (frontierLabel.intersectsWith(nextLabel) || nextLabel.isCompletelyAbove(frontierLabel)) {
          labelLogger.debug(` ${lp} intersect ${frontierLabel.shortText} v ${nextLabel.shortText}`)
          _(_.range(frontierIndex + 1, outerLabelSet.length)).each((gettingPushedIndex) => {
            const alreadyAdjustedLabel = getPreviousShownLabel(outerLabelSet, gettingPushedIndex)
            if (!alreadyAdjustedLabel) { return continueLoop }

            const immediatePreviousNeighbor = outerLabelSet[gettingPushedIndex - 1]
            const immediatePreviousNeighborIsInInside = !immediatePreviousNeighbor.labelShown

            const gettingPushedLabel = outerLabelSet[gettingPushedIndex]
            if (gettingPushedLabel.hide) { return continueLoop }

            if (gettingPushedLabel.isBottomApexLabel) {
              labelLogger.debug(`  ${lp} attempt to push ${gettingPushedLabel.shortText} bottom label. cancelling inner`)
              downSweepHitBottom = true
              return continueLoop
            }

            if (downSweepHitBottom) {
              labelLogger.debug(`  ${lp} already hit bottom, placing ${gettingPushedLabel.shortText} at bottom`)
              // we need to place the remaining labels at the bottom so phase 2 will place them as we sweep "up" the hemisphere
              if (gettingPushedLabel.inLeftHalf) {
                gettingPushedLabel.setBottomMedialPoint({ x: pieCenter.x - spacingBetweenUpperTrianglesAndCenterMeridian, y: lowerBoundary })
              } else {
                gettingPushedLabel.setBottomMedialPoint({ x: pieCenter.x + spacingBetweenUpperTrianglesAndCenterMeridian, y: lowerBoundary })
              }
              return continueLoop
            }

            if (gettingPushedLabel.isLowerThan(alreadyAdjustedLabel) && !gettingPushedLabel.intersectsWith(alreadyAdjustedLabel)) {
              labelLogger.debug(`   ${lp} ${alreadyAdjustedLabel.shortText} and ${gettingPushedLabel.shortText} no intersect. cancelling inner`)
              return terminateLoop
            }

            if (canUseInnerLabelsInTheseQuadrants.includes(gettingPushedLabel.segmentQuadrant) && !immediatePreviousNeighborIsInInside) {
              try {
                this.moveToInnerLabel({
                  label: gettingPushedLabel,
                  innerLabelSet,
                })
                return continueLoop
              } catch (error) {
                if (error.isInterrupt && error.type === 'CannotMoveToInner') {
                  labelLogger.debug(`${lp} could not move ${gettingPushedLabel.shortText} to inner: "${error.description}". Proceed with adjustment`)
                } else {
                  throw error
                }
              }
            }

            const newY = alreadyAdjustedLabel.topLeftCoord.y + alreadyAdjustedLabel.height + outerPadding
            const deltaY = newY - gettingPushedLabel.topLeftCoord.y
            if (newY + gettingPushedLabel.height > lowerBoundary) {
              labelLogger.debug(`  ${lp} pushing ${gettingPushedLabel.shortText} exceeds canvas. placing remaining labels at bottom and cancelling inner`)
              downSweepHitBottom = true

              if (gettingPushedLabel.inLeftHalf) {
                gettingPushedLabel.setBottomMedialPoint({ x: pieCenter.x - spacingBetweenUpperTrianglesAndCenterMeridian, y: lowerBoundary })
              } else {
                gettingPushedLabel.setBottomMedialPoint({ x: pieCenter.x + spacingBetweenUpperTrianglesAndCenterMeridian, y: lowerBoundary })
              }
              return continueLoop
            }

            const angleBetweenRadialAndLabelLinesBefore = gettingPushedLabel.labelLineAngle.toFixed(2)
            this.canvas.adjustLabelToNewY({
              anchor: 'top',
              newY,
              label: gettingPushedLabel,
              topIsLifted,
              bottomIsLifted,
            })
            const angleBetweenRadialAndLabelLinesAfter = gettingPushedLabel.labelLineAngle.toFixed(2)

            labelLogger.debug(`  ${lp} pushing ${gettingPushedLabel.shortText} down by ${deltaY}. Angle before ${angleBetweenRadialAndLabelLinesBefore} and after ${angleBetweenRadialAndLabelLinesAfter}`)

            if (angleBetweenRadialAndLabelLinesAfter > labelMaxLineAngle) {
              labelLogger.warn(`  ${lp} ${gettingPushedLabel.shortText} line angle exceeds threshold of ${labelMaxLineAngle}. Cancelling downSweep.`)
              downSweepLineAngleExceeded = true
              return terminateLoop
            }

            if (!inBounds(gettingPushedIndex + 1)) { return terminateLoop } // terminate
          })
        }
      })
    }

    if (stages.upSweep && (downSweepHitBottom || downSweepLineAngleExceeded)) {
      // throw away our attempt at inner labelling and start again wrt inner labels!
      // XXX NB TODO strictly speaking we can only throw out our quadrant/hemisphere worth of inner labels
      _(innerLabelSet).each(innerLabel => {
        const matchingOuterLabel = _.find(outerLabelSet, ({ id: outerLabelId }) => outerLabelId === innerLabel.id)
        if (matchingOuterLabel) {
          matchingOuterLabel.labelShown = true
          if (matchingOuterLabel.inLeftHalf) {
            matchingOuterLabel.setBottomMedialPoint({ x: pieCenter.x - spacingBetweenUpperTrianglesAndCenterMeridian, y: lowerBoundary })
          } else {
            matchingOuterLabel.setBottomMedialPoint({ x: pieCenter.x + spacingBetweenUpperTrianglesAndCenterMeridian, y: lowerBoundary })
          }
        } else {
          console.error(`should have found matching outer label for inner label ${innerLabel.shortText}`)
        }
      })
      innerLabelSet.length = 0 // NB must preserve array references !

      // use the original sorted by Y list; when we hit bottom mid algorithm we just placed all the other labels at the bottom, so we can no longer use the label positions for ordering
      const reversedLabelSet = _.reverse(outerLabelSet)
      let lp = `${hemisphere}:UP` // lp = logPrefix
      let phase2HitTop = false

      labelLogger.debug(`${lp} start. Size ${reversedLabelSet.length}`)
      _(reversedLabelSet).each((frontierLabel, frontierIndex) => {
        labelLogger.debug(`${lp} frontier: ${frontierLabel.shortText}`)
        if (phase2HitTop) { labelLogger.debug(`${lp} cancelled`); return terminateLoop }
        if (isLast(frontierIndex)) { return terminateLoop }
        if (frontierLabel.hide) { return continueLoop }

        const nextLabel = reversedLabelSet[frontierIndex + 1]
        if (nextLabel.hide) { return continueLoop }

        if (frontierLabel.intersectsWith(nextLabel) || nextLabel.isCompletelyBelow(frontierLabel)) {
          labelLogger.debug(` ${lp} intersect ${frontierLabel.shortText} v ${nextLabel.shortText}`)
          _(_.range(frontierIndex + 1, reversedLabelSet.length)).each((gettingPushedIndex) => {
            const alreadyAdjustedLabel = getPreviousShownLabel(reversedLabelSet, gettingPushedIndex)
            if (!alreadyAdjustedLabel) { return continueLoop }

            const immediatePreviousNeighbor = reversedLabelSet[gettingPushedIndex - 1]
            const immediatePreviousNeighborIsInInside = !immediatePreviousNeighbor.labelShown

            const gettingPushedLabel = reversedLabelSet[gettingPushedIndex]
            if (gettingPushedLabel.hide) { return continueLoop }

            if (gettingPushedLabel.isTopApexLabel) {
              labelLogger.debug(`  ${lp} attempt to push ${gettingPushedLabel.shortText} top label. cancelling inner`)
              phase2HitTop = true
              return terminateLoop
            }

            if (gettingPushedLabel.isHigherThan(alreadyAdjustedLabel) && !gettingPushedLabel.intersectsWith(alreadyAdjustedLabel)) {
              labelLogger.debug(`   ${lp} ${alreadyAdjustedLabel.shortText} and ${gettingPushedLabel.shortText} no intersect. cancelling inner`)
              return terminateLoop
            }

            if (canUseInnerLabelsInTheseQuadrants.includes(gettingPushedLabel.segmentQuadrant) && !immediatePreviousNeighborIsInInside) {
              try {
                this.moveToInnerLabel({
                  label: gettingPushedLabel,
                  innerLabelSet,
                })
                return continueLoop
              } catch (error) {
                if (error.isInterrupt && error.type === 'CannotMoveToInner') {
                  labelLogger.debug(`${lp} could not move ${gettingPushedLabel.shortText} to inner: "${error.description}". Proceed with adjustment`)
                } else {
                  throw error
                }
              }
            }

            const newY = alreadyAdjustedLabel.topLeftCoord.y - (gettingPushedLabel.height + outerPadding)
            const deltaY = gettingPushedLabel.topLeftCoord.y - newY
            if (newY < upperBoundary) {
              labelLogger.debug(`  ${lp} pushing ${gettingPushedLabel.shortText} exceeds canvas. cancelling inner`)
              phase2HitTop = true
              // return terminateLoop
              throw new LabelPushedOffCanvas(gettingPushedLabel, 'pushed off top')
            }

            const angleBetweenRadialAndLabelLinesBefore = gettingPushedLabel.labelLineAngle.toFixed(2)
            this.canvas.adjustLabelToNewY({
              anchor: 'top',
              newY,
              label: gettingPushedLabel,
              topIsLifted,
              bottomIsLifted,
            })
            const angleBetweenRadialAndLabelLinesAfter = gettingPushedLabel.labelLineAngle.toFixed(2)

            labelLogger.debug(`  ${lp} pushing ${gettingPushedLabel.shortText} up by ${deltaY}. Angle before ${angleBetweenRadialAndLabelLinesBefore} and after ${angleBetweenRadialAndLabelLinesAfter}`)

            if (angleBetweenRadialAndLabelLinesAfter > labelMaxLineAngle) {
              throw new AngleThresholdExceeded(gettingPushedLabel, `${angleBetweenRadialAndLabelLinesAfter} > ${labelMaxLineAngle}`)
            }

            if (!inBounds(gettingPushedIndex + 1)) { return terminateLoop }
          })
        }
      })
    }

    if (stages.finalPass) {
      let lp = `${hemisphere}:final` // lp = logPrefix
      console.log(`running ${lp}`)
      // final check for left over line angle violators
      _(outerLabelSet).each(label => {
        const angleBetweenRadialAndLabelLine = label.labelLineAngle
        if (angleBetweenRadialAndLabelLine > this.variant.labelMaxLineAngle) {
          labelLogger.warn(`${lp} found ${label.shortText} line angle exceeds threshold.`)
          throw new AngleThresholdExceeded(label, `${angleBetweenRadialAndLabelLine} > ${this.variant.labelMaxLineAngle}`)
        }
      })

      // final check for colliding labels
      const collidingLabels = findLabelsIntersecting(outerLabelSet)
      if (collidingLabels.length > 0) {
        labelLogger.warn(`${lp} found ${collidingLabels.length} colliding labels.`)
        throw new LabelCollision(collidingLabels[0], 'final check after up sweep')
      }
    }
  }

  // Current Assumptions / Limitations:
  //   * assuming that inner labels are added in order of fractionalValue descending,
  //       therefore if I cant place the current label, abort, leaving the existing inner labels as is (note this assumption is not valid, but in practice code works fine)
  moveToInnerLabel ({
    label,
    innerLabelSet,
  }) {
    const { labelOffset, innerRadius, pieCenter } = this.canvas
    const innerLabelRadius = innerRadius - labelOffset

    const newInnerLabel = InnerLabel.fromOuterLabel(label)
    newInnerLabel.innerLabelRadius = innerLabelRadius
    newInnerLabel.innerRadius = innerRadius
    newInnerLabel.pieCenter = pieCenter
    const coordAtZeroDegreesAlongInnerPieDistance = {
      x: pieCenter.x - innerLabelRadius,
      y: pieCenter.y,
    }

    const innerRadiusLabelCoord = rotate(coordAtZeroDegreesAlongInnerPieDistance, pieCenter, label.segmentAngleMidpoint)
    newInnerLabel.placeAlongFitLine(innerRadiusLabelCoord)

    if (!_.isEmpty(innerLabelSet)) {
      const previousLabel = _.last(innerLabelSet)

      const { hemisphere, angle } = newInnerLabel
      const rightHemiAndNewShouldBeLower = (hemisphere === 'right' && angle > previousLabel.segmentAngleMidpoint)
      const topLeftHemiAndNewShouldBeLower = (hemisphere === 'left' && between(0, angle, 90) && angle < previousLabel.segmentAngleMidpoint)
      const bottomLeftHemiAndNewShouldBeLower = (hemisphere === 'left' && between(270, angle, 360) && angle < previousLabel.segmentAngleMidpoint)

      // ignore cross hemispheres
      const newLabelShouldBeBelowPreviousLabel = (
        rightHemiAndNewShouldBeLower ||
        topLeftHemiAndNewShouldBeLower ||
        bottomLeftHemiAndNewShouldBeLower
      )

      const newLabelIsInOrderVertically = (newLabelShouldBeBelowPreviousLabel)
        ? newInnerLabel.isLowerThan(previousLabel)
        : newInnerLabel.isHigherThan(previousLabel)

      if (newInnerLabel.intersectsWith(previousLabel, 2) || !newLabelIsInOrderVertically) {
        if (newLabelShouldBeBelowPreviousLabel) {
          labelLogger.debug(`inner collision between ${previousLabel.shortText} v ${newInnerLabel.shortText}(new). Moving new down`)
          innerRadiusLabelCoord.y = previousLabel.topLeftCoord.y + previousLabel.height + 2 // TODO now have a couple hard coded 2's about

          // place X along innerLabelRadius based on new y position
          // Given the yOffset and the labelRadius, use pythagorem to compute the xOffset that places label along labelRadius
          const xOffset = Math.hypot(innerLabelRadius, pieCenter.y - innerRadiusLabelCoord.y)
          innerRadiusLabelCoord.x = (hemisphere === 'left')
            ? pieCenter.x - xOffset
            : pieCenter.x + xOffset

          newInnerLabel.setTopMedialPoint(innerRadiusLabelCoord)
        } else {
          labelLogger.debug(`inner collision between ${previousLabel.shortText} v ${newInnerLabel.shortText}(new). Moving new up`)
          innerRadiusLabelCoord.y = previousLabel.topLeftCoord.y - 2 // TODO now have a couple hard coded 2's about

          // place X along innerLabelRadius based on new y position
          // Given the yOffset and the labelRadius, use pythagorem to compute the xOffset that places label along labelRadius
          const xOffset = Math.hypot(innerLabelRadius, pieCenter.y - innerRadiusLabelCoord.y)
          innerRadiusLabelCoord.x = (hemisphere === 'left')
            ? pieCenter.x - xOffset
            : pieCenter.x + xOffset

          newInnerLabel.setBottomMedialPoint(innerRadiusLabelCoord)
        }
      }
    }

    const relativeToCenter = ({ x, y }) => { return { x: x - pieCenter.x, y: y - pieCenter.y } }

    const topLeftCoordIsInArc = ptInArc(relativeToCenter(newInnerLabel.topLeftCoord), 0, innerRadius, 0, 360)
    const topRightCoordIsInArc = ptInArc(relativeToCenter(newInnerLabel.topRightCoord), 0, innerRadius, 0, 360)
    const bottomLeftCoordIsInArc = ptInArc(relativeToCenter(newInnerLabel.bottomLeftCoord), 0, innerRadius, 0, 360)
    const bottomRightCoordIsInArc = ptInArc(relativeToCenter(newInnerLabel.bottomRightCoord), 0, innerRadius, 0, 360)

    const labelIsContainedWithinArc = (
      topLeftCoordIsInArc &&
      topRightCoordIsInArc &&
      bottomLeftCoordIsInArc &&
      bottomRightCoordIsInArc
    )

    labelLogger.debug(`attempt to move ${newInnerLabel.shortText} to inner : ${labelIsContainedWithinArc ? 'succeed' : 'fail'}`)

    if (!labelIsContainedWithinArc) {
      throw new CannotMoveToInner(label, 'out of bounds after adjustment')
    }

    if (newInnerLabel.angleBetweenLabelAndRadial > 45) {
      throw new CannotMoveToInner(label, `label line angle excceds threshold (${newInnerLabel.angleBetweenLabelAndRadial} > ${45}`)
    }

    labelLogger.info(`placed ${label.shortText} inside`)
    innerLabelSet.push(newInnerLabel)
    label.labelShown = false
  }
}

module.exports = CollisionResolver
