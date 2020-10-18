const _ = require('lodash')

let math = {

  toRadians: degrees => degrees * (Math.PI / 180),
  toDegrees: radians => radians * (180 / Math.PI),

  getTotalValueOfDataSet: function (data) {
    let totalValue = 0
    for (let i = 0; i < data.length; i++) {
      totalValue += data[i].value
    }
    return totalValue
  },

  /**
   * Rotates a point (x, y) around an axis (xm, ym) by degrees (a).
   * @param x
   * @param y
   * @param xm
   * @param ym
   * @param angleInDegrees angle in degrees
   * @returns {Array}
   */
  rotate: function (pointToBeRotated, originPointToRotateAround, angleInDegrees) {
    const { x, y } = pointToBeRotated
    const { x: xm, y: ym } = originPointToRotateAround
    const angleInRadians = math.toRadians(angleInDegrees)

    // subtract reference point, so that reference point is translated to origin and add it in the end again
    let xr = (x - xm) * Math.cos(angleInRadians) - (y - ym) * Math.sin(angleInRadians) + xm
    let yr = (x - xm) * Math.sin(angleInRadians) + (y - ym) * Math.cos(angleInRadians) + ym

    return { x: xr, y: yr }
  },

  // https://stackoverflow.com/questions/385305/efficient-maths-algorithm-to-calculate-intersections
  computeIntersectionOfTwoLines: function ([{ x: x1, y: y1 }, { x: x2, y: y2 }], [{ x: x3, y: y3 }, { x: x4, y: y4 }]) {
    if (!_.every([x1, y1, x2, y2, x3, y3, x4, y4], x => !_.isNaN(x))) {
      throw new Error(`computeIntersectionOfTwoLines called with NaN`)
    }

    const x12 = x1 - x2
    const x34 = x3 - x4
    const y12 = y1 - y2
    const y34 = y3 - y4

    const c = x12 * y34 - y12 * x34

    if (Math.abs(c) < 0.01) {
      // No intersection
      return false
    } else {
      // Intersection
      const a = x1 * y2 - y1 * x2
      const b = x3 * y4 - y3 * x4

      const x = (a * x34 - b * x12) / c
      const y = (a * y34 - b * y12) / c

      return { x, y }
    }
  },

  // https://cscheng.info/2016/06/09/calculate-circle-line-intersection-with-javascript-and-p5js.html
  // NB not 100% sure if this is implemented correctly. Tests pass but when used in donut was not getting expected results (I think i was using it wrong but be warned)
  _computeXCoordsOfIntersectionOfLineAndCircle ({ r, cx, cy, slope, y0 }) {
    // circle: (x - cx)^2 + (y - cy)^2 = r^2
    // line: y = slope * x + y0
    // r: circle radius
    // cx: x value of circle centre
    // k: y value of circle centre
    // m: slope
    // y0: y-intercept

    const sq = x => x * x

    // get a, b, c values
    const a = 1 + sq(slope)
    const b = -cx * 2 + (slope * (y0 - cy)) * 2
    const c = sq(cx) + sq(y0 - cy) - sq(r)

    // get discriminant
    const d = sq(b) - 4 * a * c
    if (d >= 0) {
      // insert into quadratic formula
      var intersections = [
        (-b + Math.sqrt(sq(b) - 4 * a * c)) / (2 * a),
        (-b - Math.sqrt(sq(b) - 4 * a * c)) / (2 * a),
      ]
      if (Math.abs(d - 0) < 0.0001) {
        // only 1 intersection
        return [intersections[0]]
      }
      return intersections
    }
    // no intersection
    return []
  },

  computeIntersectionOfLineAndCircle ({ r, cx, cy, slope, y0 }) {
    const xCoords = math._computeXCoordsOfIntersectionOfLineAndCircle({ r, cx, cy, slope, y0 })
    return xCoords.map(x => ({ x, y: slope * x + y0 }))
  },

  getAngleOfCoord (pieCenter, outerCoord) {
    const xDiff = outerCoord.x - pieCenter.x
    const yDiff = outerCoord.y - pieCenter.y
    let angle = (Math.atan2(yDiff, xDiff) * 180 / Math.PI) - 180
    if (angle < 0) { angle += 360 }

    return angle
  },

  inclusiveBetween: (a, b, c) => (a <= b && b <= c),
  exclusiveBetween: (a, b, c) => (a < b && b < c),
  between: (a, b, c) => (a <= b && b < c),

  angleAbsoluteDifference: (a1, a2) => {
    const a1Greater = (a1 > a2)
    const options = [
      Math.abs(a1 - a2),
      (a1Greater) ? ((360 - a1) + a2) : ((360 - a2) + a1),
    ]
    return Math.min(...options)
  },

}

module.exports = math
