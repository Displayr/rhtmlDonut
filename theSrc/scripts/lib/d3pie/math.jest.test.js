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
