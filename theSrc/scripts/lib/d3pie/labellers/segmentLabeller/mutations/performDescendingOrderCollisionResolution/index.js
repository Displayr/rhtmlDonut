import DescendingOrderCollisionResolver from './DescendingOrderCollisionResolver'

import { findLabelsIntersecting } from '../../../labelUtils'
import * as rootLog from 'loglevel'
const labelLogger = rootLog.getLogger('label')

const mutationName = 'performDescendingOrderCollisionResolution'
const mutationFn = ({ innerLabelSet, outerLabelSet, variant, invariant, canvas }) => {
  const initialCollisions = findLabelsIntersecting(outerLabelSet)
  if (initialCollisions.length === 0) {
    labelLogger.info(`no collisions detected in initial layout. Terminating collision detection.`)
    return {
      newVariants: {},
      stats: { skipped: true },
    }
  }

  labelLogger.info(`collisions detected in initial layout. Proceeding with descending order collision detection.`)

  const collisionResolver = new DescendingOrderCollisionResolver({
    labelSet: outerLabelSet,
    variant,
    invariant,
    canvas,
  })
  const { inner, outer, newVariants, stats } = collisionResolver.go()

  return {
    newOuterLabelSet: outer,
    newInnerLabelSet: inner,
    newVariants,
    stats,
  }
}

module.exports = {
  mutationName,
  mutationFn,
}
