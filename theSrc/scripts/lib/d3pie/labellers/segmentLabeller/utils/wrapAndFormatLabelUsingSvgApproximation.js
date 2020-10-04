import _ from 'lodash'
import { getLabelDimensionsUsingSvgApproximation, splitIntoLines } from '../../labelUtils'

module.exports = ({
  parentContainer,
  labelText,
  fontSize,
  fontFamily,
  innerPadding,
  maxLabelWidth,
  maxLabelLines,
}) => {
  let lines = splitIntoLines(labelText, maxLabelWidth, fontSize, fontFamily, maxLabelLines)
  const dimensions = lines.map(line => {
    return getLabelDimensionsUsingSvgApproximation(parentContainer, line, fontSize, fontFamily)
  })
  const widestLine = _(dimensions).map('width').max()
  const sumHeightAndPadding = _(dimensions).map('height').sum() + (lines.length - 1) * innerPadding

  return {
    lineHeight: dimensions[0].height,
    width: widestLine,
    height: sumHeightAndPadding,
    labelTextLines: lines,
  }
}
