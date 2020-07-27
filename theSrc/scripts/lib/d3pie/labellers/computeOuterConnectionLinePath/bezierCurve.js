import math from '../../math'

// strategy: instead of a bezier curve with control points forming a rectangle,
// lean the rectangle a bit to make a rhomboid, this will make the connection angles not so sharp,
// which is similar to the existing "basis interpolation" method for placing lines

/* Shorten distance to Bezier control point 1
   this provides a balance of:
    * the middle parts of lines dont overlap too much
    * it is clear which segment the line connects
 */

// NB on the use '1000' in line generation. It is arbitrary, just pick a point far away so we get a long line to ensure intersections

const segmentControlLeanDegrees = 30 // TODO configure
const labelControlLeanDegrees = 0 // TODO configure

module.exports = ({ labelData, pieCenter, canvasHeight }) => {
  const labelGreaterThanSegment = (labelData.inTopLeftQuadrant && labelData.labelAngle > 270)
    ? false
    : labelData.labelAngle > labelData.segmentAngleMidpoint

  if (labelData.inTopLeftQuadrant) { return bezierCurveInTopLeft({ labelData, pieCenter, labelGreaterThanSegment }) }
  if (labelData.inTopRightQuadrant) { return bezierCurveInTopRight({ labelData, pieCenter, labelGreaterThanSegment }) }
  if (labelData.inBottomLeftQuadrant) { return bezierCurveInBottomLeft({ labelData, pieCenter, canvasHeight, labelGreaterThanSegment }) }
  if (labelData.inBottomRightQuadrant) { return bezierCurveInBottomRight({ labelData, pieCenter, canvasHeight, labelGreaterThanSegment }) }
}


const bezierCurveInTopLeft = ({ labelData, pieCenter, labelGreaterThanSegment }) => {
  const {
    sx, sy, lx, ly,
    segmentCoord, labelCoord,
    segmentAngle,
  } = extractVars({ labelData })
  const controlPointPullInPercentage = getSegmentControlPointPullInPercentageForTopQuadrant({ labelData, pieCenter })

  const labelLeanAngle = segmentAngle + (labelControlLeanDegrees * (labelGreaterThanSegment) ? 1 : -1)
  const segmentLeanAngle = segmentAngle + (segmentControlLeanDegrees * (labelGreaterThanSegment) ? 1 : -1)

  const tangentLine = getTangentLine({ x: sx, y: sy, segmentAngle })
  const shiftedTangentLine = getTangentLine({ x: lx, y: ly, segmentAngle })

  const shiftedRadialLine = getLine({ ...labelCoord, angle: labelLeanAngle })
  const radialLine = getLine({ ...segmentCoord, angle: segmentLeanAngle })

  const segmentControlCoord = math.computeIntersection(radialLine, shiftedTangentLine)
  const labelControlCoord = math.computeIntersection(shiftedRadialLine, tangentLine)

  segmentControlCoord.x += controlPointPullInPercentage * Math.abs(sx - segmentControlCoord.x)
  segmentControlCoord.y += controlPointPullInPercentage * Math.abs(sy - segmentControlCoord.y)

  return {
    path: bezierPath(segmentCoord, segmentControlCoord, labelControlCoord, labelCoord),
    pathType: 'bezier-topleft'
  }
}

const bezierCurveInTopRight = ({ labelData, pieCenter, labelGreaterThanSegment }) => {
  const {
    sx, sy, lx, ly,
    segmentCoord, labelCoord,
    segmentAngle,
  } = extractVars({ labelData })
  const controlPointPullInPercentage = getSegmentControlPointPullInPercentageForTopQuadrant({ labelData, pieCenter })

  const labelLeanAngle = segmentAngle + (labelControlLeanDegrees * (labelGreaterThanSegment) ? 1 : -1)
  const segmentLeanAngle = segmentAngle + (segmentControlLeanDegrees * (labelGreaterThanSegment) ? 1 : -1)

  const tangentLine = getTangentLine({ x: sx, y: sy, segmentAngle })
  const shiftedTangentLine = getTangentLine({ x: lx, y: ly, segmentAngle })

  const shiftedRadialLine = getLine({ ...labelCoord, angle: labelLeanAngle })
  const radialLine = getLine({ ...segmentCoord, angle: segmentLeanAngle })

  const labelControlCoord = math.computeIntersection(shiftedRadialLine, tangentLine)
  const segmentControlCoord = math.computeIntersection(radialLine, shiftedTangentLine)

  segmentControlCoord.x -= controlPointPullInPercentage * Math.abs(sx - segmentControlCoord.x)
  segmentControlCoord.y += controlPointPullInPercentage * Math.abs(sy - segmentControlCoord.y)

  return {
    path: bezierPath(segmentCoord, segmentControlCoord, labelControlCoord, labelCoord),
    pathType: 'bezier-topright'
  }
}

