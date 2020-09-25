import { lineLength } from '../../../geometryUtils'
import { labelIntersect } from '../labelUtils'

const _ = require('lodash')
const math = require('../../math')

class InnerLabel {
  static fromOuterLabel (label) {
    return new InnerLabel({
      variants: label._variant,
      invariants: label._invariant,
    })
  }

  constructor ({
    variants,
    invariants,
  }) {
    this._invariant = invariants
    this._variant = variants
  }

  // NB TODO dont think this works
  toString () {
    return this.label
  }

  // NB _computeTopLeftCoord must be inverse of _computeLineConnectorCoord
  _computeLineConnectorCoord () {
    const { height, width, hemisphere, topLeftCoord } = this

    const lineConnectorCoord = {}
    lineConnectorCoord.y = topLeftCoord.y + 0.5 * height

    lineConnectorCoord.x = (hemisphere === 'right')
      ? topLeftCoord.x + width + 2
      : topLeftCoord.x - 2

    return lineConnectorCoord
  }

  // NB _computeTopLeftCoord must be inverse of _computeLineConnectorCoord
  _computeTopLeftCoord () {
    const { height, width, hemisphere, lineConnectorCoord } = this

    const topLeftCoord = {}
    topLeftCoord.y = lineConnectorCoord.y - 0.5 * height

    topLeftCoord.x = (hemisphere === 'right')
      ? lineConnectorCoord.x - width - 2
      : lineConnectorCoord.x + 2

    return topLeftCoord
  }

  placeAlongFitLine (lineConnectorCoord) {
    this.lineConnectorCoord = lineConnectorCoord
    this.topLeftCoord = this._computeTopLeftCoord()
    this.labelAngle = math.getAngleOfCoord(this.pieCenter, this.lineConnectorCoord)
    this.angleBetweenLabelAndRadial = this._computeAngleBetweenLabelLineAndRadialLine()
  }

  placeLabelViaTopPoint (coord) {
    const { width, hemisphere } = this
    this.topLeftCoord = (hemisphere === 'right')
      ? { x: coord.x - width, y: coord.y }
      : { x: coord.x, y: coord.y }
    this.lineConnectorCoord = this._computeLineConnectorCoord()
    this.labelAngle = math.getAngleOfCoord(this.pieCenter, this.lineConnectorCoord)
    this.angleBetweenLabelAndRadial = this._computeAngleBetweenLabelLineAndRadialLine()
  }

  placeLabelViaBottomPoint (coord) {
    const { width, height, hemisphere } = this
    this.topLeftCoord = (hemisphere === 'right')
      ? { y: coord.y - height, x: coord.x - width }
      : { y: coord.y - height, x: coord.x }
    this.lineConnectorCoord = this._computeLineConnectorCoord()
    this.labelAngle = math.getAngleOfCoord(this.pieCenter, this.lineConnectorCoord)
    this.angleBetweenLabelAndRadial = this._computeAngleBetweenLabelLineAndRadialLine()
  }

  // https://owlcation.com/stem/Everything-About-Triangles-and-More-Isosceles-Equilateral-Scalene-Pythagoras-Sine-and-Cosine (Cosine Rule)
  _computeAngleBetweenLabelLineAndRadialLine () {
    const { lineConnectorCoord, pieCenter, innerRadius, angle } = this

    const pointAtZeroDegrees = { x: pieCenter.x - innerRadius, y: pieCenter.y }
    const innerRadiusCoord = math.rotate(pointAtZeroDegrees, pieCenter, angle)

    // consider a triangle with three sides
    // a : line from pieCenter to innerRadiusCoord
    // b : line from innerRadiusCoord to lineConnectorCoord
    // c : line from lineConnectorCoord to pieCenter

    // we know all three coords, therefore can calculate lengths of each line
    // we can use cosine rule to solve for angle C. We want the inverse angle of C, so just subtract from 180

    const a = lineLength(pieCenter, innerRadiusCoord)
    const b = lineLength(innerRadiusCoord, lineConnectorCoord)
    const c = lineLength(lineConnectorCoord, pieCenter)

    // Cosine rule : C = Arccos ((a2 + b2 - c2) / 2ab)
    const angleCinRadians = Math.acos((Math.pow(a, 2) + Math.pow(b, 2) - Math.pow(c, 2)) / (2 * a * b))
    const angleCInDegrees = math.toDegrees(angleCinRadians)

    return (_.isNaN(angleCInDegrees)) ? 0 : angleCInDegrees
  }

