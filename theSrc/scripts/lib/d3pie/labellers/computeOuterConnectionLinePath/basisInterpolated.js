module.exports = ({ labelData, basisInterpolationFunction }) => {
  let segmentCoord = labelData.segmentMidpointCoord
  let intermediateLineCoord = { type: 'mid' } // TODO do I need type 'mid' ?
  let labelCoord = labelData.lineConnectorCoord
  let pathType = null

  if (labelData.linePointsToYOrigin) {

    const totalXDelta = Math.abs(segmentCoord.x - labelCoord.x)
    const totalYDelta = Math.abs(segmentCoord.y - labelCoord.y)

    // approach 1: "y delta much (i.e. >10) larger than x delta"
    //  * The intermediateLineCoord takes us at a 45 degree angle from segment to the meridian running through the line connector, then we go straight up via the end point
    //  * If the y delta is not larger, this 45 degree approach causes us to overshoot the line connector, so we switch to approach 2
    // approach 2: "y delta not much larger than x delta"
    //  * The intermediateLineCoord takes us to 5 pixels inside of the lineConnector

    if (totalXDelta + 10 < totalYDelta) {
      pathType = 'basis-towardsYAxis-yDeltaMuchLarger'
      intermediateLineCoord = {
        x: (labelData.inLeftHalf)
          ? segmentCoord.x + totalXDelta
          : segmentCoord.x - totalXDelta,
        y: (labelData.inTopHalf)
          ? segmentCoord.y - totalXDelta
          : segmentCoord.y + totalXDelta,
      }
    } else {
      pathType = 'basis-towardsYAxis'
      intermediateLineCoord = {
        x: (labelData.inLeftHalf)
          ? segmentCoord.x + totalXDelta
          : segmentCoord.x - totalXDelta,
        y: (labelData.inTopHalf)
          ? segmentCoord.y - (totalYDelta - 10)
          : segmentCoord.y + (totalYDelta - 10),
      }
    }
  } else {
    pathType = 'basis-awayfromYAxis'
    intermediateLineCoord = {
      x: segmentCoord.x + (labelCoord.x - segmentCoord.x) * 0.5,
      y: segmentCoord.y + (labelCoord.y - segmentCoord.y) * 0.5,
    }
    switch (labelData.inTopHalf) {
      case true:
        intermediateLineCoord.y -= Math.abs(labelCoord.y - segmentCoord.y) * 0.25
        break
      case false:
        intermediateLineCoord.y += Math.abs(labelCoord.y - segmentCoord.y) * 0.25
        break
    }
  }

  return {
    path: basisInterpolationFunction([segmentCoord, intermediateLineCoord, labelCoord]),
    pathType
  }
}