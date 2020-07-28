import bezierCurve from './bezierCurve'
import basisInterpolated from './basisInterpolated'
import straightLine from './straightLine'
import { inclusiveBetween } from '../../math'
const computePath = ({ labelData, basisInterpolationFunction, canvasHeight, options }) => {

  // OPTIONS
  // {
  //   straight: {
  //     minAngle: 0,
  //     maxAngle: 5
  //   },
  //   basisInterpolated: {
  //     minAngle: 5,
  //     maxAngle: 60
  //   },
  //   bezier: {
  //     minAngle: 60,
  //     maxAngle: 80,
  //     segmentLeanAngle: 30,
  //     labelLeanAngle: 0,
  //     segmentPullInProportionMin: 0.25,
  //     segmentPullInProportionMax: 0.75,
  //   }
  // }

  if (inclusiveBetween(options.straight.minAngle, labelData.labelLineAngle, options.straight.maxAngle)) {
    return straightLine({ labelData })
  } else if (inclusiveBetween(options.basisInterpolated.minAngle, labelData.labelLineAngle, options.basisInterpolated.maxAngle)) {
    return basisInterpolated({ labelData, basisInterpolationFunction })
  } else if (inclusiveBetween(options.bezier.minAngle, labelData.labelLineAngle, options.bezier.maxAngle)) {
    return bezierCurve({ labelData, canvasHeight, ...options.bezier })
  } else {
    console.warn(`unhandled labelLineAngle ${labelData.labelLineAngle}. Defaulting to straight line`)
    return straightLine({labelData, canvasHeight})
  }
}

module.exports = computePath