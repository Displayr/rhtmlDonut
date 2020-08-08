import { lineLength } from '../../geometryUtils'
import { labelIntersect } from './labelUtils'

const _ = require('lodash')
const quadrants = [4, 1, 2, 3]
const math = require('../math')

// looks like some things are added directly and not accounted for still (e.g. pieCenter dont have get / set ) - same with innerlabel

class OuterLabel {
  constructor ({
    segmentAngleMidpoint,
    color,
    fontSize,
    fontFamily,
    group,
    id,
    innerPadding,
    label,
    totalValue,
    value,
    linePadding = 2, // space between lineConnector and labelText
    displayPercentage = false,
    displayDecimals = 0,
    displayPrefix = '',
    displaySuffix = ''
  }) {
    const hemisphere = (segmentAngleMidpoint < 90 || segmentAngleMidpoint >= 270) ? 'left' : 'right'
    const inLeftHalf = (segmentAngleMidpoint < 90 || segmentAngleMidpoint >= 270)
    const inTopHalf = (segmentAngleMidpoint <= 180)
    const segmentQuadrantIndex = Math.floor(4 * segmentAngleMidpoint / 360)
    const segmentQuadrant = quadrants[segmentQuadrantIndex]
    const fractionalValue = value / totalValue

    const formattedLabelValue = this.formatLabelText({
      displayPercentage,
      displayDecimals,
      displayPrefix,
      displaySuffix,
      fractionalValue,
      value
    })
    const labelText = `${label}: ${formattedLabelValue}`

    this._invariants = {
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
      value
    }

    this._variants = {
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
      width: null
    }

    // strictly for debugging. Add label to root of class so we can inspect easier
    this._label = label

    // NB TODO useful for testing and verifying access patterns while refactoring, but ultimately not usable. Delete after archiving for later use
    // return new Proxy(this, {
    //   get (target, propertyName) {
    //     if (typeof propertyName === 'symbol') { return target[propertyName] }
    //     if (propertyName === '_invariants') { return target._invariants }
    //     if (propertyName === '_variants') { return target._variants }
    //
    //     if (propertyName === 'counts') { return target.counts }
    //
    //     if (!_.has(target.counts.get, propertyName)) { target.counts.get[propertyName] = 0 }
    //     target.counts.get[propertyName]++
    //
    //     if (OuterLabel.isValidSetter(propertyName)) { return target._variants[propertyName] }
    //     if (OuterLabel.isValidGetter(propertyName)) { return target._invariants[propertyName] }
    //     if (OuterLabel.isValidMethod(propertyName)) { return target[propertyName] }
    //     throw new Error(`Cannot get ${propertyName} from OuterLabel`)
    //   },
    //   set (target, propertyName, value) {
    //     if (typeof propertyName === 'symbol') {
    //       console.log('encountered set symbol. Bailing.')
    //       throw new Error('cannot set symbol on label')
    //     }
    //
    //     if (!_.has(target.counts.set, propertyName)) { target.counts.set[propertyName] = 0 }
    //     target.counts.set[propertyName]++
    //
    //     if (OuterLabel.isValidSetter(propertyName)) {
    //       target._variants[propertyName] = value
    //       return true
    //     }
    //
    //     throw new Error(`Cannot set ${propertyName} on OuterLabel`)
    //   }
    // })
  }

  // these facts are not available at constructor time, so add them later via calling addLayoutFacts
  addLayoutFacts ({ segmentMidpointCoord, pieCenter, innerRadius, outerRadius, labelOffset }) {
    _.assign(this._invariants, { segmentMidpointCoord, pieCenter, innerRadius, outerRadius, labelOffset })
  }

  // NB TODO dont think this works
  toString () {
    return this.label
  }

  formatLabelText ({
    displayPercentage,
    displayDecimals,
    displayPrefix,
    displaySuffix,
    fractionalValue,
    value
  }) {
    let val = (displayPercentage)
      ? (fractionalValue * 100).toFixed(displayDecimals)
      : (value).toFixed(displayDecimals)

    if (displayPrefix) {
      val = displayPrefix + val
    }
    if (displaySuffix) {
      val = val + displaySuffix
    }
    return val
  }

