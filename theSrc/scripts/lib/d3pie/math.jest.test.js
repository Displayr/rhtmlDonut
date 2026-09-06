const math = require('./math')

describe('math.normaliseAngle', () => {
  it('leaves angles already in [0, 360) untouched', () => {
    expect(math.normaliseAngle(0)).toEqual(0)
    expect(math.normaliseAngle(0.5)).toEqual(0.5)
    expect(math.normaliseAngle(180)).toEqual(180)
    expect(math.normaliseAngle(359.5)).toEqual(359.5)
  })

  it('wraps angles at or above 360 back into range', () => {
    expect(math.normaliseAngle(360)).toEqual(0)
    expect(math.normaliseAngle(360.5)).toEqual(0.5)
    expect(math.normaliseAngle(720)).toEqual(0)
  })

  // NB the reason this fn exists. The previous implementation returned `360 - angle` for negatives,
  // which sends -0.5 to 360.5 (i.e. further counter clockwise past the seam rather than just below
  // it). See RS-23152.
  it('wraps negative angles back into range', () => {
    expect(math.normaliseAngle(-0.5)).toEqual(359.5)
    expect(math.normaliseAngle(-1)).toEqual(359)
    expect(math.normaliseAngle(-90)).toEqual(270)
    expect(math.normaliseAngle(-360)).toEqual(0)
    expect(math.normaliseAngle(-360.5)).toEqual(359.5)
  })

  // RS-23152: stepping counter clockwise by a fixed increment must always make progress. The old
  // implementation formed a closed cycle across the seam (0 -> 360.5 -> 0 -> ...), so the collision
  // resolver's `while` loop could never terminate.
  it('stepping counter clockwise across the seam always makes progress', () => {
    const increment = 0.5
    let angle = 2
    const visited = new Set()
    for (let step = 0; step < 720; step++) {
      angle = math.normaliseAngle(angle - increment)
      expect(visited.has(angle)).toBe(false)
      visited.add(angle)
    }
  })
})

describe('math.angleAbsoluteDifference', () => {
  it('simple', () => {
    expect(math.angleAbsoluteDifference(1, 2)).toEqual(1)
    expect(math.angleAbsoluteDifference(1.5, 6.7)).toEqual(5.2)
    expect(math.angleAbsoluteDifference(10, 20)).toEqual(10)
    expect(math.angleAbsoluteDifference(20, 10)).toEqual(10)
  })

  it('wrapping', () => {
    expect(math.angleAbsoluteDifference(350, 10)).toEqual(20)
    expect(math.angleAbsoluteDifference(10, 350)).toEqual(20)
    expect(math.angleAbsoluteDifference(0, 350)).toEqual(10)
    expect(math.angleAbsoluteDifference(0, 10)).toEqual(10)
  })

  it('edge cases', () => {
    expect(math.angleAbsoluteDifference(1, 1)).toEqual(0)
    expect(math.angleAbsoluteDifference(180, 180)).toEqual(0)
    expect(math.angleAbsoluteDifference(0, 0)).toEqual(0)
  })
})

// (r, cx, cy, slope, y0)
describe('math.computeIntersectionOfLineAndCircle', () => {
  it('lines through middle yeilds two intersections', () => {
    expect(math.computeIntersectionOfLineAndCircle({ r: 5, cx: 0, cy: 0, slope: 0.01, y0: 0 })).toEqual([
      { x: 4.999750018748438, y: 0.04999750018748438 },
      { x: -4.999750018748438, y: -0.04999750018748438 },
    ])

    expect(math.computeIntersectionOfLineAndCircle({ r: 5, cx: 0, cy: 0, slope: 1, y0: 0 })).toEqual([
      { x: 3.5355339059327378, y: 3.5355339059327378 },
      { x: -3.5355339059327378, y: -3.5355339059327378 },
    ])

    expect(math.computeIntersectionOfLineAndCircle({ r: 5, cx: 0, cy: 0, slope: 100, y0: 0 })).toEqual([
      { x: 0.049997500187484376, y: 4.999750018748437 },
      { x: -0.049997500187484376, y: -4.999750018748437 },
    ])
  })

  it('tangent line on circle perimeter yield one intersections', () => {
    expect(math.computeIntersectionOfLineAndCircle({ r: 5, cx: 0, cy: 0, slope: 0.000001, y0: 5 })).toEqual([{ x: 0, y: 5 }])
  })

  it('line beyond circle yield zero intersections', () => {
    expect(math.computeIntersectionOfLineAndCircle({ r: 5, cx: 0, cy: 0, slope: 0.000001, y0: 6 })).toEqual([])
  })
})
