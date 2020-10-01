import { between, computeIntersectionOfTwoLines, rotate } from '../../../math'
import { labelLogger } from '../../../../logger'

module.exports = ({
  angle,
  labelHeight,
  labelLiftOffAngle,
  pieCenter,
  outerRadius,
  labelOffset,
  canvasHeight,
  maxFontSize,
  maxVerticalOffset,
  hasTopLabel = false,
  hasBottomLabel = false,
  minGap = 1,
  spacingBetweenUpperTrianglesAndCenterMeridian,
}) => {
  let fitLineCoord = null
  let isLifted = false

  const highYOffSetAngle = (angle) => (
    between(90 - labelLiftOffAngle, angle, 90 + labelLiftOffAngle) ||
    between(270 - labelLiftOffAngle, angle, 270 + labelLiftOffAngle)
  )
  const pointAtZeroDegreesAlongLabelOffset = { x: pieCenter.x - outerRadius - labelOffset, y: pieCenter.y }

  if (highYOffSetAngle(angle)) {
    const radialCoord = rotate(pointAtZeroDegreesAlongLabelOffset, pieCenter, angle)
    const radialLine = [pieCenter, radialCoord]

    let placementLineCoord1 = {}
    placementLineCoord1.y = (between(0, angle, 180))
      ? pieCenter.y - (outerRadius + maxVerticalOffset)
      : pieCenter.y + (outerRadius + maxVerticalOffset)
    placementLineCoord1.x = (between(0, angle, 90) || between(270, angle, 360))
      ? pieCenter.x - spacingBetweenUpperTrianglesAndCenterMeridian
      : pieCenter.x + spacingBetweenUpperTrianglesAndCenterMeridian

    let placementLineCoord2 = null
    if (between(0, angle, 90)) {
      placementLineCoord2 = rotate(pointAtZeroDegreesAlongLabelOffset, pieCenter, 90 - labelLiftOffAngle)
    } else if (between(90, angle, 180)) {
      placementLineCoord2 = rotate(pointAtZeroDegreesAlongLabelOffset, pieCenter, 90 + labelLiftOffAngle)
    } else if (between(180, angle, 270)) {
      placementLineCoord2 = rotate(pointAtZeroDegreesAlongLabelOffset, pieCenter, 270 - labelLiftOffAngle)
    } else {
      placementLineCoord2 = rotate(pointAtZeroDegreesAlongLabelOffset, pieCenter, 270 + labelLiftOffAngle)
    }

    const placementLine = [placementLineCoord1, placementLineCoord2]

    const intersection = computeIntersectionOfTwoLines(radialLine, placementLine)

    if (intersection) {
      fitLineCoord = intersection
      if (fitLineCoord.y < 0) { fitLineCoord.y = 0 }
      if (fitLineCoord.y + labelHeight > canvasHeight) { fitLineCoord.y = canvasHeight - labelHeight }
      isLifted = true
    } else {
      labelLogger.error(`unexpected condition. could not compute intersection with placementLine for label at angle ${angle}`)
      fitLineCoord = rotate(pointAtZeroDegreesAlongLabelOffset, pieCenter, angle)
    }
  } else {
    fitLineCoord = rotate(pointAtZeroDegreesAlongLabelOffset, pieCenter, angle)
  }

  return { fitLineCoord, isLifted }
}