  /// /////////////////////////
  // Label movement calls

  moveStraightUpBy (verticalOffset) {
    this.topLeftCoord.y -= verticalOffset
    this.lineConnectorCoord = this._computeLineConnectorCoord()
    this.labelAngle = math.getAngleOfCoord(this.pieCenter, this.lineConnectorCoord)
    this._variants.angleBetweenLabelAndRadial = this._computeAngleBetweenLabelLineAndRadialLine()
  }

  moveStraightDownBy (verticalOffset) {
    this.topLeftCoord.y += verticalOffset
    this.lineConnectorCoord = this._computeLineConnectorCoord()
    this.labelAngle = math.getAngleOfCoord(this.pieCenter, this.lineConnectorCoord)
    this._variants.angleBetweenLabelAndRadial = this._computeAngleBetweenLabelLineAndRadialLine()
  }

  setTopMedialPoint (coord) {
    const { width, linePadding, hemisphere } = this
    this.topLeftCoord = (hemisphere === 'left')
      ? { x: coord.x - width - linePadding, y: coord.y }
      : { x: coord.x + linePadding, y: coord.y }
    this.lineConnectorCoord = this._computeLineConnectorCoord()
    this.labelAngle = math.getAngleOfCoord(this.pieCenter, this.lineConnectorCoord)
    this._variants.angleBetweenLabelAndRadial = this._computeAngleBetweenLabelLineAndRadialLine()
  }

