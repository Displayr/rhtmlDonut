import DescendingOrderCollisionResolverFailedAttempt from './DescendingOrderCollisionResolverFailedAttempt'

const mutationName = 'performDescendingOrderCollisionResolutionFailedAttempt'
const mutationFn = ({ innerLabelSet, outerLabelSet, variant, invariant, canvas }) => {
  console.log('YOU SHOULDNT BE USING THIS IT NEVER WORKED AND IS DUE TO BE DELETED')
  const collisionResolver = new DescendingOrderCollisionResolverFailedAttempt({
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
