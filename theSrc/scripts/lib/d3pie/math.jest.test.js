const math = require('./math')

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