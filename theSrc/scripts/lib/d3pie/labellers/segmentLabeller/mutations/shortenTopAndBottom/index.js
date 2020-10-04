import ShortenTopAndBottom from './shortenTopAndBottom'

const mutationName = 'shortenTopAndBottom'
const mutationFn = ({ innerLabelSet, outerLabelSet, variant, invariant, canvas }) => {
  const shortener = new ShortenTopAndBottom({
    labelSet: outerLabelSet,
    variant,
    invariant,
    canvas,
  })
  const { outer, newVariants, stats } = shortener.go()

  return {
    newOuterLabelSet: outer,
    newInnerLabelSet: innerLabelSet,
    newVariants,
    stats,
  }
}

module.exports = {
  mutationName,
  mutationFn,
}
