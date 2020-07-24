import math from '../../math'
import _ from "lodash";

module.exports = ({ labelData }) => {
  let segmentCoord = _.clone(labelData.segmentMidpointCoord)
  let labelCoord = labelData.lineConnectorCoord

  // stratagy: instead of a bezier curve with control points forming a rectangle,
  // lean the rectangle abit to make a rhomboid, this will make the connection angles not so sharp,
  // which is similar to the existing "basis interpolation" method for placing lines
  const segmentControlLeanDegrees = 30
  const labelControlLeanDegrees = 30

  // stratagy: vary pull in based vertical delta between segement and label
  const heightDifferenceBetweenSegmentAndLabelAsPercentageOfSpaceAboveSegment = (segmentCoord.y - labelCoord.y) / segmentCoord.y
  let controlPointPullInPercentage = 0.25 + (0.5 * heightDifferenceBetweenSegmentAndLabelAsPercentageOfSpaceAboveSegment)
  console.log({ controlPointPullInPercentage, segmentControlLeanDegrees, labelControlLeanDegrees })

  // tangent line interecting the segment coord
  const tangentLine = [
    segmentCoord,
    {
      // 1000 is arbitrary, just pick a point far away so we get a long line to ensure intersection
      x: segmentCoord.x + 1000 * Math.cos(math.toRadians(90 - labelData.segmentAngleMidpoint)),
      y: segmentCoord.y - 1000 * Math.sin(math.toRadians(90 - labelData.segmentAngleMidpoint))
    }
  ]

  // line from label heading down and right, parallel but above the radial line, intersecting label coord
  const shiftedRadialLine = [
    labelCoord,
    {
      // 1000 is arbitrary, just pick a point far away so we get a long line to ensure intersection
      x: labelCoord.x + 1000 * Math.cos(math.toRadians(labelData.segmentAngleMidpoint + labelControlLeanDegrees)),
      y: labelCoord.y + 1000 * Math.sin(math.toRadians(labelData.segmentAngleMidpoint + labelControlLeanDegrees))
    }
  ]

  const bezierLabelControlCoord = math.computeIntersection(shiftedRadialLine, tangentLine)

  // TODO
  const radialLineExtendingOut = [
    segmentCoord,
    {
      x: segmentCoord.x - 1000 * Math.cos(math.toRadians(labelData.segmentAngleMidpoint + segmentControlLeanDegrees)),
      y: segmentCoord.y - 1000 * Math.sin(math.toRadians(labelData.segmentAngleMidpoint + segmentControlLeanDegrees))
    }
  ]

  // TODO
  const shiftedTangentLine = [
    labelCoord,
    {
      // 1000 is arbitrary, just pick a point far away so we get a long line to ensure intersection
      x: labelCoord.x - 1000 * Math.cos(math.toRadians(90 - labelData.segmentAngleMidpoint)),
      y: labelCoord.y + 1000 * Math.sin(math.toRadians(90 - labelData.segmentAngleMidpoint))
    }
  ]

  const bezierSegmentControlCoord = math.computeIntersection(radialLineExtendingOut, shiftedTangentLine)

  /* Shorten distance to Bezier control point 1
     this provides a balance of:
      * the middle parts of lines dont overlap too much
      * it is clear which segment the line connects
   */

  // stratagy: vary pull in based on segmentAngle
  // let controlPointPullInPercentage = 0
  // if (between(0,labelData.segmentAngleMidpoint,30)) { controlPointPullInPercentage = 0.25 }
  // if (between(30,labelData.segmentAngleMidpoint,60)) { controlPointPullInPercentage = (0.25 + 0.4 * labelData.segmentAngleMidpoint / 60) }
  // if (between(60,labelData.segmentAngleMidpoint,90)) { controlPointPullInPercentage = 0.65 }

  bezierSegmentControlCoord.x += controlPointPullInPercentage * Math.abs(segmentCoord.x - bezierSegmentControlCoord.x)
  bezierSegmentControlCoord.y += controlPointPullInPercentage * Math.abs(segmentCoord.y - bezierSegmentControlCoord.y)

  // // attempt to move the first control point towards the label coord (didn't work)
  // bezierControlCoord1.x += 0.2 * Math.abs(labelCoord.x - bezierControlCoord1.x)
  // bezierControlCoord1.y -= 0.2 * Math.abs(labelCoord.y - bezierControlCoord1.y)

  const { x: sx, y: sy } = segmentCoord
  const { x: lx, y: ly } = labelCoord
  const { x: c1x, y: c1y } = bezierSegmentControlCoord
  const { x: c2x, y: c2y } = bezierLabelControlCoord

  return `M ${sx} ${sy} C ${c1x} ${c1y} ${c2x} ${c2y} ${lx} ${ly}`
}