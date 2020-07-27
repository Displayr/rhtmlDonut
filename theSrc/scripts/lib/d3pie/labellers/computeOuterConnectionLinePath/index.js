import bezierCurve from './bezierCurve'
import basisInterpolated from './basisInterpolated'

const computePath = ({ labelData, basisInterpolationFunction, pieCenter, canvasHeight }) => {
  // return bezierCurve({ labelData, pieCenter })
  if (labelData.labelLineAngle > 60) {
    return bezierCurve({ labelData, pieCenter, canvasHeight })
  } else {
    return basisInterpolated({ labelData, basisInterpolationFunction })
  }
}

module.exports = computePath