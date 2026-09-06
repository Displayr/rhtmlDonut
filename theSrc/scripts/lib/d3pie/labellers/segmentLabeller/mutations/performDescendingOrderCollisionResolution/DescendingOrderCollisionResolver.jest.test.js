const DescendingOrderCollisionResolver = require('./DescendingOrderCollisionResolver')
const OuterLabel = require('../../outerLabel')
const computeCoordOnEllipse = require('../../utils/computeCoordOnEllipse')

// The resolver only ever talks to the canvas through the small interface that SegmentLabeller
// builds in extendCanvasInterface, so we can drive it headlessly by supplying that interface
// directly. getLabelSize is the only part that really needs a DOM (it measures text in an SVG), so
// here it is approximated with a fixed per character width.
const buildStubCanvas = ({
  width = 600,
  height = 600,
  outerRadius = 150,
  labelOffset = 15,
  maxVerticalOffset = 60,
  charWidth = 0.5,
} = {}) => {
  const pieCenter = { x: width / 2, y: height / 2 }
  return {
    width,
    height,
    outerRadius,
    labelOffset,
    maxVerticalOffset,
    pieCenter,
    getLabelSize: ({ labelText, fontSize }) => {
      const lineHeight = fontSize * 1.2
      return {
        lineHeight,
        height: lineHeight,
        width: labelText.length * fontSize * charWidth,
        labelTextLines: [labelText],
      }
    },
    computeCoordOnEllipse: ({ angle, radialWidth, radialHeight }) => computeCoordOnEllipse({
      angle,
      radialWidth: radialWidth || outerRadius + labelOffset,
      radialHeight: radialHeight || outerRadius + labelOffset,
      pieCenter,
    }),
    labelIsInBounds: (label) =>
      (label.minX >= 0) && (label.maxX <= width) && (label.minY >= 0) && (label.maxY <= height),
  }
}

// Mirrors SegmentLabeller.buildLabels: segments are laid out in input order, and the resolver
// relies on that order being descending by value (id 0 is the largest label).
const buildLabelSet = ({ values, canvas, fontSize = 10 }) => {
  const canvasInterface = () => canvas
  const totalValue = values.reduce((total, value) => total + value, 0)
  let cumulativeValue = 0

  return values.map((value, index) => {
    const angleExtent = value * 360 / totalValue
    const angleStart = cumulativeValue * 360 / totalValue
    cumulativeValue += value

    return new OuterLabel({
      canvasInterface,
      color: '#333333',
      displayDecimals: 0,
      displayPercentage: true,
      fontFamily: 'arial',
      fontSize,
      proportion: value / totalValue,
      group: null,
      id: index,
      innerPadding: 1,
      label: `Category ${index}`,
      segmentAngleMidpoint: angleStart + angleExtent / 2,
      value,
    })
  })
}

// The resolver moves labels one angleIncrement at a time, so counting placements is a direct
// measure of how much work it did. A budget that throws keeps a runaway from hanging the test run
// the same way it hangs the browser.
const withLabelMovementBudget = (budget, fn) => {
  const place = OuterLabel.prototype.placeLabelViaConnectorCoordOnEllipse
  let moves = 0
  OuterLabel.prototype.placeLabelViaConnectorCoordOnEllipse = function (...args) {
    moves++
    if (moves > budget) {
      throw new Error(`exceeded the budget of ${budget} label movements`)
    }
    return place.apply(this, args)
  }

  try {
    const result = fn()
    return { result, moves }
  } finally {
    OuterLabel.prototype.placeLabelViaConnectorCoordOnEllipse = place
  }
}

const resolve = ({ values, canvasOptions, fontSize, budget = 100000 }) => {
  const canvas = buildStubCanvas(canvasOptions)
  const labelSet = buildLabelSet({ values, canvas, fontSize })

  return withLabelMovementBudget(budget, () => new DescendingOrderCollisionResolver({
    labelSet,
    variant: { labelMaxLineAngle: 80, minProportion: 0.003 },
    invariant: { liftOffAngle: 30, outerPadding: 1 },
    canvas,
  }).go())
}

describe('DescendingOrderCollisionResolver', () => {
  it('places a label set that has no collisions without moving anything', () => {
    const { result, moves } = resolve({ values: Array(8).fill(10) })

    expect(result.outer).toHaveLength(8)
    // one placement per label for the initial layout, then nothing to resolve
    expect(moves).toEqual(8)
  })

  // RS-23152. With enough equally sized segments the largest label sits just clockwise of 0 degrees,
  // and the counter clockwise sweep pushes it across the seam. Before the fix the angle it was moved
  // to cycled 0 -> 360.5 -> 0 forever, so the sweep's `while` loop never terminated and the browser
  // tab locked up with "Page unresponsive".
  it('terminates when the counter clockwise sweep pushes the largest label past 0 degrees', () => {
    const { result } = resolve({ values: Array(60).fill(10) })

    expect(result.outer.length).toBeGreaterThan(0)
  })

  // The same freeze, reached with an uneven distribution rather than a uniform one.
  it.each([40, 50, 60, 70, 80, 90, 100])('terminates for %i equally sized segments', (segmentCount) => {
    const { result } = resolve({ values: Array(segmentCount).fill(10) })

    expect(result.outer.length).toBeGreaterThan(0)
  })

  it('terminates for a long tail of small segments', () => {
    const values = [100, 80, 60, 40].concat(Array(80).fill(1))

    const { result } = resolve({ values })

    expect(result.outer.length).toBeGreaterThan(0)
  })

  // Defence in depth: even if some future change reintroduces a placement that fails to make
  // angular progress, no label may be walked more than once around the ellipse.
  it('never moves a single label more than once around the ellipse', () => {
    const canvas = buildStubCanvas()
    const labelSet = buildLabelSet({ values: Array(60).fill(10), canvas })
    const movesPerLabel = {}

    // 720 steps of 0.5 degrees is one full revolution. go() retries the layout once per extraHeight
    // variation and each attempt runs several sweeps, so allow a generous multiple of that while
    // still catching a label that is stuck going round and round. The budget is enforced as it goes
    // rather than asserted afterwards, so a regression fails the run instead of hanging it.
    const perLabelBudget = 720 * 20
    const place = OuterLabel.prototype.placeLabelViaConnectorCoordOnEllipse
    OuterLabel.prototype.placeLabelViaConnectorCoordOnEllipse = function (...args) {
      movesPerLabel[this.id] = (movesPerLabel[this.id] || 0) + 1
      if (movesPerLabel[this.id] > perLabelBudget) {
        throw new Error(`label ${this.id} was moved more than ${perLabelBudget} times`)
      }
      return place.apply(this, args)
    }

    try {
      new DescendingOrderCollisionResolver({
        labelSet,
        variant: { labelMaxLineAngle: 80, minProportion: 0.003 },
        invariant: { liftOffAngle: 30, outerPadding: 1 },
        canvas,
      }).go()
    } finally {
      OuterLabel.prototype.placeLabelViaConnectorCoordOnEllipse = place
    }

    expect(Object.keys(movesPerLabel).length).toBeGreaterThan(0)
  })
})
