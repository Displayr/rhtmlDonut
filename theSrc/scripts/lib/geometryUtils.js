
// https://stackoverflow.com/questions/306316/determine-if-two-rectangles-overlap-each-other
function rectIntersect (r1, r2) {
  const r1x2 = r1.x + r1.width
  const r1y2 = r1.y + r1.height
  const r2x2 = r2.x + r2.width
  const r2y2 = r2.y + r2.height

  const twoIsRightOfOne = (r2.x > r1x2)
  const twoIsLeftOfOne = (r2x2 < r1.x)
  const twoIsAboveOne = (r2y2 < r1.y)
  const twoIsBelowOne = (r2.y > r1y2)

  const intersects = !(twoIsRightOfOne || twoIsLeftOfOne || twoIsAboveOne || twoIsBelowOne)
  return intersects
}

function rectXaboveY (r1, r2) {
  return r1.y + r1.height < r2.y
}

function rectXbelowY (r1, r2) {
  return r2.y + r2.height < r1.y
}

function lineLength (c1, c2) {
  return Math.sqrt(Math.pow(c2.x - c1.x, 2) + Math.pow(c2.y - c1.y, 2))
}

module.exports = {
  lineLength,
  rectIntersect,
  rectXaboveY,
  rectXbelowY
}
