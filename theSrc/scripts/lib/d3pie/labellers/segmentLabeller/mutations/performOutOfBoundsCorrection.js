import _ from 'lodash'
import * as rootLog from 'loglevel'
import { extractAndThrowIfNullFactory } from '../mutationHelpers'
const labelLogger = rootLog.getLogger('label')

// TODO use extractAndThrowIfNull

const mutationName = 'performOutOfBoundsCorrection'
const mutationFn = ({ outerLabelSet: labelSet, variant, invariant, canvas }) => {
  const extractAndThrowIfNull = extractAndThrowIfNullFactory(mutationName)
  const stats = { completed: false }
  const newVariants = {}

  const bottomIsLifted = extractAndThrowIfNull(variant, 'bottomIsLifted')
  const canvasHeight = extractAndThrowIfNull(canvas, 'height')
  const canvasWidth = extractAndThrowIfNull(canvas, 'width')
  const outerPadding = extractAndThrowIfNull(invariant, 'outerPadding')
  const topIsLifted = extractAndThrowIfNull(variant, 'topIsLifted')

  const newYPositions = {}
  const useYFromLookupTableAndCorrectX = (yPositionLookupTable, anchor) => {
    return label => {
      canvas.adjustLabelToNewY({
        anchor,
        newY: yPositionLookupTable[label.id],
        label,
        topIsLifted,
        bottomIsLifted,
      })

      return label
    }
  }

  const labelsOverTop = _(labelSet)
    .filter(datum => datum.topLeftCoord.y < 0)

  const leftLabelsOverTop = labelsOverTop
    .filter({ hemisphere: 'left' })

  const rightLabelsOverTop = labelsOverTop
    .filter({ hemisphere: 'right' })

  // NB 'last' ID in left hemi must get y closest to zero to stay on top (i.e. preserving order)
  leftLabelsOverTop
    .sortBy('id')
    .map('id')
    .reverse()
    .each((leftIdOverTop, index) => {
      newYPositions[leftIdOverTop] = outerPadding + 0.01 * index
    })

  // NB 'first' ID in right hemi must get y closest to zero to stay on top (i.e. preserving order)
  rightLabelsOverTop
    .sortBy('id')
    .map('id')
    .each((rightIdOverTop, index) => {
      newYPositions[rightIdOverTop] = outerPadding + 0.01 * index
    })

  const labelsUnderBottom = _(labelSet)
    .filter(datum => datum.topLeftCoord.y + datum.height > canvasHeight)

  const leftLabelsUnderBottom = labelsUnderBottom
    .filter({ hemisphere: 'left' })

  const rightLabelsUnderBottom = labelsUnderBottom
    .filter({ hemisphere: 'right' })

  // NB 'first' ID in left hemi must get y closest to max to stay on bottom (i.e. preserving order)
  const leftLabelsUnderBottomSortedById = leftLabelsUnderBottom.sortBy('id')
    .value()

  _(leftLabelsUnderBottomSortedById).each((labelDatum, index) => {
    const id = labelDatum.id
    if (index === 0) {
      newYPositions[id] = canvasHeight - outerPadding - 0.01 - labelDatum.height
    } else {
      const previousLabelNewYPosition = newYPositions[leftLabelsUnderBottomSortedById[index - 1].id]
      const maxYPositionToStayInBounds = canvasHeight - labelDatum.height
      newYPositions[id] = Math.min(maxYPositionToStayInBounds, previousLabelNewYPosition - 0.01)
    }
  })

  // NB 'last' ID in right hemi must get y closest to max to stay on bottom (i.e. preserving order)
  const rightLabelsUnderBottomSortedById = rightLabelsUnderBottom.sortBy('id')
    .reverse()
    .value()

  _(rightLabelsUnderBottomSortedById).each((labelDatum, index) => {
    const id = labelDatum.id
    if (index === 0) {
      newYPositions[id] = canvasHeight - outerPadding - 0.01 - labelDatum.height
    } else {
      const previousLabelNewYPosition = newYPositions[rightLabelsUnderBottomSortedById[index - 1].id]
      const maxYPositionToStayInBounds = canvasHeight - labelDatum.height
      newYPositions[id] = Math.min(maxYPositionToStayInBounds, previousLabelNewYPosition - 0.01)
    }
  })

  _(leftLabelsOverTop).each(useYFromLookupTableAndCorrectX(newYPositions, 'top'))
  _(rightLabelsOverTop).each(useYFromLookupTableAndCorrectX(newYPositions, 'top'))
  _(leftLabelsUnderBottom).each(useYFromLookupTableAndCorrectX(newYPositions, 'top'))
  _(rightLabelsUnderBottom).each(useYFromLookupTableAndCorrectX(newYPositions, 'top'))

  const labelsOverlappingRightEdgeCount = _(labelSet)
    .filter((datum) => { return datum.topLeftCoord.x + datum.width > canvasWidth })
    .map((datum) => {
      datum.topLeftCoord.x = canvasWidth - datum.width
      return datum
    })
    .size()

  const labelsOverlappingLeftEdgeCount = _(labelSet)
    .filter((datum) => { return datum.topLeftCoord.x < 0 })
    .map((datum) => {
      datum.topLeftCoord.x = 0
      return datum
    })
    .size()

  labelLogger.info(`corrected ${leftLabelsOverTop.size()} left labels over top`)
  labelLogger.info(`corrected ${rightLabelsOverTop.size()} right labels over top`)
  labelLogger.info(`corrected ${leftLabelsUnderBottom.size()} left labels under bottom`)
  labelLogger.info(`corrected ${rightLabelsUnderBottom.size()} right labels under bottom`)
  labelLogger.info(`corrected ${labelsOverlappingRightEdgeCount} labels over left`)
  labelLogger.info(`corrected ${labelsOverlappingLeftEdgeCount} labels over right`)

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
