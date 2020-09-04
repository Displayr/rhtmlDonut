import _ from 'lodash'
import { between } from '../../math'

module.exports = (labelSet, outerlabelPadding = 1) => {
  const leftLabels = _(labelSet).filter({ hemisphere: 'left' }).value()
  const rightLabels = _(labelSet).filter({ hemisphere: 'right' }).value()

  const minDataValue = _(labelSet)
    .map('value')
    .min()

  const maxDataValue = _(labelSet)
    .map('value')
    .max()

  let maxLeftSideLabelWidth = _(leftLabels)
    .map('width')
    .max() || 0

  let maxRightSideLabelWidth = _(rightLabels)
    .map('width')
    .max() || 0

  let maxLeftSideLabelHeight = _(leftLabels)
    .map('height')
    .max() || 0

  let maxRightSideLabelHeight = _(rightLabels)
    .map('height')
    .max() || 0

  let cumulativeLeftSideLabelHeight = _(leftLabels)
    .map('height')
    .sum() + outerlabelPadding * Math.max(0, (leftLabels.length - 1))

  let cumulativeRightSideLabelHeight = _(rightLabels)
    .map('height')
    .sum() + outerlabelPadding * Math.max(0, (rightLabels.length - 1))

  let fontSizeDistribution = _(labelSet).countBy('fontSize')

  let maxFontSize = _(labelSet)
    .map('fontSize')
    .max() || 0

  let densities = _(labelSet)
    .countBy(labelDatum => {
      if (between(60, labelDatum.segmentAngleMidpoint, 120)) { return 'top' }
      if (between(240, labelDatum.segmentAngleMidpoint, 300)) { return 'bottom' }
      return 'middle'
    })
    .defaults({ top: 0, middle: 0, bottom: 0 })
    .value()

  return {
    densities,
    maxFontSize,
    fontSizeDistribution, // TODO this is a lodash wrapped object (but it works ?)
    minDataValue,
    maxDataValue,
    maxLeftSideLabelWidth,
    maxRightSideLabelWidth,
    maxLabelWidth: Math.max(maxLeftSideLabelWidth, maxRightSideLabelWidth),
    maxLeftSideLabelHeight,
    maxRightSideLabelHeight,
    maxLabelHeight: Math.max(maxLeftSideLabelHeight, maxRightSideLabelHeight),
    cumulativeLeftSideLabelHeight,
    cumulativeRightSideLabelHeight,
    totalDesiredHeight: Math.max(cumulativeLeftSideLabelHeight, cumulativeRightSideLabelHeight),
  }
}
