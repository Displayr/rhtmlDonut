const DescendingOrderCollisionResolver = require('./DescendingOrderCollisionResolver')
const OuterLabel = require('../../outerLabel')
const computeCoordOnEllipse = require('../../utils/computeCoordOnEllipse')

// The resolver only ever talks to the canvas through the small interface that SegmentLabeller
// builds in extendCanvasInterface, so we can drive it headlessly by supplying that interface
// directly. getLabelSize is the only part that really needs a DOM (it measures text in an SVG), so
// here it is approximated with a fixed per character width.
//
// maxLabelWidth defaults to Infinity, which means "never wrap" - the simple single line
// approximation. Passing a finite value models what the real labeller does with labels.max.width:
// wrap the text and cap it at labels.max.lines. Label height grows with the line count, which is
// what makes wide labels crowd the label ellipse.
const buildStubCanvas = ({
  width = 600,
  height = 600,
  outerRadius = 150,
  labelOffset = 15,
  maxVerticalOffset = 60,
  charWidth = 0.5,
  maxLabelWidth = Infinity,
  maxLines = 6,
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
      const naturalWidth = labelText.length * fontSize * charWidth
      const lineCount = Math.min(maxLines, Math.max(1, Math.ceil(naturalWidth / maxLabelWidth)))
      return {
        lineHeight,
        height: lineCount * lineHeight,
        width: Math.min(naturalWidth, maxLabelWidth),
        labelTextLines: Array(lineCount).fill(labelText),
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
const buildLabelSet = ({ values, canvas, fontSize = 10, labelText = (index) => `Category ${index}` }) => {
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
      label: labelText(index),
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

const resolve = ({ values, canvasOptions, fontSize, labelText, budget = 100000 }) => {
  const canvas = buildStubCanvas(canvasOptions)
  const labelSet = buildLabelSet({ values, canvas, fontSize, labelText })

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

  it.each([40, 50, 70, 80, 90, 100])('terminates for %i equally sized segments', (segmentCount) => {
    const { result } = resolve({ values: Array(segmentCount).fill(10) })

    expect(result.outer.length).toBeGreaterThan(0)
  })

  // The same freeze, reached with an uneven distribution rather than a uniform one.
  it('terminates for a long tail of small segments', () => {
    const values = [100, 80, 60, 40].concat(Array(80).fill(1))

    const { result } = resolve({ values })

    expect(result.outer.length).toBeGreaterThan(0)
  })

  // RS-23152 follow on. Fixing the seam wrap stopped the counter clockwise sweep cycling on the
  // spot, but it did not bound the sweep. labelLineAngleExceededTooFarCounterClockWise only fires
  // while labelAngle < segmentAngleMidpoint, so once a label has wrapped past 0 that guard is
  // inert for the rest of the revolution and every revolution after it. Termination then depended
  // entirely on a collision free, in bounds slot existing somewhere on the lap, and when none does
  // the label walks laps forever.
  //
  // These are the geometries computePieLayoutDimensions derives for a donut of the given canvas
  // size at the stated labels.max.width, with every other setting left at its shipped default
  // (labels.max.lines 6, descending sort order, outer labels). Each case walks laps without the
  // revolution cap. Note the third is at the default labels.max.width of 0.3.
  describe('bounds the counter clockwise sweep to one revolution per label', () => {
    const longCategoryName = (index) => `Product Category Number ${index} Long Name`

    it.each([
      ['600x600 at labels.max.width 0.4', { outerRadius: 52, labelOffset: 6, maxVerticalOffset: 248, maxLabelWidth: 240 }, 40],
      ['600x600 at labels.max.width 0.35', { outerRadius: 79, labelOffset: 9, maxVerticalOffset: 221, maxLabelWidth: 210 }, 70],
      ['600x600 at the default labels.max.width of 0.3', { outerRadius: 107, labelOffset: 11, maxVerticalOffset: 193, maxLabelWidth: 180 }, 40],
      ['800x400 at labels.max.width 0.4', { width: 800, height: 400, outerRadius: 70, labelOffset: 8, maxVerticalOffset: 130, maxLabelWidth: 320 }, 70],
    ])('terminates for %s', (_name, canvasOptions, segmentCount) => {
      const { result } = resolve({
        values: Array(segmentCount).fill(10),
        canvasOptions,
        labelText: longCategoryName,
        budget: 200000,
      })

      expect(result.outer.length).toBeGreaterThan(0)
    })
  })

  // Defence in depth: even if some future change reintroduces a placement that fails to make
  // angular progress, no label may be walked more than once around the ellipse.
  it('never moves a single label more than once around the ellipse', () => {
    const canvas = buildStubCanvas()
    const labelSet = buildLabelSet({ values: Array(60).fill(10), canvas })
    const movesPerLabel = {}

    // 720 steps of 0.5 degrees is one full revolution. The count is deliberately cumulative across
    // the whole run - go() retries the layout once per extraHeight variation and each attempt runs
    // several sweeps - which makes this stricter than a per attempt bound rather than looser. This
    // layout settles in 107 moves for its busiest label, so the margin is wide, and reintroducing
    // the seam cycle blows the budget on the first attempt. Enforced as it goes rather than
    // asserted afterwards, so a regression fails the run instead of hanging it.
    const perLabelBudget = 720
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

    // every label was placed at least once, and none of them exceeded the budget above
    expect(Object.keys(movesPerLabel)).toHaveLength(60)
    expect(Math.max(...Object.values(movesPerLabel))).toBeLessThanOrEqual(perLabelBudget)
  })
})