const bezierCurveInBottomRight = ({ labelData, pieCenter, canvasHeight, labelGreaterThanSegment }) => {
  const {
    sx, sy, lx, ly,
    segmentCoord, labelCoord,
    segmentAngle,
  } = extractVars({ labelData })
  const controlPointPullInPercentage = getSegmentControlPointPullInPercentageForBottomQuadrant({ labelData, pieCenter, canvasHeight })

  const labelLeanAngle = segmentAngle + (labelControlLeanDegrees * (labelGreaterThanSegment) ? 1 : -1)
  const segmentLeanAngle = segmentAngle + (segmentControlLeanDegrees * (labelGreaterThanSegment) ? 1 : -1)

  const tangentLine = getTangentLine({ x: sx, y: sy, segmentAngle })
  const shiftedTangentLine = getTangentLine({ x: lx, y: ly, segmentAngle })

  const shiftedRadialLine = getLine({ ...labelCoord, angle: labelLeanAngle })
  const radialLine = getLine({ ...segmentCoord, angle: segmentLeanAngle })

  const labelControlCoord = math.computeIntersection(shiftedRadialLine, tangentLine)
  const segmentControlCoord = math.computeIntersection(radialLine, shiftedTangentLine)

  segmentControlCoord.x -= controlPointPullInPercentage * Math.abs(sx - segmentControlCoord.x)
  segmentControlCoord.y -= controlPointPullInPercentage * Math.abs(sy - segmentControlCoord.y)

  return {
    path: bezierPath(segmentCoord, segmentControlCoord, labelControlCoord, labelCoord),
    pathType: 'bezier-bottomright'
  }
}

const bezierCurveInBottomLeft = ({ labelData, pieCenter, canvasHeight, labelGreaterThanSegment }) => {
  const {
    sx, sy, lx, ly,
    segmentCoord, labelCoord,
    segmentAngle,
  } = extractVars({ labelData })
  const controlPointPullInPercentage = getSegmentControlPointPullInPercentageForBottomQuadrant({ labelData, pieCenter, canvasHeight })

  const labelLeanAngle = segmentAngle + (labelControlLeanDegrees * (labelGreaterThanSegment) ? 1 : -1)
  const segmentLeanAngle = segmentAngle + (segmentControlLeanDegrees * (labelGreaterThanSegment) ? 1 : -1)

  const tangentLine = getTangentLine({ x: sx, y: sy, segmentAngle })
  const shiftedTangentLine = getTangentLine({ x: lx, y: ly, segmentAngle })

  const shiftedRadialLine = getLine({ ...labelCoord, angle: labelLeanAngle })
  const radialLine = getLine({ ...segmentCoord, angle: segmentLeanAngle })

  const labelControlCoord = math.computeIntersection(shiftedRadialLine, tangentLine)
  const segmentControlCoord = math.computeIntersection(radialLine, shiftedTangentLine)

  segmentControlCoord.x += controlPointPullInPercentage * Math.abs(sx - segmentControlCoord.x)
  segmentControlCoord.y -= controlPointPullInPercentage * Math.abs(sy - segmentControlCoord.y)

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
  xProportion: Math.cos(math.toRadians(angleInDegrees)),
  yProportion: Math.sin(math.toRadians(angleInDegrees))
})

const extractVars = ({ labelData }) => {
  const segmentCoord = labelData.segmentMidpointCoord
  const labelCoord = labelData.lineConnectorCoord
  const { x: sx, y: sy } = segmentCoord
  const { x: lx, y: ly } = labelCoord
  const segmentAngle = labelData.segmentAngleMidpoint

  return {
    sx,
    sy,
    lx,
    ly,
    segmentCoord,
    labelCoord,
    segmentAngle
  }
}

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

// TODO duplicated with outerLabeller.js
const between = (a, b, c) => (a <= b && b < c)
