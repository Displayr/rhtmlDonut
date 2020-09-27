import _ from 'lodash'
import { extractAndThrowIfNullFactory } from '../mutationHelpers'
import { between, inclusiveBetween } from './../../../math'
import { findLabelsIntersecting } from '../../labelUtils'
import { labelLogger } from '../../../../logger'

const mutationName = 'initialNaivePlacement'
const mutationFn = ({ outerLabelSet: labelSet, invariant, canvas }) => {
  const extractAndThrowIfNull = extractAndThrowIfNullFactory(mutationName)
  const stats = { completed: false }
  const newVariants = {}

  const liftOffAngle = extractAndThrowIfNull(invariant, 'liftOffAngle')

  // TODO hard coded ranges
  const topApexLabel = _(labelSet)
    .filter(labelData => inclusiveBetween(87, labelData.segmentAngleMidpoint, 93))
    .minBy(labelDatum => Math.abs(90 - labelDatum.segmentAngleMidpoint))

  const bottomApexLabel = _(labelSet)
    .filter(labelData => inclusiveBetween(267, labelData.segmentAngleMidpoint, 273))
    .minBy(labelDatum => Math.abs(270 - labelDatum.segmentAngleMidpoint))

  if (topApexLabel) {
    labelLogger.info('has top apex label')
    newVariants.hasTopLabel = true
    topApexLabel.isTopApexLabel = true
  } else {
    newVariants.hasTopLabel = false
  }

  if (bottomApexLabel) {
    labelLogger.info('has bottom apex label')
    newVariants.hasBottomLabel = true
    bottomApexLabel.isBottomApexLabel = true
  } else {
    newVariants.hasBottomLabel = false
  }

  // First place labels using a liftOff of 0, then check for collisions and only lift
  // if there are any collisions do we apply a liftOffAngle
  _(labelSet).each(label => {
    canvas.placeLabelAlongLabelRadius({
      label,
      hasTopLabel: newVariants.hasTopLabel,
      hasBottomLabel: newVariants.hasBottomLabel,
    })
  })

  const topLabelsThatCouldBeLifted = labelSet
    .filter(({ segmentAngleMidpoint }) => between(90 - liftOffAngle, segmentAngleMidpoint, 90 + liftOffAngle))
  const collisionsInTopSet = findLabelsIntersecting(topLabelsThatCouldBeLifted)
  if (collisionsInTopSet.length > 0) {
    labelLogger.info(`Collisions between ${90 - liftOffAngle} - ${90 + liftOffAngle}, applying liftoff spacing`)
    newVariants.topIsLifted = true
    _(topLabelsThatCouldBeLifted).each(label => {
      canvas.placeLabelAlongLabelRadiusWithLift({
        label,
        hasTopLabel: newVariants.hasTopLabel,
        hasBottomLabel: newVariants.hasBottomLabel,
      })
    })
  }

  const bottomLabelsThatCouldBeLifted = labelSet
    .filter(({ segmentAngleMidpoint }) => between(270 - liftOffAngle, segmentAngleMidpoint, 270 + liftOffAngle))
  const collisionsInBottomSet = findLabelsIntersecting(bottomLabelsThatCouldBeLifted)
  if (collisionsInBottomSet.length > 0) {
    labelLogger.info(`Collisions between ${270 - liftOffAngle} - ${270 + liftOffAngle}, applying liftoff spacing`)
    newVariants.bottomIsLifted = true
    _(bottomLabelsThatCouldBeLifted).each(label => {
      canvas.placeLabelAlongLabelRadiusWithLift({
        label,
        hasTopLabel: newVariants.hasTopLabel,
        hasBottomLabel: newVariants.hasBottomLabel,
      })
    })
  }

  stats.completed = true
  return {
    newOuterLabelSet: labelSet,
    newInnerLabelSet: [],
    newVariants,
    stats,
  }
}

module.exports = {
  mutationName,
  mutationFn,
}
