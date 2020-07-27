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

  // 8 cases. Likely some can be combined
  if (labelData.inTopLeftQuadrant) { return bezierCurveInTopLeft({ labelData, pieCenter, labelGreaterThanSegment }) }
  if (labelData.inTopRightQuadrant) { return bezierCurveInTopRight({ labelData, pieCenter, labelGreaterThanSegment }) }
  if (labelData.inBottomLeftQuadrant) { return bezierCurveInBottomLeft({ labelData, pieCenter, canvasHeight, labelGreaterThanSegment }) }
  if (labelData.inBottomRightQuadrant) { return bezierCurveInBottomRight({ labelData, pieCenter, canvasHeight, labelGreaterThanSegment }) }
}

const straightLine = ({ labelData }) => {
  const { x: sx, y: sy } = labelData.segmentMidpointCoord
  const { x: lx, y: ly } = labelData.lineConnectorCoord
  return { path: `M ${sx} ${sy} L ${lx} ${ly}`, pathType: 'straight' }
}

const bezierCurveInTopLeft = ({ labelData, pieCenter, labelGreaterThanSegment }) => {
  const {
    sx, sy, lx, ly,
    segmentCoord, labelCoord,
    segmentAngle,
  } = extractVars({ labelData })
  const controlPointPullInPercentage = getSegmentControlPointPullInPercentageForTopQuadrant({ labelData, pieCenter })

  const tangentLine = getTangentLine({ x: sx, y: sy, segmentAngle })
  const shiftedTangentLine = getTangentLine({ x: lx, y: ly, segmentAngle })

  const labelLeanAngle = (labelGreaterThanSegment) ? segmentAngle + labelControlLeanDegrees : segmentAngle - labelControlLeanDegrees
  const segmentLeanAngle = (labelGreaterThanSegment) ? segmentAngle + segmentControlLeanDegrees : segmentAngle - segmentControlLeanDegrees

  // line from label heading down and right, parallel but above the radial line, intersecting label coord
  const shiftedRadialLine = [
    labelCoord,
    {
      // 1000 is arbitrary, just pick a point far away so we get a long line to ensure intersection
      x: lx + 1000 * Math.cos(math.toRadians(labelLeanAngle)),
      y: ly + 1000 * Math.sin(math.toRadians(labelLeanAngle))
    }
  ]

  const labelControlCoord = math.computeIntersection(shiftedRadialLine, tangentLine)

  const radialLineExtendingOut = [
    segmentCoord,
    {
      x: sx - 1000 * Math.cos(math.toRadians(segmentLeanAngle)),
      y: sy - 1000 * Math.sin(math.toRadians(segmentLeanAngle))
    }
  ]

  const segmentControlCoord = math.computeIntersection(radialLineExtendingOut, shiftedTangentLine)

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

  const tangentLine = getTangentLine({ x: sx, y: sy, segmentAngle })
  const shiftedTangentLine = getTangentLine({ x: lx, y: ly, segmentAngle })

  const labelLeanAngle = (labelGreaterThanSegment) ? (180 - segmentAngle) - labelControlLeanDegrees : (180 - segmentAngle) + labelControlLeanDegrees
  const segmentLeanAngle = (labelGreaterThanSegment) ? (180 - segmentAngle) - segmentControlLeanDegrees : (180 - segmentAngle) + segmentControlLeanDegrees

  // line from label heading down and left, parallel but above the radial line, intersecting label coord
  const shiftedRadialLine = [
    labelCoord,
    {
      // 1000 is arbitrary, just pick a point far away so we get a long line to ensure intersection
      x: lx - 1000 * Math.cos(math.toRadians(labelLeanAngle)),
      y: ly + 1000 * Math.sin(math.toRadians(labelLeanAngle))
    }
  ]

  const labelControlCoord = math.computeIntersection(shiftedRadialLine, tangentLine)

  const radialLineExtendingOut = [
    segmentCoord,
    {
      x: sx + 1000 * Math.cos(math.toRadians(segmentLeanAngle)),
      y: sy - 1000 * Math.sin(math.toRadians(segmentLeanAngle))
    }
  ]

  const segmentControlCoord = math.computeIntersection(radialLineExtendingOut, shiftedTangentLine)

  segmentControlCoord.x += controlPointPullInPercentage * Math.abs(sx - segmentControlCoord.x)
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

  const tangentLine = getTangentLine({ x: sx, y: sy, segmentAngle })
  const shiftedTangentLine = getTangentLine({ x: lx, y: ly, segmentAngle })

  // TODO 180 + segmentAngle looks wrong
  const labelLeanAngle = (labelGreaterThanSegment) ? (180 + segmentAngle) + labelControlLeanDegrees : (180 + segmentAngle) - labelControlLeanDegrees
  const segmentLeanAngle = (labelGreaterThanSegment) ? (180 + segmentAngle) + segmentControlLeanDegrees : (180 + segmentAngle) - segmentControlLeanDegrees

  // line from label heading down and left, parallel but above the radial line, intersecting label coord
  const shiftedRadialLine = [
    labelCoord,
    {
      // 1000 is arbitrary, just pick a point far away so we get a long line to ensure intersection
      x: lx - 1000 * Math.cos(math.toRadians(labelLeanAngle)),
      y: ly - 1000 * Math.sin(math.toRadians(labelLeanAngle))
    }
  ]

  const labelControlCoord = math.computeIntersection(shiftedRadialLine, tangentLine)

  const radialLineExtendingOut = [
    segmentCoord,
    {
      x: sx + 1000 * Math.cos(math.toRadians(segmentLeanAngle)),
      y: sy + 1000 * Math.sin(math.toRadians(segmentLeanAngle))
    }
  ]

  const segmentControlCoord = math.computeIntersection(radialLineExtendingOut, shiftedTangentLine)

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
  // console.log(`${labelData._label} ${ controlPointPullInPercentage }`)

  //TODO: should not use the topLeft fns here, should rename it if it is indeed a correct usage
  const tangentLine = getTangentLine({ x: sx, y: sy, segmentAngle })
  const shiftedTangentLine = getTangentLine({ x: lx, y: ly, segmentAngle })

  const labelLeanAngle = Math.max(0,(labelGreaterThanSegment) ? (360 - segmentAngle) - labelControlLeanDegrees : (360 - segmentAngle) + labelControlLeanDegrees)
  const segmentLeanAngle = Math.max(0,(labelGreaterThanSegment) ? (360 - segmentAngle) - segmentControlLeanDegrees : (360 - segmentAngle) + segmentControlLeanDegrees)

  // line from label heading down and left, parallel but above the radial line, intersecting label coord
  const shiftedRadialLine = [
    labelCoord,
    {
      x: lx + 1000 * Math.cos(math.toRadians(labelLeanAngle)),
      y: ly - 1000 * Math.sin(math.toRadians(labelLeanAngle))
    }
  ]

  const labelControlCoord = math.computeIntersection(shiftedRadialLine, tangentLine)

  const radialLineExtendingOut = [
    segmentCoord,
    {
      x: sx - 1000 * Math.cos(math.toRadians(segmentLeanAngle)),
      y: sy + 1000 * Math.sin(math.toRadians(segmentLeanAngle))
    }
  ]

  const segmentControlCoord = math.computeIntersection(radialLineExtendingOut, shiftedTangentLine)

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
