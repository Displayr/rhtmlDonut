let math = {

  toRadians: function (degrees) {
    return degrees * (Math.PI / 180)
  },

  toDegrees: function (radians) {
    return radians * (180 / Math.PI)
  },

  getTotalPieSize: function (data) {
    let totalSize = 0
    for (let i = 0; i < data.length; i++) {
      totalSize += data[i].value
    }
    return totalSize
  },

  // let pieCenter = math.getPieCenter();
  getPieTranslateCenter: function (pieCenter) {
    return 'translate(' + pieCenter.x + ',' + pieCenter.y + ')'
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
    const {x, y} = pointToBeRotated
    const {x: xm, y: ym} = originPointToRotateAround
    const angleInRadians = math.toRadians(angleInDegrees)

    // subtract reference point, so that reference point is translated to origin and add it in the end again
    let xr = (x - xm) * Math.cos(angleInRadians) - (y - ym) * Math.sin(angleInRadians) + xm
    let yr = (x - xm) * Math.sin(angleInRadians) + (y - ym) * Math.cos(angleInRadians) + ym

    return {x: xr, y: yr}
  },

// https://stackoverflow.com/questions/385305/efficient-maths-algorithm-to-calculate-intersections
  computeIntersection: function ([{x: x1, y: y1}, {x: x2, y: y2}], [{x: x3, y: y3}, {x: x4, y: y4}]) {
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

      return {x, y}
    }
  },

  getAngleOfCoord (pieCenter, outerCoord) {
    const xDiff = outerCoord.x - pieCenter.x
    const yDiff = outerCoord.y - pieCenter.y
    let angle = (Math.atan2(yDiff, xDiff) * 180 / Math.PI) - 180
    if (angle < 0) { angle += 360 }

    return angle
  }
}

module.exports = math
