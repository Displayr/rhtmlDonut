import CollisionResolver from './CollisionResolver'

import { findLabelsIntersecting } from '../../../labelUtils'
import { labelLogger } from '../../../../../logger'

const mutationName = 'performCollisionResolution'
const mutationFn = ({ innerLabelSet, outerLabelSet, variant, invariant, canvas }) => {
  const initialCollisions = findLabelsIntersecting(outerLabelSet)
  if (initialCollisions.length === 0) {
    labelLogger.info(`no collisions detected in initial layout. Terminating collision detection.`)
    return {
      newVariants: {},
      stats: { skipped: true },
    }
  }

  labelLogger.info(`collisions detected in initial layout. Proceeding with collision detection.`)

  const collisionResolver = new CollisionResolver({
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
