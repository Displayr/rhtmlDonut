import _ from 'lodash'
import { lineLength } from '../../../geometryUtils'
import { labelIntersect } from '../labelUtils'
import { getAngleOfCoord, inclusiveBetween, rotate, toDegrees } from '../../math'

const quadrants = [4, 1, 2, 3] // TODO I never want to see a numeric quadrant again

// looks like some things are added directly and not accounted for still (e.g. pieCenter dont have get / set ) - same with innerlabel

class OuterLabel {
  constructor ({
    canvasInterface,
    color,
    displayDecimals = 0,
    displayPercentage = false,
    fontFamily,
    fontSize,
    fractionalValue,
    group,
    id,
    innerPadding,
    label,
    linePadding = 2, // space between lineConnector and labelText
    prefix = '',
    segmentAngleMidpoint,
    suffix = '',
    value,
  }) {
    const hemisphere = (segmentAngleMidpoint < 90 || segmentAngleMidpoint >= 270) ? 'left' : 'right'
    const inLeftHalf = (segmentAngleMidpoint < 90 || segmentAngleMidpoint >= 270)
    const inTopHalf = (segmentAngleMidpoint <= 180)
    const segmentQuadrantIndex = Math.floor(4 * segmentAngleMidpoint / 360)
    const segmentQuadrant = quadrants[segmentQuadrantIndex]

    const formattedLabelValue = this.formatLabelText({
      displayPercentage,
      displayDecimals,
      prefix,
      suffix,
      fractionalValue,
      value,
    })
    const labelText = `${label}: ${formattedLabelValue}`

    this.interface = {
      canvas: canvasInterface,
    }

    this._invariant = {
      inLeftHalf,
      inTopHalf,
      color,
      fractionalValue,
      fontFamily,
      group,
      hemisphere,
      id,
      innerPadding,
      label,
      labelText,
      linePadding,
      segmentAngleMidpoint,
      segmentQuadrant,
      value,
    }

    this._variant = {
      angleBetweenLabelAndRadial: null,
      fontSize,
      height: null,
      isBottomApexLabel: false,
      isLifted: false,
      isTopApexLabel: false,
      labelAngle: segmentAngleMidpoint,
      labelShown: true,
      labelTextLines: null,
      lineHeight: null,
      lineConnectorCoord: {},
      topLeftCoord: {},
      width: null,
    }

    // strictly for debugging. Add label to root of class so we can inspect easier
    this._label = label

    this.positionHistoryStackSize = 5
    this.positionHistory = []

    this.computeDimensions()
  }

  computeDimensions () {
    return Object.assign(this, this.interface.canvas().getLabelSize(this))
  }

  formatLabelText ({
    displayPercentage,
    displayDecimals,
    prefix,
    suffix,
    fractionalValue,
    value,
  }) {
    let val = (displayPercentage)
      ? (fractionalValue * 100).toFixed(displayDecimals)
      : (value).toFixed(displayDecimals)

    if (prefix) {
      val = prefix + val
    }
    if (suffix) {
      val = val + suffix
    }
    return val
  }

  /// /////////////////////////
  // Label movement calls

  placeLabelViaTopPoint (coord) {
    const { width, linePadding, hemisphere } = this
    this.topLeftCoord = (hemisphere === 'left')
      ? { x: coord.x - width - linePadding, y: coord.y }
      : { x: coord.x + linePadding, y: coord.y }
    this.lineConnectorCoord = this._computeLineConnectorCoord()
    this.labelAngle = getAngleOfCoord(this.pieCenter, this.lineConnectorCoord)
    this._variant.angleBetweenLabelAndRadial = this._computeAngleBetweenLabelLineAndRadialLine()
  }

  placeLabelViaBottomPoint (coord) {
    const { width, height, linePadding, hemisphere } = this
    this.topLeftCoord = (hemisphere === 'left')
      ? { x: coord.x - width - linePadding, y: coord.y - height }
      : { x: coord.x + linePadding, y: coord.y - height }
    this.lineConnectorCoord = this._computeLineConnectorCoord()
    this.labelAngle = getAngleOfCoord(this.pieCenter, this.lineConnectorCoord)
    this._variant.angleBetweenLabelAndRadial = this._computeAngleBetweenLabelLineAndRadialLine()
  }

