import math from '../../../math'
const { toRadians, toDegrees } = math

/*
  https://owlcation.com/stem/Everything-About-Triangles-and-More-Isosceles-Equilateral-Scalene-Pythagoras-Sine-and-Cosine

  var naming is consistent with triangle math on link. a,b,c are sides, Ad,Bd,Cd, SEGd are angles in degrees. Ar,Br,Cr are angles in rads

  triangle in question:
    a - side from pie center to the "labels furthest allowable placement" on labelCircle - known length = outerRadius + labelOffset
    b - side from pie center to segmentMidPoint on outerCircle - known length = outerRadius
    c - side from segmentMidPoint to "labels furthest allowable placement"

  Approach:
    * start with knowns: A, a, b
    * get B using sine rule
    * get C knowing A+B+C=180
    * knowing C, segmentAngle, and a, i can now calculate the labelCoords at -80 and 80 degrees from radial line using standard right angle triangle trig

  TODO: implement this optimisation
  Optimisation: Cr only depends on labelMaxLineAngle, labelRadius, segmentRadius, and these are all fixed. So can calc that once
*/

const computeLabelLineMaxAngleCoords = ({
  pieCenter,
  segmentAngle : SEGd,
  labelMaxLineAngle,
  segmentRadius,
  labelRadius
}) => {
  const Ad = 180 - labelMaxLineAngle
  const a = labelRadius
  const b = segmentRadius

  // get B using sine rule
  const Br = Math.asin( b * Math.sin(toRadians(Ad)) / a )
  const Bd = toDegrees(Br)

  // get C using sum(angle) = 180
  const Cd = 180 - Bd - Ad
  const Cr = toRadians(Cd)

  // get c using cosine rule
  const c = Math.sqrt(a * a + b * b - 2 * a * b * Math.cos(Cr))

  if (true) {
    const counterClockwiseAngle = SEGd - Cd
    let counterClockwiseCoord = {
      x: pieCenter.x - a * Math.cos(toRadians(counterClockwiseAngle)),
      y: pieCenter.y - a * Math.sin(toRadians(counterClockwiseAngle))
    }
    const clockwiseAngle = SEGd + Cd
    let clockwiseCoord = {
      x: pieCenter.x - a * Math.cos(toRadians(clockwiseAngle)),
      y: pieCenter.y - a * Math.sin(toRadians(clockwiseAngle))
    }

    return { counterClockwiseCoord, clockwiseCoord }
  }
  return { counterClockwiseCoord: null, clockwiseCoord: null }
}

module.exports = computeLabelLineMaxAngleCoords