  setBottomMedialPoint (coord) {
    const { width, height, linePadding, hemisphere } = this
    this.topLeftCoord = (hemisphere === 'left')
      ? { x: coord.x - width - linePadding, y: coord.y - height }
      : { x: coord.x + linePadding, y: coord.y - height }
    this.lineConnectorCoord = this._computeLineConnectorCoord()
    this.labelAngle = math.getAngleOfCoord(this.pieCenter, this.lineConnectorCoord)
    this._variants.angleBetweenLabelAndRadial = this._computeAngleBetweenLabelLineAndRadialLine()
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
      y: lineConnectorCoord.y - this.height
    }
    this.lineConnectorCoord = lineConnectorCoord
    this.labelAngle = math.getAngleOfCoord(this.pieCenter, this.lineConnectorCoord)
    this._variants.angleBetweenLabelAndRadial = this._computeAngleBetweenLabelLineAndRadialLine()
  }

  _placeLabelViaConnectorCoordOnBottomApexLabel (lineConnectorCoord) {
    this.topLeftCoord = {
      x: lineConnectorCoord.x - this.width / 2,
      y: lineConnectorCoord.y
    }
    this.lineConnectorCoord = lineConnectorCoord
    this.labelAngle = math.getAngleOfCoord(this.pieCenter, this.lineConnectorCoord)
    this._variants.angleBetweenLabelAndRadial = this._computeAngleBetweenLabelLineAndRadialLine()
  }

  _placeLabelViaConnectorCoordOnNormalLabel (lineConnectorCoord) {
    const { lineHeight, innerPadding, labelTextLines } = this
    const numTextRows = labelTextLines.length

    // place the line connection at mid height of the nearest (i.e. closest to center) row of label text
    const topLeftY = (lineConnectorCoord.y < this.pieCenter.y)
      ? lineConnectorCoord.y - 0.5 * lineHeight - (lineHeight * (numTextRows - 1)) - (innerPadding * (numTextRows - 1))
      : lineConnectorCoord.y - 0.5 * lineHeight

    const { width, linePadding, hemisphere } = this
    this.topLeftCoord = (hemisphere === 'left')
      ? { x: lineConnectorCoord.x - linePadding - width, y: topLeftY }
      : { x: lineConnectorCoord.x + linePadding, y: topLeftY }
    this.lineConnectorCoord = lineConnectorCoord
    this.labelAngle = math.getAngleOfCoord(this.pieCenter, this.lineConnectorCoord)
    this._variants.angleBetweenLabelAndRadial = this._computeAngleBetweenLabelLineAndRadialLine()
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
    const outerRadiusCoord = math.rotate(pointAtZeroDegrees, pieCenter, segmentAngleMidpoint)

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
    const angleCInDegrees = math.toDegrees(angleCinRadians)

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

  get color () { return this._invariants.color }
  get fontFamily () { return this._invariants.fontFamily }
  get fractionalValue () { return this._invariants.fractionalValue }

  // NB left includes, right excludes
  // NB top includes, bottom excludes
  get hemisphere () { return this._invariants.hemisphere }
  get inTopHalf () { return this._invariants.inTopHalf }
  get inBottomHalf () { return !this._invariants.inTopHalf }
  get inLeftHalf () { return this._invariants.inLeftHalf }
  get inRightHalf () { return !this._invariants.inLeftHalf }

  get inTopLeftQuadrant () { return this.inTopHalf && this.inLeftHalf }
  get inTopRightQuadrant () { return this.inTopHalf && this.inRightHalf }
  get inBottomLeftQuadrant () { return this.inBottomHalf && this.inLeftHalf }
  get inBottomRightQuadrant () { return this.inBottomHalf && this.inRightHalf }

  get linePointsToYOrigin () {
    return (this.inLeftHalf)
      ? (_.has(this._variants, 'lineConnectorCoord') && this.lineConnectorCoord.x > this.segmentMidpointCoord.x)
      : (_.has(this._variants, 'lineConnectorCoord') && this.lineConnectorCoord.x < this.segmentMidpointCoord.x)
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

  get id () { return this._invariants.id }
  get innerPadding () { return this._invariants.innerPadding }
  get label () { return this._invariants.label }
  get labelText () { return this._invariants.labelText }
  get shortText () { return this._invariants.label.substr(0,8) }
  get linePadding () { return this._invariants.linePadding }
  get segmentAngleMidpoint () { return this._invariants.segmentAngleMidpoint }
  get segmentQuadrant () { return this._invariants.segmentQuadrant }
  get value () { return this._invariants.value }

  get segmentMidpointCoord () { return this._invariants.segmentMidpointCoord }
  get pieCenter () { return this._invariants.pieCenter }
  get innerRadius () { return this._invariants.innerRadius }
  get outerRadius () { return this._invariants.outerRadius }
  get labelOffset () { return this._invariants.labelOffset }

  // accessors and mutators for variants

  get isLifted () { return this._variants.isLifted }
  set isLifted (newValue) { this._variants.isLifted = newValue }

  get fontSize () { return this._variants.fontSize }
  set fontSize (newValue) { this._variants.fontSize = newValue }

  get height () { return this._variants.height }
  set height (newValue) { this._variants.height = newValue }

  get isTopApexLabel () { return this._variants.isTopApexLabel }
  set isTopApexLabel (newValue) { this._variants.isTopApexLabel = newValue }

  get isBottomApexLabel () { return this._variants.isBottomApexLabel }
  set isBottomApexLabel (newValue) { this._variants.isBottomApexLabel = newValue }

  get lineHeight () { return this._variants.lineHeight }
  set lineHeight (newValue) { this._variants.lineHeight = newValue }

  get labelAngle () { return this._variants.labelAngle }
  set labelAngle (newValue) { this._variants.labelAngle = newValue }

  get labelShown () { return this._variants.labelShown }
  set labelShown (newValue) { this._variants.labelShown = newValue }

  get labelTextLines () { return this._variants.labelTextLines }
  set labelTextLines (newValue) { this._variants.labelTextLines = newValue }

  get lineConnectorCoord () { return this._variants.lineConnectorCoord }
  set lineConnectorCoord (newValue) {
    this.validateCoord(newValue)
    this._variants.lineConnectorCoord = newValue
  }

  get topLeftCoord () { return this._variants.topLeftCoord }
  set topLeftCoord (newValue) {
    this.validateCoord(newValue)
    this._variants.topLeftCoord = newValue
  }

  get width () { return this._variants.width }
  set width (newValue) { this._variants.width = newValue }

  get labelLineAngle () { return this._variants.angleBetweenLabelAndRadial }
}

module.exports = OuterLabel