  placeLabelViaConnectorCoord (lineConnectorCoord) {
    if (this.isTopApexLabel) {
      this._placeLabelViaConnectorCoordOnTopApexLabel(lineConnectorCoord)
    } else if (this.isBottomApexLabel) {
      this._placeLabelViaConnectorCoordOnBottomApexLabel(lineConnectorCoord)
    } else if (this.linePointsToYOrigin) {
      this._placeLabelViaConnectorCoordOnNormalLabel(lineConnectorCoord)
    } else {
      this._placeLabelViaConnectorCoordOnNormalLabel(lineConnectorCoord)
    }
  }

  _placeLabelViaConnectorCoordOnTopApexLabel (lineConnectorCoord) {
    this.topLeftCoord = {
      x: lineConnectorCoord.x - this.width / 2,
      y: lineConnectorCoord.y - this.height,
    }
    this.lineConnectorCoord = lineConnectorCoord
    this.labelAngle = getAngleOfCoord(this.pieCenter, this.lineConnectorCoord)
    this._variant.angleBetweenLabelAndRadial = this._computeAngleBetweenLabelLineAndRadialLine()
  }

  _placeLabelViaConnectorCoordOnBottomApexLabel (lineConnectorCoord) {
    this.topLeftCoord = {
      x: lineConnectorCoord.x - this.width / 2,
      y: lineConnectorCoord.y,
    }
    this.lineConnectorCoord = lineConnectorCoord
    this.labelAngle = getAngleOfCoord(this.pieCenter, this.lineConnectorCoord)
    this._variant.angleBetweenLabelAndRadial = this._computeAngleBetweenLabelLineAndRadialLine()
  }

  _placeLabelViaConnectorCoordOnNormalLabel (lineConnectorCoord) {
    const { lineHeight, innerPadding, labelTextLines } = this
    const numTextRows = labelTextLines.length

    // place the line connection at mid height of the nearest (i.e. closest to center) row of label text
    const topLeftY = (lineConnectorCoord.y < this.pieCenter.y)
      ? lineConnectorCoord.y - 0.5 * lineHeight - (lineHeight * (numTextRows - 1)) - (innerPadding * (numTextRows - 1))
      : lineConnectorCoord.y - 0.5 * lineHeight

    const { width, linePadding } = this
    this.topLeftCoord = (lineConnectorCoord.x < this.pieCenter.x)
      ? { x: lineConnectorCoord.x - linePadding - width, y: topLeftY }
      : { x: lineConnectorCoord.x + linePadding, y: topLeftY }
    this.lineConnectorCoord = lineConnectorCoord
    this.labelAngle = getAngleOfCoord(this.pieCenter, this.lineConnectorCoord)
    this._variant.angleBetweenLabelAndRadial = this._computeAngleBetweenLabelLineAndRadialLine()
  }

  placeLabelViaConnectorCoordOnEllipse (lineConnectorCoord, labelAngle) {
    const { height, innerPadding, labelTextLines, lineHeight, linePadding, width } = this
    const numTextRows = labelTextLines.length

    const nearTopOrBottom = inclusiveBetween(75, labelAngle, 105) || inclusiveBetween(255, labelAngle, 285)

    if (nearTopOrBottom) {
      const leftX = lineConnectorCoord.x - width / 2
      const topY = (lineConnectorCoord.y < this.pieCenter.y)
        ? lineConnectorCoord.y - linePadding - height
        : lineConnectorCoord.y
      this.topLeftCoord = { x: leftX, y: topY }
    } else {
      // place the line connection at mid height of the nearest (i.e. closest to center) row of label text
      const topLeftY = (lineConnectorCoord.y < this.pieCenter.y)
        ? lineConnectorCoord.y - 0.5 * lineHeight - (lineHeight * (numTextRows - 1)) - (innerPadding * (numTextRows - 1))
        : lineConnectorCoord.y - 0.5 * lineHeight
      this.topLeftCoord = (lineConnectorCoord.x < this.pieCenter.x)
        ? { x: lineConnectorCoord.x - linePadding - width, y: topLeftY }
        : { x: lineConnectorCoord.x + linePadding, y: topLeftY }
    }

    this.lineConnectorCoord = lineConnectorCoord
    this.labelAngle = labelAngle
    this._variant.angleBetweenLabelAndRadial = this._computeAngleBetweenLabelLineAndRadialLine()
  }

