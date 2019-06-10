import { lineLength } from '../../geometryUtils'
import { labelIntersect } from './labelUtils'

const _ = require('lodash')
const math = require('../math')

class InnerLabel {
  static fromOuterLabel (label) {
    return new InnerLabel({
      variants: label._variants,
      invariants: label._invariants
    })
  }

  constructor ({
    variants,
    invariants
  }) {
    this._invariants = invariants
    this._variants = variants
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

  setTopMedialPoint (coord) {
    const { width, hemisphere } = this
    this.topLeftCoord = (hemisphere === 'right')
      ? { x: coord.x - width, y: coord.y }
      : { x: coord.x, y: coord.y }
    this.lineConnectorCoord = this._computeLineConnectorCoord()
    this.labelAngle = math.getAngleOfCoord(this.pieCenter, this.lineConnectorCoord)
    this.angleBetweenLabelAndRadial = this._computeAngleBetweenLabelLineAndRadialLine()
  }

  setBottomMedialPoint (coord) {
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
    const { lineConnectorCoord, pieCenter, innerRadius, segmentAngleMidpoint } = this

    const pointAtZeroDegrees = { x: pieCenter.x - innerRadius, y: pieCenter.y }
    const innerRadiusCoord = math.rotate(pointAtZeroDegrees, pieCenter, segmentAngleMidpoint)

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

  intersectsWith (anotherLabel) {
    return labelIntersect(this, anotherLabel)
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

  get hide () { return !this._variants.labelShown }

  get topRightCoord () {
    return {
      x: this.topLeftCoord.x + this.width,
      y: this.topLeftCoord.y
    }
  }

  get bottomLeftCoord () {
    return {
      x: this.topLeftCoord.x,
      y: this.topLeftCoord.y + this.height
    }
  }

  get bottomRightCoord () {
    return {
      x: this.topLeftCoord.x + this.width,
      y: this.topLeftCoord.y + this.height
    }
  }

  // accessors for invariants

  get color () { return this._invariants.color }
  get fontFamily () { return this._invariants.fontFamily }
  get fractionalValue () { return this._invariants.fractionalValue }
  get hemisphere () { return this._invariants.hemisphere }
  get id () { return this._invariants.id }
  get label () { return this._invariants.label }
  get labelText () { return this._invariants.labelText }
  get segmentAngleMidpoint () { return this._invariants.segmentAngleMidpoint }
  get segmentQuadrant () { return this._invariants.segmentQuadrant }
  get value () { return this._invariants.value }

  // accessors and mutators for variants

  get fontSize () { return this._variants.fontSize }
  set fontSize (newValue) { this._variants.fontSize = newValue }

  get height () { return this._variants.height }
  set height (newValue) { this._variants.height = newValue }

  get innerLabelRadius () { return this._variants.innerLabelRadius }
  set innerLabelRadius (newValue) { this._variants.innerLabelRadius = newValue }

  get innerRadius () { return this._variants.innerRadius }
  set innerRadius (newValue) { this._variants.innerRadius = newValue }

  get labelAngle () { return this._variants.labelAngle }
  set labelAngle (newValue) { this._variants.labelAngle = newValue }

  get labelShown () { return this._variants.labelShown }
  set labelShown (newValue) { this._variants.labelShown = newValue }

  get labelTextLines () { return this._variants.labelTextLines }
  set labelTextLines (newValue) { this._variants.labelTextLines = newValue }

  get lineConnectorCoord () { return this._variants.lineConnectorCoord }
  set lineConnectorCoord (newValue) { this._variants.lineConnectorCoord = newValue }

  get pieCenter () { return this._variants.pieCenter }
  set pieCenter (newValue) { this._variants.pieCenter = newValue }

  get topLeftCoord () { return this._variants.topLeftCoord }
  set topLeftCoord (newValue) { this._variants.topLeftCoord = newValue }

  get width () { return this._variants.width }
  set width (newValue) { this._variants.width = newValue }
}

module.exports = InnerLabel
