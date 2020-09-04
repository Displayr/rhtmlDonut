import initialNaivePlacement from './initialNaivePlacement'
import performOutOfBoundsCorrection from './performOutOfBoundsCorrection'
import removeLabelsUntilLabelsFitCanvasVertically from './removeLabelsUntilLabelsFitCanvasVertically'
import shortenTopAndBottom from './shortenTopAndBottom'
import shrinkFontSizesUntilLabelsFitCanvasVertically from './shrinkFontSizesUntilLabelsFitCanvasVertically'
import performCollisionResolution from './performCollisionResolution'

module.exports = {
  initialNaivePlacement,
  performCollisionResolution,
  performOutOfBoundsCorrection,
  removeLabelsUntilLabelsFitCanvasVertically,
  shortenTopAndBottom,
  shrinkFontSizesUntilLabelsFitCanvasVertically,
}