  /* assumptions/constraints:
    * cannot reset the first placement, only the second and onward
   */
  reset () {
    if (this.positionHistory.length === 0) {
      throw new Error('cannot reset label that has not been moved')
    }
    const previousPosition = this.positionHistory.shift()
    this.placeLabelViaConnectorCoord(previousPosition)
    // NB the placeLabelViaConnectorCoord will push the "coord being reset" onto the stack which we do not want
    this.positionHistory.shift()
  }

  // End Label movement calls
  /// /////////////////////////

  // NB _computeTopLeftCoord must be inverse of _computeLineConnectorCoord
  _computeLineConnectorCoord () {
    const numTextRows = this.labelTextLines.length

    // place the line connection at mid height of the nearest (i.e. closest to center) row of label text
    let lineConnectorCoord = {}
    lineConnectorCoord.y = (this.inTopHalf)
      ? this.topY + (numTextRows - 1) * (this.innerPadding + this.lineHeight) + 0.5 * this.lineHeight
      : this.topY + 0.5 * this.lineHeight

    lineConnectorCoord.x = (this.inLeftHalf)
      ? this.rightX + this.linePadding
      : this.leftX - this.linePadding

    return lineConnectorCoord
  }

  // https://owlcation.com/stem/Everything-About-Triangles-and-More-Isosceles-Equilateral-Scalene-Pythagoras-Sine-and-Cosine (Cosine Rule)
  _computeAngleBetweenLabelLineAndRadialLine () {
    const { lineConnectorCoord, pieCenter, outerRadius, segmentAngleMidpoint } = this

    const pointAtZeroDegrees = { x: pieCenter.x - outerRadius, y: pieCenter.y }
    const outerRadiusCoord = rotate(pointAtZeroDegrees, pieCenter, segmentAngleMidpoint)

    // consider a triangle with three sides
    // a : line from pieCenter to outerRadiusCoord
    // b : line from outerRadiusCoord to lineConnectorCoord
    // c : line from lineConnectorCoord to pieCenter

    // we know all three coords, therefore can calculate lengths of each line
    // we can use cosine rule to solve for angle C. We want the inverse angle of C, so just subtract from 180

    const a = lineLength(pieCenter, outerRadiusCoord)
    const b = lineLength(outerRadiusCoord, lineConnectorCoord)
    const c = lineLength(lineConnectorCoord, pieCenter)

    // Cosine rule : C = Arccos ((a2 + b2 - c2) / 2ab)
    const angleCinRadians = Math.acos((Math.pow(a, 2) + Math.pow(b, 2) - Math.pow(c, 2)) / (2 * a * b))
    const angleCInDegrees = toDegrees(angleCinRadians)

    return (_.isNaN(angleCInDegrees)) ? 0 : 180 - angleCInDegrees
  }

