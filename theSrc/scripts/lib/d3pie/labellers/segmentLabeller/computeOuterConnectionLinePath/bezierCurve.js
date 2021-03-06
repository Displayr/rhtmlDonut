import { computeIntersectionOfTwoLines, between, toRadians } from '../../../math'

// draw a bezier curve from the segment to the label
// * start with a rectangle with the segment and label at opposite points ("kitty corner") on the rectangle
// * optionally lean the rectangle based on segmentControlLeanDegrees and labelControlLeanDegrees
//   * this is done to reduce overlap of neighboring bezier lines
// optionally "pull back the segment control point"
//   * this is done to reduce overlap of neighboring bezier lines
// now draw the bezier curve using the point above the segment point as the first control point, and the point below the label as the second control point

// NB on the use of '2000' in line generation functions: It is arbitrary, just pick a point far away so we get a long line to ensure intersections

module.exports = ({ labelData, canvasHeight, segmentLeanAngle, labelLeanAngle, segmentPullInProportionMin, segmentPullInProportionMax, labelMaxLineAngle }) => {
  const { segmentCoord, labelCoord } = getSegmentAndLabelCoords({ labelData })
  const { segmentControlCoord, labelControlCoord } = getControlCoordinates({ labelData, segmentLeanAngle, labelLeanAngle, labelMaxLineAngle })
  const controlPointPullInPercentage = getSegmentControlPointPullInPercentage({ labelData, canvasHeight, segmentPullInProportionMin, segmentPullInProportionMax })

  segmentControlCoord.x = weightedAverage({ from: segmentControlCoord.x, to: segmentCoord.x, proportion: controlPointPullInPercentage })
  segmentControlCoord.y = weightedAverage({ from: segmentControlCoord.y, to: segmentCoord.y, proportion: controlPointPullInPercentage })

  return {
    path: bezierPath(segmentCoord, segmentControlCoord, labelControlCoord, labelCoord),
    pathType: 'bezier',
  }
}

const bezierPath = (segmentCoord, segmentControlCoord, labelControlCoord, labelCoord) => {
  const { x: sx, y: sy } = segmentCoord
  const { x: lx, y: ly } = labelCoord
  const { x: c1x, y: c1y } = segmentControlCoord
  const { x: c2x, y: c2y } = labelControlCoord
  return `M ${sx} ${sy} C ${c1x} ${c1y} ${c2x} ${c2y} ${lx} ${ly}`
}

// NB segmentAngle: the pie segment angle, measured from the x-axis when rotating clockwise
const getTangentLine = ({ x, y, segmentAngle }) => {
  let angleFromYAxis
  if (between(0, segmentAngle, 180)) { angleFromYAxis = segmentAngle - 90 }
  if (between(180, segmentAngle, 360)) { angleFromYAxis = segmentAngle - 270 }

  const { xProportion, yProportion } = getAngleProportions(angleFromYAxis)
  return [
    { x: x - 2000 * xProportion, y: y - 2000 * yProportion },
    { x: x + 2000 * xProportion, y: y + 2000 * yProportion },
  ]
}

// TODO: add doc image
// TODO: test ?
// NB angle param: uses pie angle system : what angle does the line make with the x-axis when measuring angle moving from xaxis clockwise to the line ?
const getLine = ({ x, y, angle }) => {
  const { xProportion, yProportion } = getAngleProportions(angle)
  return [
    { x: x - 2000 * xProportion, y: y - 2000 * yProportion },
    { x: x + 2000 * xProportion, y: y + 2000 * yProportion },
  ]
}

const getAngleProportions = (angleInDegrees) => ({
  xProportion: Math.cos(toRadians(angleInDegrees)),
  yProportion: Math.sin(toRadians(angleInDegrees)),
})

const getSegmentAndLabelCoords = ({ labelData }) => {
  return {
    segmentCoord: labelData.segmentMidpointCoord,
    labelCoord: labelData.lineConnectorCoord,
  }
}

const getControlCoordinates = ({ labelData, segmentLeanAngle, labelLeanAngle, labelMaxLineAngle }) => {
  const { segmentCoord, labelCoord } = getSegmentAndLabelCoords({ labelData })
  const { segmentControlCoord, labelControlCoord } = getLeanedBoxCoordinates({ labelData, segmentLeanAngle, labelLeanAngle })
  const midPointBetweenSegmentAndLabelCoord = { x: (segmentCoord.x + labelCoord.x) / 2, y: (segmentCoord.y + labelCoord.y) / 2 }
  const curviness = Math.min(1, labelData.labelLineAngle / labelMaxLineAngle)

  const newSegmentControlCoord = {
    x: weightedAverage({ from: midPointBetweenSegmentAndLabelCoord.x, to: segmentControlCoord.x, proportion: curviness }),
    y: weightedAverage({ from: midPointBetweenSegmentAndLabelCoord.y, to: segmentControlCoord.y, proportion: curviness }),
  }

  const newLabelControlCoord = {
    x: weightedAverage({ from: midPointBetweenSegmentAndLabelCoord.x, to: labelControlCoord.x, proportion: curviness }),
    y: weightedAverage({ from: midPointBetweenSegmentAndLabelCoord.y, to: labelControlCoord.y, proportion: curviness }),
  }

  return {
    segmentControlCoord: newSegmentControlCoord,
    labelControlCoord: newLabelControlCoord,
  }
}

const getLeanedBoxCoordinates = ({ labelData, segmentLeanAngle, labelLeanAngle }) => {
  const segmentAngle = labelData.segmentAngleMidpoint
  const segmentCoord = labelData.segmentMidpointCoord
  const labelCoord = labelData.lineConnectorCoord

  const tangentLine = getTangentLine({ ...segmentCoord, segmentAngle })
  const shiftedTangentLine = getTangentLine({ ...labelCoord, segmentAngle })

  const labelGreaterThanSegment = (labelData.inTopLeftQuadrant && labelData.labelAngle > 270)
    ? false
    : labelData.labelAngle > labelData.segmentAngleMidpoint
  const leanDirection = (labelGreaterThanSegment) ? 1 : -1

  const labelAngleAfterLean = segmentAngle + (labelLeanAngle * leanDirection)
  const segmentAngleAfterLean = segmentAngle + (segmentLeanAngle * leanDirection)

  const radialLineWithLean = getLine({ ...segmentCoord, angle: segmentAngleAfterLean })
  const shiftedRadialLineWithLean = getLine({ ...labelCoord, angle: labelAngleAfterLean })

  const segmentControlCoord = computeIntersectionOfTwoLines(radialLineWithLean, shiftedTangentLine)
  const labelControlCoord = computeIntersectionOfTwoLines(shiftedRadialLineWithLean, tangentLine)

  return { segmentControlCoord, labelControlCoord }
}

const getSegmentControlPointPullInPercentage = ({ labelData, canvasHeight, segmentPullInProportionMin, segmentPullInProportionMax }) => {
  const { y: sy } = labelData.segmentMidpointCoord
  const { y: ly } = labelData.lineConnectorCoord
  const labelAboveSegment = ly < sy
  const variablePortionOfPullIn = segmentPullInProportionMax - segmentPullInProportionMin

  let maximumPossibleDelta = (labelAboveSegment) ? sy : canvasHeight - sy
  const relativeHeightDifferenceBetweenSegmentAndLabel = Math.min(1, Math.abs(sy - ly) / maximumPossibleDelta)
  return segmentPullInProportionMin + (variablePortionOfPullIn * relativeHeightDifferenceBetweenSegmentAndLabel)
}

const weightedAverage = ({ from, to, proportion }) => from * (1 - proportion) + to * proportion
