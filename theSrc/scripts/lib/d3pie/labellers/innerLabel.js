import { labelIntersect } from './labelUtils'

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
    const {height, width, hemisphere, topLeftCoord} = this

    const lineConnectorCoord = {}
    lineConnectorCoord.y = topLeftCoord.y + 0.5 * height

    lineConnectorCoord.x = (hemisphere === 'right')
      ? topLeftCoord.x + width + 2
      : topLeftCoord.x - 2

    return lineConnectorCoord
  }

  // NB _computeTopLeftCoord must be inverse of _computeLineConnectorCoord
  _computeTopLeftCoord () {
    const {height, width, hemisphere, lineConnectorCoord} = this

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
  }

  setTopTouchPoint (coord) {
    const {width, hemisphere} = this
    this.topLeftCoord = (hemisphere === 'right')
      ? { x: coord.x - width, y: coord.y }
      : { x: coord.x, y: coord.y }
    this.lineConnectorCoord = this._computeLineConnectorCoord()
  }

  setBottomTouchPoint (coord) {
    const {width, height, hemisphere} = this
    this.topLeftCoord = (hemisphere === 'right')
      ? { y: coord.y - height, x: coord.x - width }
      : { y: coord.y - height, x: coord.x }
    this.lineConnectorCoord = this._computeLineConnectorCoord()
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

  get labelAngle () { return this._variants.labelAngle }
  set labelAngle (newValue) { this._variants.labelAngle = newValue }

  get labelShown () { return this._variants.labelShown }
  set labelShown (newValue) { this._variants.labelShown = newValue }

  get labelTextLines () { return this._variants.labelTextLines }
  set labelTextLines (newValue) { this._variants.labelTextLines = newValue }

  get lineConnectorCoord () { return this._variants.lineConnectorCoord }
  set lineConnectorCoord (newValue) { this._variants.lineConnectorCoord = newValue }

  get topLeftCoord () { return this._variants.topLeftCoord }
  set topLeftCoord (newValue) { this._variants.topLeftCoord = newValue }

  get width () { return this._variants.width }
  set width (newValue) { this._variants.width = newValue }
}

module.exports = InnerLabel
