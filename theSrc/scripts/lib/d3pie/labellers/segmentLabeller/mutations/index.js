import initialNaivePlacement from './initialNaivePlacement'
import performOutOfBoundsCorrection from './performOutOfBoundsCorrection'
import removeLabelsUntilLabelsFitCanvasVertically from './removeLabelsUntilLabelsFitCanvasVertically'
import shortenTopAndBottom from './shortenTopAndBottom'
import shrinkFontSizesUntilLabelsFitCanvasVertically from './shrinkFontSizesUntilLabelsFitCanvasVertically'
import performCollisionResolution from './performCollisionResolution'
import performDescendingOrderCollisionResolution from './performDescendingOrderCollisionResolution'

module.exports = {
  initialNaivePlacement,
  performCollisionResolution,
  performDescendingOrderCollisionResolution,
  performOutOfBoundsCorrection,
  removeLabelsUntilLabelsFitCanvasVertically,
  shortenTopAndBottom,
  shrinkFontSizesUntilLabelsFitCanvasVertically,
}