  intersectsWith (anotherLabel, within) {
    return labelIntersect(this, anotherLabel, within)
  }

  isHigherThan (anotherLabel) {
    return this.topLeftCoord.y < anotherLabel.topLeftCoord.y
  }

  isCompletelyAbove (anotherLabel) {
    return this.topLeftCoord.y + this.height < anotherLabel.topLeftCoord.y
  }

  isLowerThan (anotherLabel) {
    return this.topLeftCoord.y > anotherLabel.topLeftCoord.y
  }

  isCompletelyBelow (anotherLabel) {
    return this.topLeftCoord.y > anotherLabel.topLeftCoord.y + anotherLabel.height
  }

  // convenience methods

  get hide () { return !this._variant.labelShown }

  get topRightCoord () {
    return {
      x: this.topLeftCoord.x + this.width,
      y: this.topLeftCoord.y,
    }
  }

  get bottomLeftCoord () {
    return {
      x: this.topLeftCoord.x,
      y: this.topLeftCoord.y + this.height,
    }
  }

  get bottomRightCoord () {
    return {
      x: this.topLeftCoord.x + this.width,
      y: this.topLeftCoord.y + this.height,
    }
  }

  // compatability for RBush
  get minY () { return this.topLeftCoord.y }
  get maxY () { return this.bottomLeftCoord.y }
  get minX () { return this.topLeftCoord.x }
  get maxX () { return this.topRightCoord.x }


  // accessors for invariants

  get color () { return this._invariant.color }
  get fontFamily () { return this._invariant.fontFamily }
  get fractionalValue () { return this._invariant.fractionalValue }
  get hemisphere () { return this._invariant.hemisphere }
  get id () { return this._invariant.id }
  get label () { return this._invariant.label }
  get labelText () { return this._invariant.labelText }
  get shortText () { return this._invariant.label.substr(0, 8) }
  get angle () { return this._invariant.segmentAngleMidpoint }
  get segmentAngleMidpoint () { return this._invariant.segmentAngleMidpoint } // TODO try to deprecate this in favour of angle
  get value () { return this._invariant.value }

  // accessors and mutators for variants

  get fontSize () { return this._variant.fontSize }
  set fontSize (newValue) { this._variant.fontSize = newValue }

  get height () { return this._variant.height }
  set height (newValue) { this._variant.height = newValue }

  get innerLabelRadius () { return this._variant.innerLabelRadius }
  set innerLabelRadius (newValue) { this._variant.innerLabelRadius = newValue }

  get innerRadius () { return this._variant.innerRadius }
  set innerRadius (newValue) { this._variant.innerRadius = newValue }

  get labelAngle () { return this._variant.labelAngle }
  set labelAngle (newValue) { this._variant.labelAngle = newValue }

  get labelShown () { return this._variant.labelShown }
  set labelShown (newValue) { this._variant.labelShown = newValue }

  get labelTextLines () { return this._variant.labelTextLines }
  set labelTextLines (newValue) { this._variant.labelTextLines = newValue }

  get lineConnectorCoord () { return this._variant.lineConnectorCoord }
  set lineConnectorCoord (newValue) { this._variant.lineConnectorCoord = newValue }

  get pieCenter () { return this._variant.pieCenter }
  set pieCenter (newValue) { this._variant.pieCenter = newValue }

  get topLeftCoord () { return this._variant.topLeftCoord }
  set topLeftCoord (newValue) { this._variant.topLeftCoord = newValue }

  get width () { return this._variant.width }
  set width (newValue) { this._variant.width = newValue }

  get labelPositionSummary () {
    return [
      `label ${this.shortText}(${this.labelAngle.toFixed(2)})`,
      `x: ${this.minX.toFixed(2)}-${this.maxX.toFixed(2)}`,
      `y: ${this.minY.toFixed(2)}-${this.maxY.toFixed(2)}`,
    ].join(' ')
  }
}

module.exports = InnerLabel
