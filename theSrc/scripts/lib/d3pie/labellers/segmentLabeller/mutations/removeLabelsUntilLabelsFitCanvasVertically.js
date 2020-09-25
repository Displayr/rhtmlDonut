import _ from 'lodash'
import * as rootLog from 'loglevel'
import computeLabelStats from '../computeLabelStats'
import { terminateLoop } from '../../../../loopControls'
import { extractAndThrowIfNullFactory } from '../mutationHelpers'
const labelLogger = rootLog.getLogger('label')

// TODO this fn does not guarantee the least are removed.
//  The loop deletes in set order - not ascending value order - and terminates mid loop once constraint is met ..

const mutationName = 'removeLabelsUntilLabelsFitCanvasVertically'
const mutationFn = ({ outerLabelSet: labelSet, variant, invariant, canvas }) => {
  const extractAndThrowIfNull = extractAndThrowIfNullFactory(mutationName)
  const stats = { completed: false }
  const originalLabelCount = labelSet.length

  const outerPadding = extractAndThrowIfNull(invariant, 'outerPadding')
  const minProportion = extractAndThrowIfNull(variant, 'minProportion')
  const canvasHeight = extractAndThrowIfNull(canvas, 'height')

  // TODO make 0.0005 configurable, or use one of the existing iteration values
  let newMinProportion = null
  _(_.range(minProportion, 1, 0.0005)).each(x => {
    newMinProportion = x
    let labelStats = computeLabelStats(labelSet, outerPadding)
    let leftSideHeightDeficit = labelStats.cumulativeLeftSideLabelHeight - canvasHeight
    let rightSideHeightDeficit = labelStats.cumulativeRightSideLabelHeight - canvasHeight

    const beforeCount = labelSet.length
    for (let i = labelSet.length - 1; i >= 0; i--) {
      let label = labelSet[i]
      if ((leftSideHeightDeficit > 0 || rightSideHeightDeficit > 0) && label.proportion < newMinProportion) {
        label.labelShown = false
        if (label.hemisphere === 'left') {
          leftSideHeightDeficit -= (label.height + outerPadding)
        }
        if (label.hemisphere === 'right') {
          rightSideHeightDeficit -= (label.height + outerPadding)
        }
      }

      if (leftSideHeightDeficit <= 0 && rightSideHeightDeficit <= 0) {
        break
      }
    }

    labelSet = labelSet.filter(datum => datum.labelShown)
    labelStats = computeLabelStats(labelSet, outerPadding)

    labelLogger.info(`Applied new minProportion ${newMinProportion.toFixed(4)}. Before count ${beforeCount} after count ${labelSet.length}. New maxDesiredHeight:${labelStats.totalDesiredHeight}, canvasHeight:${canvasHeight}`)

    if (labelStats.totalDesiredHeight <= canvasHeight) {
      labelLogger.info(`new minProportion ${newMinProportion.toFixed(4)} provided enough shrinkage. Moving on to next step`)
      stats.completed = true
      return terminateLoop
    }
  })
  stats.removedLabels = originalLabelCount - labelSet.length

  return {
    newOuterLabelSet: labelSet,
    newInnerLabelSet: [],
    newVariants: { minProportion: newMinProportion },
    stats,
  }
}

module.exports = {
  mutationName,
  mutationFn,
}
