import bezierCurve from './bezierCurve'
import basisInterpolated from './basisInterpolated'
import straightLine from './straightLine'

const computePath = ({ labelData, basisInterpolationFunction, pieCenter, canvasHeight }) => {
  if (labelData.labelLineAngle < 5) {
    return straightLine({ labelData, pieCenter, canvasHeight })
  } else if (labelData.labelLineAngle <= 60) {
    return basisInterpolated({ labelData, basisInterpolationFunction })
  } else {
    return bezierCurve({ labelData, pieCenter, canvasHeight })
  }
}

module.exports = computePath