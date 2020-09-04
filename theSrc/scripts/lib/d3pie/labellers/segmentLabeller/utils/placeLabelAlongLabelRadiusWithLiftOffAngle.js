// TODO need to doc this using an image, and test that it lines up with computeXGivenY
// TODO this fn is now useless, as it too is a wrapper
import { rotate } from '../../../math'
import computeInitialCoordAlongLabelRadiusWithLiftOffAngle from './computeInitialCoordAlongLabelRadiusWithLiftOffAngle'

module.exports = ({
  labelDatum,
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
}) => {
  if (labelDatum.isTopApexLabel) {
    const coordAtZeroDegreesAlongOuterRadius = { x: pieCenter.x - outerRadius, y: pieCenter.y }
    const segmentCoord = rotate(coordAtZeroDegreesAlongOuterRadius, pieCenter, labelDatum.segmentAngleMidpoint)

    const fitLineCoord = {
      x: segmentCoord.x,
      y: Math.min( // NB do not allow really big labels to push pack inside outerRadius mark
        pieCenter.y - (outerRadius + maxVerticalOffset - labelDatum.height),
        pieCenter.y - outerRadius - labelOffset
      ),
    }
    labelDatum.placeLabelViaConnectorCoord(fitLineCoord)
  } else if (labelDatum.isBottomApexLabel) {
    const coordAtZeroDegreesAlongOuterRadius = { x: pieCenter.x - outerRadius, y: pieCenter.y }
    const segmentCoord = rotate(coordAtZeroDegreesAlongOuterRadius, pieCenter, labelDatum.segmentAngleMidpoint)

    const fitLineCoord = {
      x: segmentCoord.x,
      y: Math.max( // NB do not allow really big labels to push pack inside outerRadius mark
        pieCenter.y + (outerRadius + maxVerticalOffset - labelDatum.height),
        pieCenter.y + outerRadius + labelOffset
      ),
    }
    labelDatum.placeLabelViaConnectorCoord(fitLineCoord)
  } else {
    const { fitLineCoord, isLifted } = computeInitialCoordAlongLabelRadiusWithLiftOffAngle({
      angle: labelDatum.segmentAngleMidpoint,
      labelHeight: labelDatum.height,
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
    })
    labelDatum.placeLabelViaConnectorCoord(fitLineCoord)
    labelDatum.isLifted = isLifted
  }
}
