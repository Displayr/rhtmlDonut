import { computeIntersection, between, toRadians } from '../../math'

// draw a bezier curve from the segment to the label
// * start with a rectangle with the segment and label at opposite points ("kitty corner") on the rectangle
// * optionally lean the rectangle based on segmentControlLeanDegrees and labelControlLeanDegrees
//   * this is dont to reduce overlap of neighboring bezier lines
// optionally "pull back the segment control point"
//   * this is dont to reduce overlap of neighboring bezier lines
// now draw the bezier curve using the point above the segment point as the first control point, and the point below the label as the second control point

// NB on the use '1000' in line generation. It is arbitrary, just pick a point far away so we get a long line to ensure intersections

const segmentControlLeanDegrees = 30 // TODO configure
const labelControlLeanDegrees = 0 // TODO configure

module.exports = ({ labelData, pieCenter, canvasHeight }) => {
  if (labelData.inTopLeftQuadrant) { return bezierCurveInTopLeft({ labelData, pieCenter, canvasHeight }) }
  if (labelData.inTopRightQuadrant) { return bezierCurveInTopRight({ labelData, pieCenter, canvasHeight }) }
  if (labelData.inBottomLeftQuadrant) { return bezierCurveInBottomLeft({ labelData, pieCenter, canvasHeight }) }
  if (labelData.inBottomRightQuadrant) { return bezierCurveInBottomRight({ labelData, pieCenter, canvasHeight }) }
}

const bezierCurveInTopLeft = ({ labelData, pieCenter, canvasHeight }) => {
  const { segmentCoord, labelCoord } = getSegmentAndLabelCoords({ labelData })
  const { segmentControlCoord, labelControlCoord } = getControlCoordinates({ labelData })
  const controlPointPullInPercentage = getSegmentControlPointPullInPercentage({ labelData, pieCenter, canvasHeight })

  segmentControlCoord.x += controlPointPullInPercentage * Math.abs(segmentCoord.x - segmentControlCoord.x)
  segmentControlCoord.y += controlPointPullInPercentage * Math.abs(segmentCoord.y - segmentControlCoord.y)

  return {
    path: bezierPath(segmentCoord, segmentControlCoord, labelControlCoord, labelCoord),
    pathType: 'bezier-topleft'
  }
}

const bezierCurveInTopRight = ({ labelData, pieCenter, canvasHeight }) => {
  const { segmentCoord, labelCoord } = getSegmentAndLabelCoords({ labelData })
  const { segmentControlCoord, labelControlCoord } = getControlCoordinates({ labelData })
  const controlPointPullInPercentage = getSegmentControlPointPullInPercentage({ labelData, pieCenter, canvasHeight })

  segmentControlCoord.x -= controlPointPullInPercentage * Math.abs(segmentCoord.x - segmentControlCoord.x)
  segmentControlCoord.y += controlPointPullInPercentage * Math.abs(segmentCoord.y - segmentControlCoord.y)

  return {
    path: bezierPath(segmentCoord, segmentControlCoord, labelControlCoord, labelCoord),
    pathType: 'bezier-topright'
  }
}

const bezierCurveInBottomRight = ({ labelData, pieCenter, canvasHeight }) => {
  const { segmentCoord, labelCoord } = getSegmentAndLabelCoords({ labelData })
  const { segmentControlCoord, labelControlCoord } = getControlCoordinates({ labelData })
  const controlPointPullInPercentage = getSegmentControlPointPullInPercentage({ labelData, pieCenter, canvasHeight })

  segmentControlCoord.x -= controlPointPullInPercentage * Math.abs(segmentCoord.x - segmentControlCoord.x)
  segmentControlCoord.y -= controlPointPullInPercentage * Math.abs(segmentCoord.y - segmentControlCoord.y)

  return {
    path: bezierPath(segmentCoord, segmentControlCoord, labelControlCoord, labelCoord),
    pathType: 'bezier-bottomright'
  }
}

