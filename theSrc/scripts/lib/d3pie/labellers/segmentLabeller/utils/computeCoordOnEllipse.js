import {toRadians} from '../../../math'

// https://math.stackexchange.com/questions/22064/calculating-a-point-that-lies-on-an-ellipse-given-an-angle?newreg
const getPointOnLabelEllipse = ({ angle, radialWidth, radialHeight, pieCenter }) => {
  const labelAngleRads = toRadians(angle)
  const slope = Math.tan(labelAngleRads)
  const inLeftHalf = (angle < 90 || angle > 270)
  const inTopHalf = (angle < 180)

  let xOffsetAbs = radialWidth * radialHeight / Math.sqrt(radialHeight * radialHeight + radialWidth * radialWidth * slope * slope)
  let yOffsetAbs = radialWidth * radialHeight / Math.sqrt(radialWidth * radialWidth + (radialHeight * radialHeight / (slope * slope)))

  let xOffset = (inLeftHalf) ? -1 * xOffsetAbs : xOffsetAbs
  let yOffset = (inTopHalf) ? -1 * yOffsetAbs : yOffsetAbs

  return {
    x: pieCenter.x + xOffset,
    y: pieCenter.y + yOffset
  }
}

module.exports = getPointOnLabelEllipse