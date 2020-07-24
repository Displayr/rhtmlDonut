import bezierCurve from './bezierCurve'
import basisInterpolated from './basisInterpolated'

const computePath = ({ labelData, basisInterpolationFunction }) => {
  if (labelData.labelLineAngle > 60 && labelData.inTopHalf && labelData.inLeftHalf) {
    return bezierCurve({ labelData })
  } else {
    return basisInterpolated({ labelData, basisInterpolationFunction })
  }
}

module.exports = computePath