const bezierCurveInBottomLeft = ({ labelData, pieCenter, canvasHeight }) => {
  const { segmentCoord, labelCoord } = getSegmentAndLabelCoords({ labelData })
  const { segmentControlCoord, labelControlCoord } = getControlCoordinates({ labelData })
  const controlPointPullInPercentage = getSegmentControlPointPullInPercentage({ labelData, pieCenter, canvasHeight })

  segmentControlCoord.x += controlPointPullInPercentage * Math.abs(segmentCoord.x - segmentControlCoord.x)
  segmentControlCoord.y -= controlPointPullInPercentage * Math.abs(segmentCoord.y - segmentControlCoord.y)

  return {
    path: bezierPath(segmentCoord, segmentControlCoord, labelControlCoord, labelCoord),
    pathType: 'bezier-bottomleft'
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
  if (between(0,segmentAngle,180)) { angleFromYAxis = segmentAngle - 90 }
  if (between(180,segmentAngle,360)) { angleFromYAxis = segmentAngle - 270 }

  const { xProportion, yProportion } = getAngleProportions(angleFromYAxis)
  return [
    { x: x - 1000 * xProportion, y: y - 1000 * yProportion },
    { x: x + 1000 * xProportion, y: y + 1000 * yProportion }
  ]
}

// TODO: add doc image
// TODO: test ?
// NB angle param: uses pie angle system : what angle does the line make with the x-axis when measuring angle moving from xaxis clockwise to the line ?
const getLine = ({ x, y, angle }) => {
  const { xProportion, yProportion } = getAngleProportions(angle)
  return [
    { x: x - 1000 * xProportion, y: y - 1000 * yProportion },
    { x: x + 1000 * xProportion, y: y + 1000 * yProportion }
  ]
}

const getAngleProportions = (angleInDegrees) => ({
  xProportion: Math.cos(toRadians(angleInDegrees)),
  yProportion: Math.sin(toRadians(angleInDegrees))
})

const getSegmentAndLabelCoords = ({ labelData }) => {
  return {
    segmentCoord: labelData.segmentMidpointCoord,
    labelCoord: labelData.lineConnectorCoord
  }
}

const getControlCoordinates = ({ labelData }) => {
  const segmentAngle = labelData.segmentAngleMidpoint
  const segmentCoord = labelData.segmentMidpointCoord
  const labelCoord = labelData.lineConnectorCoord

  const labelGreaterThanSegment = (labelData.inTopLeftQuadrant && labelData.labelAngle > 270)
    ? false
    : labelData.labelAngle > labelData.segmentAngleMidpoint

  const labelLeanAngle = segmentAngle + (labelControlLeanDegrees * (labelGreaterThanSegment) ? 1 : -1)
  const segmentLeanAngle = segmentAngle + (segmentControlLeanDegrees * (labelGreaterThanSegment) ? 1 : -1)

  const tangentLine = getTangentLine({ ...segmentCoord, segmentAngle })
  const shiftedTangentLine = getTangentLine({ ...labelCoord, segmentAngle })

  const radialLine = getLine({ ...segmentCoord, angle: segmentLeanAngle })
  const shiftedRadialLine = getLine({ ...labelCoord, angle: labelLeanAngle })

  const segmentControlCoord = computeIntersection(radialLine, shiftedTangentLine)
  const labelControlCoord = computeIntersection(shiftedRadialLine, tangentLine)

  return { segmentControlCoord, labelControlCoord }
}

const getSegmentControlPointPullInPercentage = ({ labelData, pieCenter, canvasHeight }) => {
  if (labelData.this.inTopHalf) { return getSegmentControlPointPullInPercentageForTopQuadrant ({ labelData, pieCenter }) }
  else { return getSegmentControlPointPullInPercentageForBottomQuadrant({ labelData, pieCenter, canvasHeight }) }
})

const getSegmentControlPointPullInPercentageForTopQuadrant = ({ labelData, pieCenter }) => {
  const { y: sy } = labelData.segmentMidpointCoord
  const { y: ly } = labelData.lineConnectorCoord

  // strategy: vary pull in based vertical delta between segment and label
  const labelAboveSegment = ly < sy
  const relativeHeightDifferenceBetweenSegmentAndLabel = (labelAboveSegment)
    ? Math.min(1, (sy - ly) / sy)
    : Math.min(1, (ly - sy) / (pieCenter.y - sy))
  return 0.25 + (0.5 * relativeHeightDifferenceBetweenSegmentAndLabel)
}

const getSegmentControlPointPullInPercentageForBottomQuadrant = ({ labelData, pieCenter, canvasHeight }) => {
  const { y: sy } = labelData.segmentMidpointCoord
  const { y: ly } = labelData.lineConnectorCoord

  // strategy: vary pull in based vertical delta between segment and label
  const labelAboveSegment = ly < sy
  const relativeHeightDifferenceBetweenSegmentAndLabel = (labelAboveSegment)
    ? Math.min(1, (sy - ly) / (sy - pieCenter.y))
    : Math.min(1, (ly - sy) / (canvasHeight - sy))
  return 0.25 + (0.5 * relativeHeightDifferenceBetweenSegmentAndLabel)
}