  intersectsWith (anotherLabel, within = 0) {
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

  validateCoord ({ x, y } = {}) {
    const badX = (_.isNull(x) || _.isUndefined(x) || _.isNaN(x))
    const badY = (_.isNull(x) || _.isUndefined(x) || _.isNaN(x))
    if (badX || badY) { throw new Error(`Invalid coord for label '${this.label}': { x: ${x}, y: ${y} }`) }
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

  get topY () { return this.topLeftCoord.y }
  get bottomY () { return this.bottomLeftCoord.y }
  get leftX () { return this.topLeftCoord.x }
  get rightX () { return this.topRightCoord.x }

  // compatability for RBush
  get minY () { return this.topLeftCoord.y }
  get maxY () { return this.bottomLeftCoord.y }
  get minX () { return this.topLeftCoord.x }
  get maxX () { return this.topRightCoord.x }

  // accessors for invariants

  get color () { return this._invariant.color }
  get fontFamily () { return this._invariant.fontFamily }
  get fractionalValue () { return this._invariant.fractionalValue }

  // NB left includes, right excludes
  // NB top includes, bottom excludes
  get hemisphere () { return this._invariant.hemisphere }
  get inTopHalf () { return this._invariant.inTopHalf }
  get inBottomHalf () { return !this._invariant.inTopHalf }
  get inLeftHalf () { return this._invariant.inLeftHalf }
  get inRightHalf () { return !this._invariant.inLeftHalf }

  get inTopLeftQuadrant () { return this.inTopHalf && this.inLeftHalf }
  get inTopRightQuadrant () { return this.inTopHalf && this.inRightHalf }
  get inBottomLeftQuadrant () { return this.inBottomHalf && this.inLeftHalf }
  get inBottomRightQuadrant () { return this.inBottomHalf && this.inRightHalf }

  get linePointsToYOrigin () {
    return (this.inLeftHalf)
      ? (_.has(this._variant, 'lineConnectorCoord') && this.lineConnectorCoord.x > this.segmentMidpointCoord.x)
      : (_.has(this._variant, 'lineConnectorCoord') && this.lineConnectorCoord.x < this.segmentMidpointCoord.x)
  }

  get lineConnectorOffsetFromBottom () {
    return (this.inTopHalf)
      ? 0.5 * this.lineHeight
      : this.height - 0.5 * this.lineHeight
  }

  get lineConnectorOffsetFromTop () {
    return (this.inBottomHalf)
      ? 0.5 * this.lineHeight
      : this.height - 0.5 * this.lineHeight
  }

  get id () { return this._invariant.id }
  get innerPadding () { return this._invariant.innerPadding }
  get label () { return this._invariant.label }
  get labelText () { return this._invariant.labelText }
  get shortText () { return this._invariant.label.substr(0, 8) }
  get linePadding () { return this._invariant.linePadding }
  get segmentAngleMidpoint () { return this._invariant.segmentAngleMidpoint }
  get segmentQuadrant () { return this._invariant.segmentQuadrant }
  get value () { return this._invariant.value }

  get segmentMidpointCoord () {
    if (!_.has(this._invariant, 'segmentMidpointCoord')) {
      const pieCenter = this.interface.canvas().pieCenter
      const coordAtZeroDegrees = { x: pieCenter.x - this.outerRadius, y: pieCenter.y }
      this._invariant.segmentMidpointCoord = rotate(coordAtZeroDegrees, pieCenter, this.segmentAngleMidpoint)
    }
    return this._invariant.segmentMidpointCoord
  }

  get pieCenter () { return this.interface.canvas().pieCenter }
  get outerRadius () { return this.interface.canvas().outerRadius }
  get labelOffset () { return this.interface.canvas().labelOffset }

  // accessors and mutators for variants

  get isLifted () { return this._variant.isLifted }
  set isLifted (newValue) { this._variant.isLifted = newValue }

  get fontSize () { return this._variant.fontSize }
  set fontSize (newValue) {
    this._variant.fontSize = newValue
    this.computeDimensions()
  }

  get height () { return this._variant.height }
  set height (newValue) { this._variant.height = newValue }

  get isTopApexLabel () { return this._variant.isTopApexLabel }
  set isTopApexLabel (newValue) { this._variant.isTopApexLabel = newValue }

  get isBottomApexLabel () { return this._variant.isBottomApexLabel }
  set isBottomApexLabel (newValue) { this._variant.isBottomApexLabel = newValue }

  get lineHeight () { return this._variant.lineHeight }
  set lineHeight (newValue) { this._variant.lineHeight = newValue }

  get labelAngle () { return this._variant.labelAngle }
  set labelAngle (newValue) { this._variant.labelAngle = newValue }

  get labelShown () { return this._variant.labelShown }
  set labelShown (newValue) { this._variant.labelShown = newValue }

  get labelTextLines () { return this._variant.labelTextLines }
  set labelTextLines (newValue) { this._variant.labelTextLines = newValue }

  get lineConnectorCoord () { return this._variant.lineConnectorCoord }
  set lineConnectorCoord (newValue) {
    this.validateCoord(newValue)

    const newPositionHistoryLength = this.positionHistory.unshift(this._variant.lineConnectorCoord)
    if (newPositionHistoryLength > this.positionHistoryStackSize) {
      this.positionHistory = this.positionHistory.slice(0, this.positionHistoryStackSize)
    }

    this._variant.lineConnectorCoord = newValue
  }

  get topLeftCoord () { return this._variant.topLeftCoord }
  set topLeftCoord (newValue) {
    this.validateCoord(newValue)
    this._variant.topLeftCoord = newValue
  }

  get width () { return this._variant.width }
  set width (newValue) { this._variant.width = newValue }

  get labelLineAngle () { return this._variant.angleBetweenLabelAndRadial }
}

module.exports = OuterLabel
