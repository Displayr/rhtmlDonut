// TODO need to doc this using an image, and test that it lines up with computeXGivenY
// TODO this fn is now useless, as it too is a wrapper
import { rotate } from '../../../math'
import computeInitialCoordAlongLabelRadiusWithLiftOffAngle from './computeInitialCoordAlongLabelRadiusWithLiftOffAngle'

module.exports = ({
  labelDatum: label,
  labelOffset,
  labelLiftOffAngle,
  outerRadius,
  pieCenter,
  canvasHeight,
  maxFontSize,
  maxVerticalOffset,
  hasTopLabel = false,
  hasBottomLabel = false,
  minGap = 1,
  spacingBetweenUpperTrianglesAndCenterMeridian,
}) => {
  if (label.isTopApexLabel) {
    const coordAtZeroDegreesAlongOuterRadius = { x: pieCenter.x - outerRadius, y: pieCenter.y }
    const segmentCoord = rotate(coordAtZeroDegreesAlongOuterRadius, pieCenter, label.segmentAngleMidpoint)

    const fitLineCoord = {
      x: segmentCoord.x,
      y: Math.min( // NB do not allow really big labels to push pack inside outerRadius mark
        pieCenter.y - outerRadius - maxVerticalOffset,
        pieCenter.y - outerRadius - labelOffset
      ),
    }
    label.placeLabelViaConnectorCoord(fitLineCoord)
  } else if (label.isBottomApexLabel) {
    const coordAtZeroDegreesAlongOuterRadius = { x: pieCenter.x - outerRadius, y: pieCenter.y }
    const segmentCoord = rotate(coordAtZeroDegreesAlongOuterRadius, pieCenter, label.segmentAngleMidpoint)

    const fitLineCoord = {
      x: segmentCoord.x,
      y: Math.max( // NB do not allow really big labels to push pack inside outerRadius mark
        pieCenter.y + outerRadius + maxVerticalOffset,
        pieCenter.y + outerRadius + labelOffset
      ),
    }
    label.placeLabelViaConnectorCoord(fitLineCoord)
  } else {
    const { fitLineCoord, isLifted } = computeInitialCoordAlongLabelRadiusWithLiftOffAngle({
      angle: label.segmentAngleMidpoint,
      labelHeight: label.height,
      labelOffset,
      labelLiftOffAngle,
      outerRadius,
      pieCenter,
      canvasHeight,
      maxFontSize,
      maxVerticalOffset,
      hasTopLabel,
      hasBottomLabel,
      minGap,
      spacingBetweenUpperTrianglesAndCenterMeridian,
    })
    label.isLifted = isLifted
    label.placeLabelViaConnectorCoord(fitLineCoord)
  }
}
