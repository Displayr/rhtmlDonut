import DescendingOrderCollisionResolver from './DescendingOrderCollisionResolver'

import { findLabelsIntersecting } from '../../../labelUtils'
import * as rootLog from 'loglevel'
const labelLogger = rootLog.getLogger('label')

const mutationName = 'performDescendingOrderCollisionResolution'
const mutationFn = ({ innerLabelSet, outerLabelSet, variant, invariant, canvas }) => {
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
