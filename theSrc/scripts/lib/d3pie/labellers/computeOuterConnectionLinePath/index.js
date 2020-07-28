import bezierCurve from './bezierCurve'
import basisInterpolated from './basisInterpolated'
import straightLine from './straightLine'
import { inclusiveBetween } from '../../math'
const computePath = ({ labelData, basisInterpolationFunction, canvasHeight, options }) => {

  // OPTIONS
  // {
  //   straight: {
  //     min: 0,
  //     max: 5
  //   },
  //   basisInterpolated: {
  //     min: 5,
  //     max: 60
  //   },
  //   bezier: {
  //     min: 60,
  //     max: 80,
  //     segmentLeanAngle: 30,
  //     labelLeanAngle: 0,
  //     segmentPullInProportionMin: 0.25,
  //     segmentPullInProportionMax: 0.75,
  //   }
  // }

  if (inclusiveBetween(options.straight.min, labelData.labelLineAngle, options.straight.max)) {
    return straightLine({ labelData })
  } else if (inclusiveBetween(options.basisInterpolated.min, labelData.labelLineAngle, options.basisInterpolated.max)) {
    return basisInterpolated({ labelData, basisInterpolationFunction })
  } else if (inclusiveBetween(options.bezier.min, labelData.labelLineAngle, options.bezier.max)) {
    return bezierCurve({ labelData, canvasHeight, ...options.bezier })
  } else {
    console.warn(`unhandled labelLineAngle ${labelData.labelLineAngle}. Defaulting to straight line`)
    return straightLine({labelData, canvasHeight})
  }
}

module.exports = computePath