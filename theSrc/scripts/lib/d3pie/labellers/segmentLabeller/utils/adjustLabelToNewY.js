import { toRadians } from '../../../math'

// TODO bit of a temp hack
const spacingBetweenUpperTrianglesAndCenterMeridian = 7

module.exports = ({
  anchor, // top or bottom
  newY,
  labelDatum,
  labelRadius,
  yRange,
  labelLiftOffAngle,
  pieCenter,
  topIsLifted,
  bottomIsLifted,
}) => {
  let newTopYCoord = null
  let isLifted = false
  if (anchor === 'top') {
    newTopYCoord = newY
  } else if (anchor === 'bottom') {
    newTopYCoord = newY - labelDatum.height
  }

  // TODO move to label
  let numTextRows = labelDatum.labelTextLines.length
  let { innerPadding, lineHeight } = labelDatum
  let newLineConnectorYCoord = (newTopYCoord < pieCenter.y)
    ? newTopYCoord + (numTextRows - 1) * (innerPadding + lineHeight) + 0.5 * lineHeight
    : newTopYCoord + 0.5 * lineHeight

  let yOffset = Math.abs(pieCenter.y - newLineConnectorYCoord)

  if (yOffset > yRange) {
    console.warn(`yOffset(${yOffset}) cannot be greater than yRange(${yRange})`)
    yOffset = yRange
  }

  const labelLiftOffAngleInRadians = ((labelDatum.inTopHalf && topIsLifted) || (labelDatum.inBottomHalf && bottomIsLifted))
    ? toRadians(labelLiftOffAngle)
    : 0

  const yPosWhereLabelRadiusAndUpperTriangleMeet = labelRadius * Math.cos(labelLiftOffAngleInRadians)
  const xPosWhereLabelRadiusAndUpperTriangleMeet = labelRadius * Math.sin(labelLiftOffAngleInRadians)
  let xOffset = 0

  if (yOffset <= yPosWhereLabelRadiusAndUpperTriangleMeet) {
    // place X along labelRadius
    // step 1. Given the yOffset and the labelRadius, use pythagorem to compute the xOffset that places label along labelRadius
    xOffset = Math.sqrt(Math.pow(labelRadius, 2) - Math.pow(yOffset, 2))
  } else {
    // place X along upper triangle
    // step 1. Given [x,y]PosWhereLabelRadiusAndUpperTriangleMeet, and yRange, compute the upperTriangleYAngle
    isLifted = true
    const yLengthOfUpperTriangle = yRange - yPosWhereLabelRadiusAndUpperTriangleMeet
    const xLengthOfUpperTriangle = xPosWhereLabelRadiusAndUpperTriangleMeet
    const upperTriangleYAngleInRadians = Math.atan(xLengthOfUpperTriangle / yLengthOfUpperTriangle)

    // step 2. Given the upperTriangleYAngle and the yOffset, determine the xOffset that places the label that places it along the upperTriange
    const yLengthOfLabelOnUpperTriangle = yRange - yOffset
    xOffset = yLengthOfLabelOnUpperTriangle * Math.tan(upperTriangleYAngleInRadians) + spacingBetweenUpperTrianglesAndCenterMeridian
  }

  const newLineConnectorCoord = {
    x: (labelDatum.hemisphere === 'left') ? pieCenter.x - xOffset : pieCenter.x + xOffset,
    y: newY,
  }

  labelDatum.isLifted = isLifted
  if (anchor === 'top') {
    labelDatum.setTopMedialPoint(newLineConnectorCoord)
  } else {
    labelDatum.setBottomMedialPoint(newLineConnectorCoord)
  }
}
