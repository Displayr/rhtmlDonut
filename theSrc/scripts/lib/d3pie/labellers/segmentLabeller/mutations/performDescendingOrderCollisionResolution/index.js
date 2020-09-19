import DescendingOrderCollisionResolver from './DescendingOrderCollisionResolver'

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
