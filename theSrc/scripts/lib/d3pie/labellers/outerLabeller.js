import _ from 'lodash'
import d3 from 'd3'
import { getLabelDimensionsUsingSvgApproximation, splitIntoLines, ptInArc, findIntersectingLabels } from './labelUtils'
import helpers from '../helpers'
import math from '../math'
import segments from '../segments'
import OuterLabel from './outerLabel'
import InnerLabel from './innerLabel'
import AngleThresholdExceeded from '../interrupts/angleThresholdExceeded'
import CannotMoveToInner from '../interrupts/cannotMoveToInner'
import * as rootLog from 'loglevel'
const labelLogger = rootLog.getLogger('label')

const inclusiveBetween = (a, b, c) => (a <= b && b <= c)
// const exclusiveBetween = (a, b, c) => (a < b && b < c)
const between = (a, b, c) => (a <= b && b < c)

// TODO bit of a temp hack
const spacingBetweenUpperTrianglesAndCenterMeridian = 7

// NB fundamental for understanding a loop of the code : _.each iterations are cancelled if the loop function returns false
const terminateLoop = false // NB this is done for readability to make it more obvious what 'return false' does in a _.each loop
const continueLoop = true // NB this is done for readability to make it more obvious what 'return true' does in a _.each loop

let labels = {
  // NB function used for debug and test purpose only
  drawPlacementLines (pie) {
    const maxFontSize = _(pie.outerLabelData).map('fontSize').max()

    // red dots : the initial placement line
    _.range(0, 360, 2).map(angle => {
      const fitLineCoord = labels._computeInitialCoordAlongLabelRadiusWithLiftOffAngle({
        angle,
        labelHeight: 10, // made up
        labelOffset: pie.labelOffset,
        labelLiftOffAngle: parseFloat(pie.options.labels.outer.liftOffAngle),
        outerRadius: pie.outerRadius,
        pieCenter: pie.pieCenter,
        canvasHeight: parseFloat(pie.options.size.canvasHeight),
        maxFontSize,
        maxVerticalOffset: pie.maxVerticalOffset
      })
      helpers.showPoint(pie.svg, fitLineCoord, 'red')
    })

    // green dots : the adjusted label placement line
    const highestPoint = pie.pieCenter.y - (pie.outerRadius + pie.maxVerticalOffset)
    const lowestPoint = pie.pieCenter.y + (pie.outerRadius + pie.maxVerticalOffset)
    _([0, 180]).each(startAngle => {
      _.range(highestPoint, lowestPoint, 5).map(yCoord => {
        const fakeLabel = new OuterLabel({
          angleExtent: 1 * 360 / 100,
          angleStart: startAngle,
          color: 'black',
          fontFamily: 'arial',
          fontSize: 12,
          id: 'test',
          innerPadding: parseFloat(pie.options.labels.outer.innerPadding),
          label: 'test',
          totalValue: 100,
          value: 2
        })

        // compute label height and labelTextLines and lineHeight
        const { lineHeight, width, height, labelTextLines } = labels.wrapAndFormatLabelUsingSvgApproximation({
          parentContainer: pie.svg,
          labelText: fakeLabel.labelText,
          fontSize: fakeLabel.fontSize,
          fontFamily: fakeLabel.fontFamily,
          maxLabelWidth: parseFloat(pie.options.labels.outer.maxWidth) * pie.options.size.canvasWidth,
          innerPadding: parseFloat(pie.options.labels.outer.innerPadding)
        })

        Object.assign(fakeLabel, {
          lineHeight,
          width,
          height,
          labelTextLines,
          pieCenter: pie.pieCenter,
          labelOffset: pie.labelOffset,
          outerRadius: pie.outerRadius
        })

        labels.adjustLabelToNewY({
          parentContainer: pie.svg,
          anchor: 'top',
          newY: yCoord,
          labelDatum: fakeLabel,
          labelRadius: pie.outerRadius + pie.labelOffset,
          yRange: pie.outerRadius + pie.maxVerticalOffset,
          labelLiftOffAngle: parseFloat(pie.options.labels.outer.liftOffAngle),
          pieCenter: pie.pieCenter,
          topIsLifted: false,
          bottomIsLifted: false
        })
        helpers.showPoint(pie.svg, fakeLabel.lineConnectorCoord, 'green')
      })
    })
  },

  // TODO break into small phases and combine with buildLabelSet
  preprocessLabelSet ({
    parentContainer,
    labelSet,
    canvasHeight,
    minFontSize,
    maxFontSize,
    innerPadding,
    outerPadding,
    minAngle,
    maxLabelWidth
  }) {
    let filteredLabelSet = labelSet.map(label => {
      const { lineHeight, width, height, labelTextLines } = labels.wrapAndFormatLabelUsingSvgApproximation({
        parentContainer,
        labelText: label.labelText,
        fontSize: label.fontSize,
        fontFamily: label.fontFamily,
        maxLabelWidth,
        innerPadding
      })

      return Object.assign(label, {
        lineHeight,
        width,
        height,
        labelTextLines
      })
    })

    let labelStats = labels.computeLabelStats(filteredLabelSet, outerPadding)
    let maxDesiredHeight = Math.max(labelStats.cumulativeLeftSideLabelHeight, labelStats.cumulativeRightSideLabelHeight)
    let heightDeficit = maxDesiredHeight - canvasHeight

    if (heightDeficit > 0) {
      // apply increasingly aggressive font size scales, until everything is minFontSize
      const fontSizeScaleOptions = _.range(maxFontSize, minFontSize - 1).map((newMaxFontSize, i) => {
        return {
          scale: d3.scale.linear().domain([0, filteredLabelSet.length]).range([newMaxFontSize, minFontSize]),
          minFontSize,
          maxFontSize: newMaxFontSize,
          id: i
        }
      })

      const descendingValuesLabelSet = _(filteredLabelSet).orderBy(['value'], ['desc']).value()

      // NB note both filteredLabelSet and descendingValuesLabelSet are referencing same data items, so mods to one are reflected in the other

      // NB KEY implementation detail : _.each iteration will terminate on return false
      _(fontSizeScaleOptions).each(({ scale, minFontSize, maxFontSize, id }) => {
        _(descendingValuesLabelSet)
          .each((label, i) => {
            const newFontSize = Math.round(scale(i))
            const { lineHeight, width, height, labelTextLines } = labels.wrapAndFormatLabelUsingSvgApproximation({
              parentContainer,
              labelText: label.labelText,
              fontSize: newFontSize,
              fontFamily: label.fontFamily,
              maxLabelWidth,
              innerPadding
            })

            Object.assign(label, {
              fontSize: newFontSize,
              lineHeight,
              width,
              height,
              labelTextLines
            })
          })

        labelStats = labels.computeLabelStats(filteredLabelSet, outerPadding)

        labelLogger.info(`Applying labelFontScale option ${id}: font range: [${minFontSize}:${maxFontSize}]`)
        labelLogger.info(`New fontSizeDistribution: ${JSON.stringify(labelStats.fontSizeDistribution, {}, 2)}`)

        if (Math.max(labelStats.cumulativeLeftSideLabelHeight, labelStats.cumulativeRightSideLabelHeight) <= canvasHeight) {
          labelLogger.info(`labelFontScale option(${id}):[${minFontSize}:${maxFontSize}] provided enough shrinkage. Moving on to next step`)
          return false // NB break
        }
      })

      if (Math.max(labelStats.cumulativeLeftSideLabelHeight, labelStats.cumulativeRightSideLabelHeight) > canvasHeight) {
        labelLogger.info(`all font shrinking options exhausted, must now start removing labels by increasing minDisplay Angle`)

        // TODO make 0.0005 configurable, or use one of the existing iteration values
        _(_.range(minAngle, 1, 0.0005)).each((newMinAngle) => {
          let labelStats = labels.computeLabelStats(filteredLabelSet, outerPadding)
          let leftSideHeightDeficit = labelStats.cumulativeLeftSideLabelHeight - canvasHeight
          let rightSideHeightDeficit = labelStats.cumulativeRightSideLabelHeight - canvasHeight

          const beforeCount = filteredLabelSet.length
          for (let i = filteredLabelSet.length - 1; i >= 0; i--) {
            let label = filteredLabelSet[i]
            if ((leftSideHeightDeficit > 0 || rightSideHeightDeficit > 0) && label.fractionalValue < newMinAngle) {
              label.labelShown = false
              if (label.hemisphere === 'left') {
                leftSideHeightDeficit -= (label.height + outerPadding)
              }
              if (label.hemisphere === 'right') {
                rightSideHeightDeficit -= (label.height + outerPadding)
              }
            }

            if (leftSideHeightDeficit <= 0 && rightSideHeightDeficit <= 0) {
              break
            }
          }

          filteredLabelSet = filteredLabelSet.filter(datum => datum.labelShown)
          const afterCount = filteredLabelSet.length
          labelStats = labels.computeLabelStats(filteredLabelSet, outerPadding)
          maxDesiredHeight = Math.max(labelStats.cumulativeLeftSideLabelHeight, labelStats.cumulativeRightSideLabelHeight)

          labelLogger.info(`Applied new minAngle ${newMinAngle}. Before count ${beforeCount} after count ${afterCount}. New maxDesiredHeight:${maxDesiredHeight}, canvasHeight:${canvasHeight}`)

          if (maxDesiredHeight <= canvasHeight) {
            labelLogger.info(`new minDisplay angle ${newMinAngle} provided enough shrinkage. Moving on to next step`)
            return false // NB break
          }
        })
      }
    }
    return filteredLabelSet
  },

  /**
   * Entry point that performs all labelling
   * @param pie
   */
  doLabelling: function (pie) {
    labels.clearPreviousLabelling(pie.svg, pie.cssPrefix)

    // naively place label
    labels.computeInitialLabelCoordinates(pie)

    // adjust label positions to try to accommodate conflicts
    labels.performCollisionResolution(pie)

    labels.shortenTopAndBottom(pie)

    labels.drawOuterLabels(pie)

    labels.drawInnerLabels(pie)

    // only add them if they're actually enabled
    if (pie.options.labels.lines.enabled) {
      labels.drawOuterLabelLines(pie)
      labels.drawInnerLabelLines(pie)
    }

    labels.fadeInLabelsAndLines(pie)
  },

  clearPreviousLabelling: function (parentContainer, cssPrefix) {
    parentContainer.selectAll(`.${cssPrefix}labels-outer`).remove()
    parentContainer.selectAll(`.${cssPrefix}labels-inner`).remove()
    parentContainer.selectAll(`.${cssPrefix}labels-extra`).remove() // TODO dont need
    parentContainer.selectAll(`.${cssPrefix}labels-group`).remove()
    parentContainer.selectAll(`.${cssPrefix}lineGroups-outer`).remove()
    parentContainer.selectAll(`.${cssPrefix}lineGroups-inner`).remove()
    parentContainer.selectAll(`.${cssPrefix}tooltips`).remove() // TODO shouldn't be done here. Also wont work any more (not in parentContainer
    parentContainer.selectAll(`.${cssPrefix}gtooltips`).remove() // TODO shouldn't be done here. Also wont work any more (not in parentContainer
  },

  computeInitialLabelCoordinates: function (pie) {
    pie.maxFontSize = _(pie.outerLabelData).map('fontSize').max()

    // TODO hard coded ranges
    const topApexLabel = _(pie.outerLabelData)
      .filter(labelData => inclusiveBetween(87, labelData.segmentAngleMidpoint, 93))
      .minBy(labelDatum => Math.abs(90 - labelDatum.segmentAngleMidpoint))

    const bottomApexLabel = _(pie.outerLabelData)
      .filter(labelData => inclusiveBetween(267, labelData.segmentAngleMidpoint, 273))
      .minBy(labelDatum => Math.abs(270 - labelDatum.segmentAngleMidpoint))

    if (topApexLabel) {
      labelLogger.info('has top apex label')
      pie.hasTopLabel = true
      topApexLabel.isTopApexLabel = true
    } else {
      pie.hasTopLabel = false
    }

    if (bottomApexLabel) {
      labelLogger.info('has bottom apex label')
      pie.hasBottomLabel = true
      bottomApexLabel.isBottomApexLabel = true
    } else {
      pie.hasBottomLabel = false
    }

    // First place labels using a liftOff of 0, then check for collisions and only lift
    // if there are any collisions do we apply a liftOffAngle
    _(pie.outerLabelData).each(label => {
      labels.placeLabelAlongLabelRadiusWithLiftOffAngle({
        labelDatum: label,
        labelOffset: pie.labelOffset,
        labelLiftOffAngle: 0,
        outerRadius: pie.outerRadius,
        pieCenter: pie.pieCenter,
        canvasHeight: parseFloat(pie.options.size.canvasHeight),
        maxFontSize: pie.maxFontSize,
        maxVerticalOffset: pie.maxVerticalOffset,
        hasTopLabel: pie.hasTopLabel,
        hasBottomLabel: pie.hasBottomLabel,
        minGap: parseFloat(pie.options.labels.outer.outerPadding)
      })
    })

    const topLabelsThatCouldBeLifted = pie.outerLabelData
      .filter(({segmentAngleMidpoint}) => between(90 - parseFloat(pie.options.labels.outer.liftOffAngle), segmentAngleMidpoint, 90 + parseFloat(pie.options.labels.outer.liftOffAngle)))
    const collisionsInTopSet = findIntersectingLabels(topLabelsThatCouldBeLifted)
    if (collisionsInTopSet.length > 0) {
      labelLogger.info(`Collisions between ${90 - parseFloat(pie.options.labels.outer.liftOffAngle)} - ${90 + parseFloat(pie.options.labels.outer.liftOffAngle)}, applying liftoff spacing`)
      pie.topIsLifted = true
      _(topLabelsThatCouldBeLifted).each(label => {
        labels.placeLabelAlongLabelRadiusWithLiftOffAngle({
          labelDatum: label,
          labelOffset: pie.labelOffset,
          labelLiftOffAngle: parseFloat(pie.options.labels.outer.liftOffAngle),
          outerRadius: pie.outerRadius,
          pieCenter: pie.pieCenter,
          canvasHeight: parseFloat(pie.options.size.canvasHeight),
          maxFontSize: pie.maxFontSize,
          maxVerticalOffset: pie.maxVerticalOffset,
          hasTopLabel: pie.hasTopLabel,
          hasBottomLabel: pie.hasBottomLabel,
          minGap: parseFloat(pie.options.labels.outer.outerPadding)
        })
      })
    }

    const bottomLabelsThatCouldBeLifted = pie.outerLabelData
      .filter(({segmentAngleMidpoint}) => between(270 - parseFloat(pie.options.labels.outer.liftOffAngle), segmentAngleMidpoint, 270 + parseFloat(pie.options.labels.outer.liftOffAngle)))
    const collisionsInBottomSet = findIntersectingLabels(bottomLabelsThatCouldBeLifted)
    if (collisionsInBottomSet.length > 0) {
      labelLogger.info(`Collisions between ${270 - parseFloat(pie.options.labels.outer.liftOffAngle)} - ${270 + parseFloat(pie.options.labels.outer.liftOffAngle)}, applying liftoff spacing`)
      pie.bottomIsLifted = true
      _(bottomLabelsThatCouldBeLifted).each(label => {
        labels.placeLabelAlongLabelRadiusWithLiftOffAngle({
          labelDatum: label,
          labelOffset: pie.labelOffset,
          labelLiftOffAngle: parseFloat(pie.options.labels.outer.liftOffAngle),
          outerRadius: pie.outerRadius,
          pieCenter: pie.pieCenter,
          canvasHeight: parseFloat(pie.options.size.canvasHeight),
          maxFontSize: pie.maxFontSize,
          maxVerticalOffset: pie.maxVerticalOffset,
          hasTopLabel: pie.hasTopLabel,
          hasBottomLabel: pie.hasBottomLabel,
          minGap: parseFloat(pie.options.labels.outer.outerPadding)
        })
      })
    }
  },

  // TODO need to doc this using an image, and test that it lines up with computeXGivenY
  // TODO this fn is now useless, as it too is a wrapper
  placeLabelAlongLabelRadiusWithLiftOffAngle: function ({
    labelDatum,
    labelOffset,
    labelLiftOffAngle,
    outerRadius,
    pieCenter,
    canvasHeight,
    maxFontSize,
    maxVerticalOffset,
    hasTopLabel = false,
    hasBottomLabel = false,
    minGap = 1
  }) {
    if (labelDatum.isTopApexLabel) {
      const coordAtZeroDegreesAlongOuterRadius = { x: pieCenter.x - outerRadius, y: pieCenter.y }
      const segmentCoord = math.rotate(coordAtZeroDegreesAlongOuterRadius, pieCenter, labelDatum.segmentAngleMidpoint)

      const fitLineCoord = {
        x: segmentCoord.x,
        y: pieCenter.y - (outerRadius + maxVerticalOffset - labelDatum.height)
      }
      labelDatum.placeLabelViaConnectorCoord(fitLineCoord)
    } else if (labelDatum.isBottomApexLabel) {
      const coordAtZeroDegreesAlongOuterRadius = { x: pieCenter.x - outerRadius, y: pieCenter.y }
      const segmentCoord = math.rotate(coordAtZeroDegreesAlongOuterRadius, pieCenter, labelDatum.segmentAngleMidpoint)

      const fitLineCoord = {
        x: segmentCoord.x,
        y: pieCenter.y + (outerRadius + maxVerticalOffset - labelDatum.height)
      }
      labelDatum.placeLabelViaConnectorCoord(fitLineCoord)
    } else {
      const fitLineCoord = labels._computeInitialCoordAlongLabelRadiusWithLiftOffAngle({
        angle: labelDatum.segmentAngleMidpoint,
        labelHeight: labelDatum.height,
        labelOffset,
        labelLiftOffAngle,
        outerRadius,
        pieCenter,
        canvasHeight,
        maxFontSize,
        maxVerticalOffset,
        hasTopLabel,
        hasBottomLabel,
        minGap
      })
      labelDatum.placeLabelViaConnectorCoord(fitLineCoord)
    }
  },

  _computeInitialCoordAlongLabelRadiusWithLiftOffAngle: function ({
    angle,
    labelHeight,
    labelLiftOffAngle,
    pieCenter,
    outerRadius,
    labelOffset,
    canvasHeight,
    maxFontSize,
    maxVerticalOffset,
    hasTopLabel = false,
    hasBottomLabel = false,
    minGap = 1
  }) {
    let fitLineCoord = null

    const highYOffSetAngle = (angle) => (between(90 - labelLiftOffAngle, angle, 90 + labelLiftOffAngle) || between(270 - labelLiftOffAngle, angle, 270 + labelLiftOffAngle))
    const pointAtZeroDegreesAlongLabelOffset = { x: pieCenter.x - outerRadius - labelOffset, y: pieCenter.y }

    if (highYOffSetAngle(angle)) {
      const radialCoord = math.rotate(pointAtZeroDegreesAlongLabelOffset, pieCenter, angle)
      const radialLine = [pieCenter, radialCoord]

      let placementLineCoord1 = {}
      placementLineCoord1.y = (between(0, angle, 180))
        ? pieCenter.y - (outerRadius + maxVerticalOffset) + ((hasTopLabel) ? (maxFontSize + minGap) : 0)
        : pieCenter.y + (outerRadius + maxVerticalOffset) - ((hasBottomLabel) ? (maxFontSize + minGap) : 0)
      placementLineCoord1.x = (between(0, angle, 90) || between(270, angle, 360))
        ? pieCenter.x - spacingBetweenUpperTrianglesAndCenterMeridian
        : pieCenter.x + spacingBetweenUpperTrianglesAndCenterMeridian

      let placementLineCoord2 = null
      if (between(0, angle, 90)) {
        placementLineCoord2 = math.rotate(pointAtZeroDegreesAlongLabelOffset, pieCenter, 90 - labelLiftOffAngle)
      } else if (between(90, angle, 180)) {
        placementLineCoord2 = math.rotate(pointAtZeroDegreesAlongLabelOffset, pieCenter, 90 + labelLiftOffAngle)
      } else if (between(180, angle, 270)) {
        placementLineCoord2 = math.rotate(pointAtZeroDegreesAlongLabelOffset, pieCenter, 270 - labelLiftOffAngle)
      } else {
        placementLineCoord2 = math.rotate(pointAtZeroDegreesAlongLabelOffset, pieCenter, 270 + labelLiftOffAngle)
      }

      const placementLine = [placementLineCoord1, placementLineCoord2]

      const intersection = math.computeIntersection(radialLine, placementLine)

      if (intersection) {
        fitLineCoord = intersection
        if (fitLineCoord.y < 0) { fitLineCoord.y = 0 }
        if (fitLineCoord.y + labelHeight > canvasHeight) { fitLineCoord.y = canvasHeight - labelHeight }
      } else {
        labelLogger.error(`unexpected condition. could not compute intersection with placementLine for label at angle ${angle}`)
        fitLineCoord = math.rotate(pointAtZeroDegreesAlongLabelOffset, pieCenter, angle)
      }
    } else {
      fitLineCoord = math.rotate(pointAtZeroDegreesAlongLabelOffset, pieCenter, angle)
    }

    return fitLineCoord
  },

  drawOuterLabelLines: function (pie) {
    pie.outerLabelLines = pie.outerLabelData
      .map(labelData => {
        return labels.computeOuterLabelLine({
          pie,
          pieCenter: pie.pieCenter,
          outerRadius: pie.outerRadius,
          labelData
        })
      })

    let lineGroups = pie.svg.insert('g', `.${pie.cssPrefix}pieChart`) // meaning, BEFORE .pieChart
      .attr('class', `${pie.cssPrefix}lineGroups-outer`)
      .style('opacity', 1)

    let lineGroup = lineGroups.selectAll(`.${pie.cssPrefix}lineGroup`)
      .data(pie.outerLabelLines)
      .enter()
      .append('g')
      .attr('class', function (d) { return `${pie.cssPrefix}lineGroup ${pie.cssPrefix}lineGroup-${d[0].id}` })

    let lineFunctionBasis = d3.svg.line()
      .x(d => d.x)
      .y(d => d.y)
      .interpolate('basis')

    let linearLine = d3.svg.line() // TODO delete if still unused
      .x(d => d.x)
      .y(d => d.y)
      .interpolate('linear')

    lineGroup.append('path')
      .attr('d', (d) => {
        switch (d[0].lineType) {
          case 'basis':
            return lineFunctionBasis(d)
          case 'linear':
            return linearLine(d)
          default:
            throw new Error(`Invalid line type ${d[0].lineType}`)
        }
      })
      .attr('stroke', d => d[0].color)
      .attr('stroke-width', 1)
      .attr('fill', 'none')
      .style('opacity', 1)
      .style('display', 'inline')
  },

  computeOuterLabelLine: function ({ pie, pieCenter, outerRadius, labelData }) {
    let segmentCoord = _.clone(labelData.segmentMidpointCoord)
    let labelCoord = labelData.lineConnectorCoord

    segmentCoord.id = labelData.id
    segmentCoord.color = labelData.color

    let mid = {}
    if (labelData.linePointsToMeridian) {
      segmentCoord.lineType = 'basis'
      const totalXDelta = segmentCoord.x - labelCoord.x
      mid = {
        x: (labelData.inLeftHalf)
          ? segmentCoord.x + Math.abs(totalXDelta)
          : segmentCoord.x - Math.abs(totalXDelta),
        y: (labelData.inTopHalf)
          ? segmentCoord.y - Math.abs(totalXDelta)
          : segmentCoord.y + Math.abs(totalXDelta),
        type: 'mid'
      }
    } else {
      segmentCoord.lineType = 'basis'
      mid = {
        x: segmentCoord.x + (labelCoord.x - segmentCoord.x) * 0.5,
        y: segmentCoord.y + (labelCoord.y - segmentCoord.y) * 0.5,
        type: 'mid'
      }
      switch (labelData.inTopHalf) {
        case true:
          mid.y -= Math.abs(labelCoord.y - segmentCoord.y) * 0.25
          break
        case false:
          mid.y += Math.abs(labelCoord.y - segmentCoord.y) * 0.25
          break
      }
    }

    return [segmentCoord, mid, labelCoord]
  },

  drawInnerLabelLines: function (pie) {
    pie.innerLabelLines = pie.innerLabelData
      .map(labelData => {
        return labels.computeInnerLabelLine({
          pieCenter: pie.pieCenter,
          innerRadius: pie.innerRadius,
          labelData
        })
      })

    let lineGroups = pie.svg.insert('g', `.${pie.cssPrefix}pieChart`) // meaning, BEFORE .pieChart
      .attr('class', `${pie.cssPrefix}lineGroups-inner`)
      .style('opacity', 1)

    let lineGroup = lineGroups.selectAll(`.${pie.cssPrefix}lineGroup`)
      .data(pie.innerLabelLines)
      .enter()
      .append('g')
      .attr('class', function (d) { return `${pie.cssPrefix}lineGroup ${pie.cssPrefix}lineGroup-${d[0].id}` })

    let lineFunction = d3.svg.line()
      .x(function (d) { return d.x })
      .y(function (d) { return d.y })
      .interpolate('basis')

    lineGroup.append('path')
      .attr('d', lineFunction)
      .attr('stroke', function (d) { return d[0].color })
      .attr('stroke-width', 1)
      .attr('fill', 'none')
      .style('opacity', 1)
      .style('display', 'inline')
  },

  computeInnerLabelLine: function ({ pieCenter, innerRadius, labelData }) {
    const pointAtZeroDegrees = { x: pieCenter.x - innerRadius, y: pieCenter.y }
    let originCoords = math.rotate(pointAtZeroDegrees, pieCenter, labelData.segmentAngleMidpoint)
    originCoords.id = labelData.id
    originCoords.color = labelData.color

    let end = labelData.lineConnectorCoord

    let mid = {
      x: originCoords.x + (end.x - originCoords.x) * 0.5,
      y: originCoords.y + (end.y - originCoords.y) * 0.5,
      type: 'mid'
    }

    switch (labelData.segmentQuadrant) {
      case 4: // top left
        mid.y += Math.abs(end.y - originCoords.y) * 0.25
        break
      case 3: // bottom left
        mid.y -= Math.abs(end.y - originCoords.y) * 0.25
        break
      case 1: // top right
        mid.y += Math.abs(end.y - originCoords.y) * 0.25
        break
      case 2: // bottom right
        mid.y -= Math.abs(end.y - originCoords.y) * 0.25
        break
    }

    return [originCoords, end]
    // return [originCoords, mid, end]
  },

  drawOuterLabels: function (pie) {
    labels.drawLabelSet({
      outerContainer: pie.svg,
      cssPrefix: pie.cssPrefix,
      labelData: pie.outerLabelData,
      labelColor: pie.options.labels.mainLabel.color,
      innerPadding: pie.options.labels.outer.innerPadding,
      labelType: 'outer'
    })
  },

  drawInnerLabels: function (pie) {
    labels.drawLabelSet({
      outerContainer: pie.svg,
      cssPrefix: pie.cssPrefix,
      labelData: pie.innerLabelData,
      labelColor: pie.options.labels.mainLabel.color,
      innerPadding: pie.options.labels.outer.innerPadding,
      labelType: 'inner'
    })
  },

  drawLabelSet: function ({ outerContainer, cssPrefix, labelData, labelColor, innerPadding, labelType }) {
    let labelContainer = outerContainer.insert('g', `.${cssPrefix}labels-${labelType}`)
      .attr('class', `${cssPrefix}labels-${labelType}`)

    let labelGroup = labelContainer.selectAll(`.${cssPrefix}labelGroup-${labelType}`)
      .data(labelData)
      .enter()
      .append('g')
      .attr('id', function (d) { return `${cssPrefix}labelGroup${d.id}-${labelType}` })
      .attr('data-line-angle', function (d) { return d.angleBetweenLabelAndRadial.toFixed(3) })
      .attr('data-segmentangle', function (d) { return d.segmentAngleMidpoint.toFixed(3) })
      .attr('data-index', function (d) { return d.id })
      .attr('class', `${cssPrefix}labelGroup-${labelType}`)
      .attr('transform', function ({topLeftCoord}) { return `translate(${topLeftCoord.x},${topLeftCoord.y})` })
      .style('opacity', 1)

    labelGroup.append('text')
      .attr('id', function (d) { return `${cssPrefix}segmentMainLabel${d.id}-${labelType}` })
      .attr('class', `${cssPrefix}segmentMainLabel-outer`)
      .attr('x', 0)
      .attr('y', 0)
      .attr('dy', 0)
      .style('dominant-baseline', 'text-before-edge')
      .style('fill', labelColor)
      .each(function (d) {
        const textGroup = d3.select(this)
        _(d.labelTextLines).each((lineText, i) => {
          textGroup.append('tspan')
            .attr('x', 0)
            .attr('y', i * (d.fontSize + innerPadding))
            .style('font-size', function (d) { return d.fontSize + 'px' })
            .style('font-family', function (d) { return d.fontFamily })
            .style('dominant-baseline', 'text-before-edge')
            .text(lineText)
        })
      })
  },

  fadeInLabelsAndLines: function (pie) {
    // fade in the labels when the load effect is complete - or immediately if there's no load effect
    let loadSpeed = (pie.options.effects.load.effect === 'default') ? pie.options.effects.load.speed : 1
    setTimeout(function () {
      let labelFadeInTime = (pie.options.effects.load.effect === 'default') ? 400 : 1 // 400 is hardcoded for the present

      d3.selectAll('.' + pie.cssPrefix + 'labelGroup-outer')
        .transition()
        .duration(labelFadeInTime)
        .style('opacity', function (d, i) {
          let percentage = pie.options.labels.outer.hideWhenLessThanPercentage
          let segmentPercentage = segments.getPercentage(pie, i, pie.options.labels.percentage.decimalPlaces)
          return (percentage !== null && segmentPercentage < percentage) ? 0 : 1
        })

      d3.selectAll('g.' + pie.cssPrefix + 'lineGroups')
        .transition()
        .duration(labelFadeInTime)
        .style('opacity', 1)

      // once everything's done loading, trigger the onload callback if defined
      if (helpers.isFunction(pie.options.callbacks.onload)) {
        setTimeout(function () {
          try {
            pie.options.callbacks.onload()
          } catch (e) { }
        }, labelFadeInTime)
      }
    }, loadSpeed)
  },

  performCollisionResolution: function (pie) {
    if (pie.outerLabelData.length <= 1) { return }

    if (pie.options.labels.stages.outOfBoundsCorrection) {
      labels.correctOutOfBoundLabelsPreservingOrder({
        outerRadius: pie.outerRadius,
        maxVerticalOffset: pie.maxVerticalOffset,
        labelSet: pie.outerLabelData,
        pieCenter: pie.pieCenter,
        canvasHeight: parseFloat(pie.options.size.canvasHeight),
        canvasWidth: parseFloat(pie.options.size.canvasWidth),
        labelRadius: pie.outerRadius + pie.labelOffset,
        labelLiftOffAngle: parseFloat(pie.options.labels.outer.liftOffAngle),
        outerPadding: parseFloat(pie.options.labels.outer.outerPadding),
        hasTopLabel: pie.hasTopLabel,
        hasBottomLabel: pie.hasBottomLabel,
        maxFontSize: pie.maxFontSize,
        topIsLifted: pie.topIsLifted,
        bottomIsLifted: pie.bottomIsLifted
      })
    }

    // TODO normalize the config variables for initial vs max for both maxlineAngle and minValue
    labels._performCollisionResolutionIteration({
      useInnerLabels: pie.options.labels.outer.innerLabels,
      minAngleThreshold: parseFloat(pie.options.data.minAngle),
      breakOutAngleThreshold: 0.1,
      // for now make maxLineAngleValue == maxLineAngleMaxValue so that this strategy is temp dissabled
      maxLineAngleValue: parseFloat(pie.options.labels.outer.labelMaxLineAngle),
      maxLineAngleMaxValue: parseFloat(pie.options.labels.outer.labelMaxLineAngle),
      maxLineAngleIncrement: 3,
      labelSet: pie.outerLabelData,
      minIncrement: parseFloat(pie.options.labels.outer.iterationMinIncrement),
      maxIncrement: parseFloat(pie.options.labels.outer.iterationMaxIncrement),
      pie })
  },

  _performCollisionResolutionIteration ({
    useInnerLabels,
    minAngleThreshold,
    labelSet,
    maxLineAngleValue,
    maxLineAngleMaxValue,
    maxLineAngleIncrement,
    minIncrement,
    maxIncrement,
    breakOutAngleThreshold,
    pie,
    iterationStrategies = {
      minValueIncreases: 0,
      maxAngleIncreases: 0
    }
  }) {
    const clonedAndFilteredLabelSet = _.cloneDeep(labelSet).filter(labelDatum => labelDatum.fractionalValue > minAngleThreshold)
    labelLogger.info(`collision iteration started. minAngle=${minAngleThreshold}, beforeFilterCount=${labelSet.length}, afterFilterCount: ${clonedAndFilteredLabelSet.length}`)

    try {
      let { candidateOuterLabelSet, candidateInnerLabelSet } = labels._performCollisionResolutionAlgorithm({
        pie,
        clonedAndFilteredLabelSet,
        useInnerLabels,
        maxLineAngleValue
      })

      if (candidateOuterLabelSet.length > 0 || candidateInnerLabelSet.length > 0) {
        pie.outerLabelData = candidateOuterLabelSet
        pie.innerLabelData = candidateInnerLabelSet
      } else {
        labelLogger.error(`collision resolution failed: it tried to removed all labels!`)
      }
    } catch (error) {
      if (error.isInterrupt && error.type === 'AngleThresholdExceeded') {
        const offendingLabel = error.labelDatum
        labelLogger.warn(`collision iteration failed: label '${offendingLabel.label}' exceeded radial to labelLine angle threshold of ${maxLineAngleValue} (${offendingLabel.angleBetweenLabelAndRadial})`)

        // three strategies :
        //  1) lift top/bottom if not lifted. If both already lifted,
        //  2) then increase minAngle (minValue) threshold
        //  3) then increase maxLabelLineAngle threshold

        const availableStrategies = {
          liftTop: offendingLabel.inTopHalf && !pie.topIsLifted,
          liftBottom: offendingLabel.inBottomHalf && !pie.bottomIsLifted,
          increaseMinValue: minAngleThreshold < breakOutAngleThreshold,
          increaseMaxLabelLineAngle: maxLineAngleValue < maxLineAngleMaxValue
        }

        let newMinAngleThreshold = minAngleThreshold
        if (availableStrategies.liftTop) {
          labelLogger.info('lifting top labels before next iteration')
          // note this is the 'master labelSet', not the clone passed to each iteration
          const topLabelsThatCouldBeLifted = labelSet
            .filter(({segmentAngleMidpoint}) => between(90 - parseFloat(pie.options.labels.outer.liftOffAngle), segmentAngleMidpoint, 90 + parseFloat(pie.options.labels.outer.liftOffAngle)))
          pie.topIsLifted = true
          _(topLabelsThatCouldBeLifted).each(label => {
            labels.placeLabelAlongLabelRadiusWithLiftOffAngle({
              labelDatum: label,
              labelOffset: pie.labelOffset,
              labelLiftOffAngle: parseFloat(pie.options.labels.outer.liftOffAngle),
              outerRadius: pie.outerRadius,
              pieCenter: pie.pieCenter,
              canvasHeight: parseFloat(pie.options.size.canvasHeight),
              maxFontSize: pie.maxFontSize,
              maxVerticalOffset: pie.maxVerticalOffset,
              hasTopLabel: pie.hasTopLabel,
              hasBottomLabel: pie.hasBottomLabel,
              minGap: parseFloat(pie.options.labels.outer.outerPadding)
            })
          })
        } else if (availableStrategies.liftBottom) {
          labelLogger.info('lifting bottom labels before next iteration')
          // note this is the 'master labelSet', not the clone passed to each iteration
          pie.bottomIsLifted = true
          _(labelSet)
            .filter(({segmentAngleMidpoint}) => between(270 - parseFloat(pie.options.labels.outer.liftOffAngle), segmentAngleMidpoint, 270 + parseFloat(pie.options.labels.outer.liftOffAngle)))
            .each(label => {
              labels.placeLabelAlongLabelRadiusWithLiftOffAngle({
                labelDatum: label,
                labelOffset: pie.labelOffset,
                labelLiftOffAngle: parseFloat(pie.options.labels.outer.liftOffAngle),
                outerRadius: pie.outerRadius,
                pieCenter: pie.pieCenter,
                canvasHeight: parseFloat(pie.options.size.canvasHeight),
                maxFontSize: pie.maxFontSize,
                maxVerticalOffset: pie.maxVerticalOffset,
                hasTopLabel: pie.hasTopLabel,
                hasBottomLabel: pie.hasBottomLabel,
                minGap: parseFloat(pie.options.labels.outer.outerPadding)
              })
            })
        // TODO this makes it really clear that newMinAngleThreshold should be renamed to minValueThreshold
        } else if (
          availableStrategies.increaseMinValue &&
          (!availableStrategies.increaseMaxLabelLineAngle || iterationStrategies.minValueIncreases < (iterationStrategies.maxAngleIncreases + 1) * 10)
        ) {
          iterationStrategies.minValueIncreases++

          newMinAngleThreshold = _(labelSet)
            .filter(labelDatum => labelDatum.fractionalValue > minAngleThreshold)
            .minBy('fractionalValue').fractionalValue

          if (newMinAngleThreshold === minAngleThreshold) { throw new Error('oh no newMinAngleThreshold === minAngleThreshold were boned , pull out Jim! ') }

          if (newMinAngleThreshold < minAngleThreshold + minIncrement) { newMinAngleThreshold = minAngleThreshold + minIncrement }
          if (newMinAngleThreshold > minAngleThreshold + maxIncrement) { newMinAngleThreshold = minAngleThreshold + maxIncrement }
          labelLogger.info(`increased newMinAngleThreshold to ${newMinAngleThreshold}`)
        } else if (availableStrategies.increaseMaxLabelLineAngle) {
          iterationStrategies.maxAngleIncreases++
          maxLineAngleValue += maxLineAngleIncrement
          labelLogger.info(`increased maxLineAngleValue to ${maxLineAngleValue}`)
        } else {
          labelLogger.error(`collision resolution failed: hit breakOutValue: ${breakOutAngleThreshold} and maxLineAngleMaxValue: ${maxLineAngleMaxValue}`)
        }

        labels._performCollisionResolutionIteration({
          useInnerLabels,
          minAngleThreshold: newMinAngleThreshold,
          labelSet: labelSet, // NB it is the original labelset (potentially topIsLifted and bottomIsLifted applied), not the modified one from the failed iteration
          breakOutAngleThreshold,
          maxLineAngleValue,
          maxLineAngleMaxValue,
          maxLineAngleIncrement,
          minIncrement,
          maxIncrement,
          pie,
          iterationStrategies
        })
      } else {
        labelLogger.error(`collision resolution failed: unexpected error: ${error}`)
        labelLogger.error(error)
      }
    }
  },

  _performCollisionResolutionAlgorithm ({
    pie,
    clonedAndFilteredLabelSet: outerLabelSet,
    useInnerLabels,
    maxLineAngleValue
  }) {
    // NB could backfire : adding apex labels to both sets ...
    const leftOuterLabelsSortedTopToBottom = _(outerLabelSet)
      .filter(label => label.inLeftHalf || label.isTopApexLabel || label.isBottomApexLabel)
      .sortBy(['lineConnectorCoord.y', x => { return -1 * x.id }])
      .value()

    const rightOuterLabelsSortedTopToBottom = _(outerLabelSet)
      .filter(label => label.inRightHalf || label.isTopApexLabel || label.isBottomApexLabel)
      .sortBy(['lineConnectorCoord.y', x => { return -1 * x.id }])
      .value()

    const innerLabelSet = []
    const canUseInnerLabelsInTheseQuadrants = (useInnerLabels)
      ? [1, 2, 3]
      : []

    // NB at some point we should do both innerLabelling and performInitialClusterSpacing. However,
    // at present they dont work well together as the initialSpacing makes inner labels unecessary, even though the user may have preferred        the innerLabels to the spacing.
    if (pie.options.labels.stages.initialClusterSpacing && !useInnerLabels) {
      labels.performInitialClusterSpacing({
        outerLabelSetSortedTopToBottom: leftOuterLabelsSortedTopToBottom,
        innerLabelSet,
        outerRadius: pie.outerRadius,
        maxVerticalOffset: pie.maxVerticalOffset,
        canUseInnerLabelsInTheseQuadrants,
        hemisphere: 'left',
        pieCenter: pie.pieCenter,
        canvasHeight: parseFloat(pie.options.size.canvasHeight),
        innerLabelRadius: pie.innerRadius - pie.labelOffset,
        innerRadius: pie.innerRadius,
        outerLabelRadius: pie.outerRadius + pie.labelOffset,
        horizontalPadding: parseFloat(pie.options.labels.mainLabel.horizontalPadding),
        labelLiftOffAngle: parseFloat(pie.options.labels.outer.liftOffAngle),
        maxAngleBetweenRadialAndLabelLines: maxLineAngleValue,
        minGap: parseFloat(pie.options.labels.outer.outerPadding),
        maxFontSize: pie.maxFontSize,
        hasTopLabel: pie.hasTopLabel,
        hasBottomLabel: pie.hasBottomLabel,
        topIsLifted: pie.topIsLifted,
        bottomIsLifted: pie.bottomIsLifted
      })

      labels.performInitialClusterSpacing({
        outerLabelSetSortedTopToBottom: rightOuterLabelsSortedTopToBottom,
        innerLabelSet,
        outerRadius: pie.outerRadius,
        maxVerticalOffset: pie.maxVerticalOffset,
        canUseInnerLabelsInTheseQuadrants,
        hemisphere: 'right',
        pieCenter: pie.pieCenter,
        canvasHeight: parseFloat(pie.options.size.canvasHeight),
        innerLabelRadius: pie.innerRadius - pie.labelOffset,
        innerRadius: pie.innerRadius,
        outerLabelRadius: pie.outerRadius + pie.labelOffset,
        horizontalPadding: parseFloat(pie.options.labels.mainLabel.horizontalPadding),
        labelLiftOffAngle: parseFloat(pie.options.labels.outer.liftOffAngle),
        maxAngleBetweenRadialAndLabelLines: maxLineAngleValue,
        minGap: parseFloat(pie.options.labels.outer.outerPadding),
        maxFontSize: pie.maxFontSize,
        hasTopLabel: pie.hasTopLabel,
        hasBottomLabel: pie.hasBottomLabel,
        topIsLifted: pie.topIsLifted,
        bottomIsLifted: pie.bottomIsLifted
      })
    }

    labels.performTwoPhaseLabelAdjustment({
      pie,
      stages: pie.options.labels.stages,
      outerLabelSet: leftOuterLabelsSortedTopToBottom,
      innerLabelSet,
      outerRadius: pie.outerRadius,
      maxVerticalOffset: pie.maxVerticalOffset,
      canUseInnerLabelsInTheseQuadrants,
      hemisphere: 'left',
      pieCenter: pie.pieCenter,
      canvasHeight: parseFloat(pie.options.size.canvasHeight),
      innerLabelRadius: pie.innerRadius - pie.labelOffset,
      innerRadius: pie.innerRadius,
      outerLabelRadius: pie.outerRadius + pie.labelOffset,
      horizontalPadding: parseFloat(pie.options.labels.mainLabel.horizontalPadding),
      labelLiftOffAngle: parseFloat(pie.options.labels.outer.liftOffAngle),
      maxAngleBetweenRadialAndLabelLines: maxLineAngleValue,
      minGap: parseFloat(pie.options.labels.outer.outerPadding),
      maxFontSize: pie.maxFontSize,
      hasTopLabel: pie.hasTopLabel,
      hasBottomLabel: pie.hasBottomLabel,
      topIsLifted: pie.topIsLifted,
      bottomIsLifted: pie.bottomIsLifted
    })

    labels.performTwoPhaseLabelAdjustment({
      pie,
      stages: pie.options.labels.stages,
      outerLabelSet: rightOuterLabelsSortedTopToBottom,
      innerLabelSet,
      outerRadius: pie.outerRadius,
      maxVerticalOffset: pie.maxVerticalOffset,
      canUseInnerLabelsInTheseQuadrants,
      hemisphere: 'right',
      pieCenter: pie.pieCenter,
      canvasHeight: parseFloat(pie.options.size.canvasHeight),
      innerLabelRadius: pie.innerRadius - pie.labelOffset,
      innerRadius: pie.innerRadius,
      outerLabelRadius: pie.outerRadius + pie.labelOffset,
      horizontalPadding: parseFloat(pie.options.labels.mainLabel.horizontalPadding),
      labelLiftOffAngle: parseFloat(pie.options.labels.outer.liftOffAngle),
      maxAngleBetweenRadialAndLabelLines: maxLineAngleValue,
      minGap: parseFloat(pie.options.labels.outer.outerPadding),
      maxFontSize: pie.maxFontSize,
      hasTopLabel: pie.hasTopLabel,
      hasBottomLabel: pie.hasBottomLabel,
      topIsLifted: pie.topIsLifted,
      bottomIsLifted: pie.bottomIsLifted
    })

    outerLabelSet = outerLabelSet.filter(label => label.labelShown)

    return {
      candidateOuterLabelSet: outerLabelSet,
      candidateInnerLabelSet: innerLabelSet
    }
  },

  adjustLabelToNewY ({
    parentContainer, // TODO delete . this is temp for debug
    anchor, // top or bottom
    newY,
    labelDatum,
    labelRadius,
    yRange,
    labelLiftOffAngle,
    pieCenter,
    topIsLifted,
    bottomIsLifted
  }) {
    let newTopYCoord = null
    if (anchor === 'top') {
      newTopYCoord = newY
    } else if (anchor === 'bottom') {
      newTopYCoord = newY - labelDatum.height
    }

    // TODO move to label
    let numTextRows = labelDatum.labelTextLines.length
    let { innerPadding, lineHeight } = labelDatum
    let newLineConnectorYCoord = (newTopYCoord < pieCenter.y)
      ? newTopYCoord + (numTextRows - 1) * (innerPadding + lineHeight) + 0.5 * lineHeight
      : newTopYCoord + 0.5 * lineHeight

    let yOffset = Math.abs(pieCenter.y - newLineConnectorYCoord)

    if (yOffset > yRange) {
      console.warn(`yOffset(${yOffset}) cannot be greater than yRange(${yRange})`)
      yOffset = yRange
    }

    const labelLiftOffAngleInRadians = ((labelDatum.inTopHalf && topIsLifted) || (labelDatum.inBottomHalf && bottomIsLifted))
      ? math.toRadians(labelLiftOffAngle)
      : 0

    const yPosWhereLabelRadiusAndUpperTriangleMeet = labelRadius * Math.cos(labelLiftOffAngleInRadians)
    const xPosWhereLabelRadiusAndUpperTriangleMeet = labelRadius * Math.sin(labelLiftOffAngleInRadians)
    let xOffset = 0

    if (yOffset <= yPosWhereLabelRadiusAndUpperTriangleMeet) {
      // place X along labelRadius
      // step 1. Given the yOffset and the labelRadius, use pythagorem to compute the xOffset that places label along labelRadius
      xOffset = Math.sqrt(Math.pow(labelRadius, 2) - Math.pow(yOffset, 2))
    } else {
      // place X along upper triangle
      // step 1. Given [x,y]PosWhereLabelRadiusAndUpperTriangleMeet, and yRange, compute the upperTriangleYAngle
      const yLengthOfUpperTriangle = yRange - yPosWhereLabelRadiusAndUpperTriangleMeet
      const xLengthOfUpperTriangle = xPosWhereLabelRadiusAndUpperTriangleMeet
      const upperTriangleYAngleInRadians = Math.atan(xLengthOfUpperTriangle / yLengthOfUpperTriangle)

      // step 2. Given the upperTriangleYAngle and the yOffset, determine the xOffset that places the label that places it along the upperTriange
      const yLengthOfLabelOnUpperTriangle = yRange - yOffset
      xOffset = yLengthOfLabelOnUpperTriangle * Math.tan(upperTriangleYAngleInRadians) + spacingBetweenUpperTrianglesAndCenterMeridian
    }

    const newLineConnectorCoord = {
      x: (labelDatum.hemisphere === 'left') ? pieCenter.x - xOffset : pieCenter.x + xOffset,
      y: newY
    }

    if (anchor === 'top') {
      labelDatum.setTopMedialPoint(newLineConnectorCoord)
    } else {
      labelDatum.setBottomMedialPoint(newLineConnectorCoord)
    }
  },

  correctOutOfBoundLabelsPreservingOrder ({ labelSet, labelLiftOffAngle, labelRadius, canvasHeight, canvasWidth, pieCenter, outerPadding, outerRadius, maxVerticalOffset, hasTopLabel, hasBottomLabel, maxFontSize, topIsLifted, bottomIsLifted }) {
    const newYPositions = {}
    const useYFromLookupTableAndCorrectX = (yPositionLookupTable, anchor) => {
      return (labelDatum) => {
        let apexLabelCorrection = 0
        if ((labelDatum.topLeftCoord.x < pieCenter.x && hasTopLabel) ||
            (labelDatum.topLeftCoord.x > pieCenter.x && hasBottomLabel)) {
          apexLabelCorrection = maxFontSize + outerPadding
        }

        labels.adjustLabelToNewY({
          anchor,
          newY: yPositionLookupTable[labelDatum.id],
          labelRadius,
          yRange: outerRadius + maxVerticalOffset - apexLabelCorrection,
          labelLiftOffAngle,
          labelDatum,
          pieCenter,
          topIsLifted,
          bottomIsLifted
        })
        return labelDatum
      }
    }

    const labelsOverTop = _(labelSet)
      .filter((datum) => { return datum.topLeftCoord.y < 0 })

    const leftLabelsOverTop = labelsOverTop
      .filter({ hemisphere: 'left' })

    const rightLabelsOverTop = labelsOverTop
      .filter({ hemisphere: 'right' })

    // NB 'last' ID in left hemi must get y closest to zero to stay on top (i.e. preserving order)
    leftLabelsOverTop
      .sortBy('id')
      .map('id')
      .reverse()
      .each((leftIdOverTop, index) => {
        newYPositions[leftIdOverTop] = outerPadding + 0.01 * index
      })

    // NB 'first' ID in right hemi must get y closest to zero to stay on top (i.e. preserving order)
    rightLabelsOverTop
      .sortBy('id')
      .map('id')
      .each((rightIdOverTop, index) => {
        newYPositions[rightIdOverTop] = outerPadding + 0.01 * index
      })

    const labelsUnderBottom = _(labelSet)
      .filter((datum) => { return datum.topLeftCoord.y + datum.height > canvasHeight })

    const leftLabelsUnderBottom = labelsUnderBottom
      .filter({ hemisphere: 'left' })

    const rightLabelsUnderBottom = labelsUnderBottom
      .filter({ hemisphere: 'right' })

    // NB 'first' ID in left hemi must get y closest to max to stay on bottom (i.e. preserving order)
    const leftLabelsUnderBottomSortedById = leftLabelsUnderBottom.sortBy('id')
      .value()

    _(leftLabelsUnderBottomSortedById).each((labelDatum, index) => {
      const id = labelDatum.id
      if (index === 0) {
        newYPositions[id] = canvasHeight - outerPadding - 0.01 - labelDatum.height
      } else {
        const previousLabelNewYPosition = newYPositions[leftLabelsUnderBottomSortedById[index - 1].id]
        const maxYPositionToStayInBounds = canvasHeight - labelDatum.height
        newYPositions[id] = Math.min(maxYPositionToStayInBounds, previousLabelNewYPosition - 0.01)
      }
    })

    // NB 'last' ID in right hemi must get y closest to max to stay on bottom (i.e. preserving order)
    const rightLabelsUnderBottomSortedById = rightLabelsUnderBottom.sortBy('id')
      .reverse()
      .value()

    _(rightLabelsUnderBottomSortedById).each((labelDatum, index) => {
      const id = labelDatum.id
      if (index === 0) {
        newYPositions[id] = canvasHeight - outerPadding - 0.01 - labelDatum.height
      } else {
        const previousLabelNewYPosition = newYPositions[rightLabelsUnderBottomSortedById[index - 1].id]
        const maxYPositionToStayInBounds = canvasHeight - labelDatum.height
        newYPositions[id] = Math.min(maxYPositionToStayInBounds, previousLabelNewYPosition - 0.01)
      }
    })

    _(leftLabelsOverTop).each(useYFromLookupTableAndCorrectX(newYPositions, 'top'))
    _(rightLabelsOverTop).each(useYFromLookupTableAndCorrectX(newYPositions, 'top'))
    _(leftLabelsUnderBottom).each(useYFromLookupTableAndCorrectX(newYPositions, 'top'))
    _(rightLabelsUnderBottom).each(useYFromLookupTableAndCorrectX(newYPositions, 'top'))

    const labelsOverlappingRightEdgeCount = _(labelSet)
      .filter((datum) => { return datum.topLeftCoord.x + datum.width > canvasWidth })
      .map((datum) => {
        datum.topLeftCoord.x = canvasWidth - datum.width
        return datum
      })
      .size()

    const labelsOverlappingLeftEdgeCount = _(labelSet)
      .filter((datum) => { return datum.topLeftCoord.x < 0 })
      .map((datum) => {
        datum.topLeftCoord.x = 0
        return datum
      })
      .size()

    labelLogger.info(`corrected ${leftLabelsOverTop.size()} left labels over top`)
    labelLogger.info(`corrected ${rightLabelsOverTop.size()} right labels over top`)
    labelLogger.info(`corrected ${leftLabelsUnderBottom.size()} left labels under bottom`)
    labelLogger.info(`corrected ${rightLabelsUnderBottom.size()} right labels under bottom`)
    labelLogger.info(`corrected ${labelsOverlappingRightEdgeCount} labels over left`)
    labelLogger.info(`corrected ${labelsOverlappingLeftEdgeCount} labels over right`)
  },

  performInitialClusterSpacing ({
    outerLabelSetSortedTopToBottom,
    innerLabelSet,
    outerRadius,
    maxVerticalOffset,
    canUseInnerLabelsInTheseQuadrants,
    hemisphere,
    pieCenter,
    canvasHeight,
    innerLabelRadius,
    innerRadius,
    outerLabelRadius,
    labelLiftOffAngle,
    horizontalPadding,
    maxAngleBetweenRadialAndLabelLines,
    minGap,
    maxFontSize,
    hasTopLabel,
    hasBottomLabel,
    topIsLifted,
    bottomIsLifted
  }) {
    const upperBoundary = pieCenter.y - outerRadius - maxVerticalOffset + ((hasTopLabel) ? maxFontSize : 0)
    const lowerBoundary = pieCenter.y + outerRadius + maxVerticalOffset - ((hasBottomLabel) ? maxFontSize : 0)

    const getLabelAbove = (label) => {
      const indexOf = outerLabelSetSortedTopToBottom.indexOf(label)
      if (indexOf !== -1 && indexOf !== 0) {
        const labelAbove = outerLabelSetSortedTopToBottom[indexOf - 1]
        // if (labelAbove.topY <= label.topY) { return labelAbove }
        return labelAbove
      }
      return null
    }

    const getLabelBelow = (label) => {
      const indexOf = outerLabelSetSortedTopToBottom.indexOf(label)
      if (indexOf !== -1 && indexOf !== outerLabelSetSortedTopToBottom.length - 1) {
        const labelBelow = outerLabelSetSortedTopToBottom[indexOf + 1]
        // if (labelBelow.bottomY >= label.bottomY) { return labelBelow }
        return labelBelow
      }
      return null
    }

    const pushLabelsUp = (labelsToPushUp) => {
      _(labelsToPushUp).each(labelToPushUp => {
        const labelBelow = getLabelBelow(labelToPushUp)
        if (labelBelow) {
          const newY = labelBelow.topLeftCoord.y - minGap
          if (newY - labelToPushUp.height < upperBoundary) {
            console.warn(`cancelling pushLabelsUp in performInitialClusterSpacing : exceeded upperBoundary`)
            return terminateLoop
          }

          let apexLabelCorrection = 0
          if ((labelToPushUp.topLeftCoord.x < pieCenter.x && hasTopLabel) ||
            (labelToPushUp.topLeftCoord.x > pieCenter.x && hasBottomLabel)) {
            apexLabelCorrection = maxFontSize + minGap
          }

          const oldY = labelToPushUp.bottomLeftCoord.y
          labels.adjustLabelToNewY({
            newY,
            anchor: 'bottom',
            labelRadius: outerLabelRadius,
            yRange: outerRadius + maxVerticalOffset - apexLabelCorrection,
            labelLiftOffAngle,
            labelDatum: labelToPushUp,
            pieCenter,
            horizontalPadding,
            topIsLifted,
            bottomIsLifted
          })

          const angleBetweenRadialAndLabelLinesAfter = labelToPushUp.angleBetweenLabelAndRadial
          if (angleBetweenRadialAndLabelLinesAfter > maxAngleBetweenRadialAndLabelLines) {
            labelLogger.info(`cancelling pushLabelsUp in performInitialClusterSpacing : exceeded max angle threshold. OldY: ${oldY}`)
            labels.adjustLabelToNewY({
              newY: oldY,
              anchor: 'bottom',
              labelRadius: outerLabelRadius,
              yRange: outerRadius + maxVerticalOffset - apexLabelCorrection,
              labelLiftOffAngle,
              labelDatum: labelToPushUp,
              pieCenter,
              horizontalPadding,
              topIsLifted,
              bottomIsLifted
            })
            return terminateLoop
          }
        } else {
          console.warn(`tried to push label '${labelToPushUp.label}' up, but there was no label below`)
        }
        return continueLoop
      })
    }

    const pushLabelsDown = (labelsToPushDown) => {
      _(labelsToPushDown).each(labelToPushDown => {
        const labelAbove = getLabelAbove(labelToPushDown)

        if (labelAbove) {
          const newY = labelAbove.bottomLeftCoord.y + minGap
          if (newY + labelToPushDown.height > lowerBoundary) {
            console.warn(`cancelling pushLabelsDown in performInitialClusterSpacing : exceeded lowerBoundary`)
            return terminateLoop
          }

          let apexLabelCorrection = 0
          if ((labelToPushDown.topLeftCoord.x < pieCenter.x && hasTopLabel) ||
            (labelToPushDown.topLeftCoord.x > pieCenter.x && hasBottomLabel)) {
            apexLabelCorrection = maxFontSize + minGap
          }

          const oldY = labelToPushDown.topLeftCoord.y
          labels.adjustLabelToNewY({
            newY,
            anchor: 'top',
            labelRadius: outerLabelRadius,
            yRange: outerRadius + maxVerticalOffset - apexLabelCorrection,
            labelLiftOffAngle,
            labelDatum: labelToPushDown,
            pieCenter,
            horizontalPadding,
            topIsLifted,
            bottomIsLifted
          })

          const angleBetweenRadialAndLabelLinesAfter = labelToPushDown.angleBetweenLabelAndRadial
          if (angleBetweenRadialAndLabelLinesAfter > maxAngleBetweenRadialAndLabelLines) {
            labelLogger.debug(`cancelling pushLabelsDown in performInitialClusterSpacing : exceeded max angle threshold`)
            labels.adjustLabelToNewY({
              newY: oldY,
              anchor: 'top',
              labelRadius: outerLabelRadius,
              yRange: outerRadius + maxVerticalOffset - apexLabelCorrection,
              labelLiftOffAngle,
              labelDatum: labelToPushDown,
              pieCenter,
              horizontalPadding,
              topIsLifted,
              bottomIsLifted
            })
            return terminateLoop
          }
        } else {
          console.warn(`tried to push label '${labelToPushDown.label}' down, but there was no label above`)
        }
        return continueLoop
      })
    }

    const collidingLabels = findIntersectingLabels(outerLabelSetSortedTopToBottom)
    const collidingLabelSets = []
    let activeSet = []
    _(collidingLabels).each(collidingLabel => {
      if (activeSet.length === 0) { activeSet.push(collidingLabel); return true }
      if (Math.abs(collidingLabel.id - activeSet[activeSet.length - 1].id) <= 1) {
        activeSet.push(collidingLabel)
      } else {
        collidingLabelSets.push(activeSet)
        activeSet = [collidingLabel]
      }
    })
    if (activeSet.length) {
      collidingLabelSets.push(activeSet)
    }

    _(collidingLabelSets).each(collidingLabelSet => {
      let verticalSpaceAbove = 0
      const nearestNonIntersectingLabelAbove = getLabelAbove(_.first(collidingLabelSet))
      if (nearestNonIntersectingLabelAbove) {
        verticalSpaceAbove = collidingLabelSet[0].topLeftCoord.y - nearestNonIntersectingLabelAbove.bottomLeftCoord.y
      }

      let verticalSpaceBelow = 0
      const nearestNonIntersectingLabelBelow = getLabelBelow(_.last(collidingLabelSet))
      if (nearestNonIntersectingLabelBelow) {
        verticalSpaceBelow = nearestNonIntersectingLabelBelow.topLeftCoord.y - collidingLabelSet[collidingLabelSet.length - 1].bottomLeftCoord.y
      }

      labelLogger.debug(`collidingLabelSet: ${collidingLabelSet.map(label => label.label).join(', ')}`)
      labelLogger.debug(`verticalSpaceAbove: ${verticalSpaceAbove} : verticalSpaceBelow: ${verticalSpaceBelow}`)

      let differenceInVerticalSpace = Math.abs(verticalSpaceBelow - verticalSpaceAbove)
      let sumOfVerticalSpace = verticalSpaceBelow + verticalSpaceAbove
      if (sumOfVerticalSpace > 10 && differenceInVerticalSpace > 10 && verticalSpaceAbove > verticalSpaceBelow) {
        labelLogger.debug(`pushing whole set up`)
        pushLabelsUp(_.reverse(collidingLabelSet))
      } else if (sumOfVerticalSpace > 10 && differenceInVerticalSpace > 10 && verticalSpaceBelow > verticalSpaceAbove) {
        labelLogger.debug(`pushing whole set down`)
        pushLabelsDown(collidingLabelSet)
      } else if (sumOfVerticalSpace > 10) {
        labelLogger.debug(`pushing 1/2 up and 1/2 down`)
        const [labelsToPushUp, labelsToPushDown] = _.chunk(collidingLabelSet, Math.ceil(collidingLabelSet.length / 2))
        pushLabelsUp(_.reverse(labelsToPushUp))
        pushLabelsDown(labelsToPushDown)
      } else {
        labelLogger.debug(`no room to space cluster. Skipping`)
      }
    })
  },

  performTwoPhaseLabelAdjustment ({
    pie,
    stages,
    outerLabelSet,
    innerLabelSet,
    outerRadius,
    maxVerticalOffset,
    canUseInnerLabelsInTheseQuadrants,
    hemisphere,
    pieCenter,
    canvasHeight,
    innerLabelRadius,
    innerRadius,
    outerLabelRadius,
    labelLiftOffAngle,
    horizontalPadding,
    maxAngleBetweenRadialAndLabelLines,
    minGap,
    maxFontSize,
    hasTopLabel,
    hasBottomLabel,
    topIsLifted,
    bottomIsLifted
  }) {
    /*
     Phase 1: push labels down
     For each label moving vertically down the hemisphere
       if it intersects with next neighbor
         then adjust all labels below so they dont intersect.
         During the adjustment if we hit the bottom of the canvas while adjusting, then completely terminate phase 1 and move to phase 2

     Phase 2: push labels up
        if phase 1 was cancelled, then start at the bottom and push labels up
          this should never run out of space because the font sizes of the labels have already been balanced so sum(fontheight) < canvasHeight

     Notes:
       * As soon as we have moved _a single label_ we must reposition the X coord of all labels
       * If at any point a label that has been adjusted has an between the radialLine and the labelLine that exceeds maxAngleBetweenRadialAndLabelLines,
         then throw an interrupt and exit the function
    */

    // NB fundamental for understanding : _.each iterations are cancelled if the fn returns false
    let phase1HitBottom = false
    let phase1LineAngleExceeded = false

    let lp = `${hemisphere}:DOWN` // lp = logPrefix
    const inBounds = (candidateIndex, arrayLength = outerLabelSet.length) => candidateIndex >= 0 && candidateIndex < arrayLength
    const isLast = (candidateIndex, arrayLength = outerLabelSet.length) => candidateIndex === arrayLength - 1

    const getPreviousShownLabel = (labelSet, startingIndex) => {
      while (startingIndex - 1 >= 0) {
        if (labelSet[startingIndex - 1].labelShown) { return labelSet[startingIndex - 1] }
        startingIndex--
      }
      return null
    }

    const upperBoundary = pieCenter.y - outerRadius - maxVerticalOffset + ((hasTopLabel) ? maxFontSize : 0)
    const lowerBoundary = pieCenter.y + outerRadius + maxVerticalOffset - ((hasBottomLabel) ? maxFontSize : 0)

    if (stages.downSweep) {
      labelLogger.debug(`${lp} start. Size ${outerLabelSet.length}`)
      _(outerLabelSet).each((frontierLabel, frontierIndex) => {
        labelLogger.debug(`${lp} frontier: ${pi(frontierLabel)}`)
        if (phase1HitBottom) { labelLogger.debug(`${lp} cancelled`); return terminateLoop }
        if (phase1LineAngleExceeded) { labelLogger.debug(`${lp} cancelled`); return terminateLoop }
        if (isLast(frontierIndex)) { return terminateLoop }
        if (frontierLabel.isTopApexLabel) { return continueLoop }
        if (frontierLabel.hide) { return continueLoop }

        const nextLabel = outerLabelSet[frontierIndex + 1]
        if (nextLabel.hide) { return continueLoop }

        if (frontierLabel.intersectsWith(nextLabel) || nextLabel.isCompletelyAbove(frontierLabel)) {
          labelLogger.debug(` ${lp} intersect ${pi(frontierLabel)} v ${pi(nextLabel)}`)
          _(_.range(frontierIndex + 1, outerLabelSet.length)).each((gettingPushedIndex) => {
            const alreadyAdjustedLabel = getPreviousShownLabel(outerLabelSet, gettingPushedIndex)
            if (!alreadyAdjustedLabel) { return continueLoop }

            const immediatePreviousNeighbor = outerLabelSet[gettingPushedIndex - 1]
            const immediatePreviousNeighborIsInInside = !immediatePreviousNeighbor.labelShown

            const gettingPushedLabel = outerLabelSet[gettingPushedIndex]
            if (gettingPushedLabel.hide) { return continueLoop }

            if (gettingPushedLabel.isBottomApexLabel) {
              labelLogger.debug(`  ${lp} attempt to push ${pi(gettingPushedLabel)} bottom label. cancelling inner`)
              phase1HitBottom = true
              return continueLoop
            }

            if (phase1HitBottom) {
              labelLogger.debug(`  ${lp} already hit bottom, placing ${pi(gettingPushedLabel)} at bottom`)
              // we need to place the remaining labels at the bottom so phase 2 will place them as we sweep "up" the hemisphere
              if (gettingPushedLabel.inLeftHalf) {
                gettingPushedLabel.setBottomMedialPoint({ x: pieCenter.x - spacingBetweenUpperTrianglesAndCenterMeridian, y: lowerBoundary })
              } else {
                gettingPushedLabel.setBottomMedialPoint({ x: pieCenter.x + spacingBetweenUpperTrianglesAndCenterMeridian, y: lowerBoundary })
              }
              return continueLoop
            }

            if (gettingPushedLabel.isLowerThan(alreadyAdjustedLabel) && !gettingPushedLabel.intersectsWith(alreadyAdjustedLabel)) {
              labelLogger.debug(`   ${lp} ${pi(alreadyAdjustedLabel)} and ${pi(gettingPushedLabel)} no intersect. cancelling inner`)
              return terminateLoop
            }

            if (canUseInnerLabelsInTheseQuadrants.includes(gettingPushedLabel.segmentQuadrant) && !immediatePreviousNeighborIsInInside) {
              try {
                labels.moveToInnerLabel({
                  label: gettingPushedLabel,
                  innerLabelSet,
                  innerLabelRadius,
                  innerRadius,
                  pieCenter
                })
                return continueLoop
              } catch (error) {
                if (error.isInterrupt && error.type === 'CannotMoveToInner') {
                  labelLogger.debug(`${lp} could not move ${pi(gettingPushedLabel)} to inner: "${error.description}". Proceed with adjustment`)
                } else {
                  throw error
                }
              }
            }

            const newY = alreadyAdjustedLabel.topLeftCoord.y + alreadyAdjustedLabel.height + minGap
            const deltaY = newY - gettingPushedLabel.topLeftCoord.y
            if (newY + gettingPushedLabel.height > lowerBoundary) {
              labelLogger.debug(`  ${lp} pushing ${pi(gettingPushedLabel)} exceeds canvas. placing remaining labels at bottom and cancelling inner`)
              phase1HitBottom = true

              if (gettingPushedLabel.inLeftHalf) {
                gettingPushedLabel.setBottomMedialPoint({ x: pieCenter.x - spacingBetweenUpperTrianglesAndCenterMeridian, y: lowerBoundary })
              } else {
                gettingPushedLabel.setBottomMedialPoint({ x: pieCenter.x + spacingBetweenUpperTrianglesAndCenterMeridian, y: lowerBoundary })
              }
              return continueLoop
            }

            const angleBetweenRadialAndLabelLinesBefore = gettingPushedLabel.angleBetweenLabelAndRadial

            let apexLabelCorrection = 0
            if ((gettingPushedLabel.topLeftCoord.x < pieCenter.x && hasTopLabel) ||
              (gettingPushedLabel.topLeftCoord.x > pieCenter.x && hasBottomLabel)) {
              apexLabelCorrection = maxFontSize + minGap
            }

            labels.adjustLabelToNewY({
              anchor: 'top',
              newY,
              labelRadius: outerLabelRadius,
              yRange: outerRadius + maxVerticalOffset - apexLabelCorrection,
              labelLiftOffAngle,
              labelDatum: gettingPushedLabel,
              pieCenter,
              horizontalPadding,
              topIsLifted,
              bottomIsLifted
            })

            const angleBetweenRadialAndLabelLinesAfter = gettingPushedLabel.angleBetweenLabelAndRadial
            labelLogger.debug(`  ${lp} pushing ${pi(gettingPushedLabel)} down by ${deltaY}. Angle before ${angleBetweenRadialAndLabelLinesBefore.toFixed(2)} and after ${angleBetweenRadialAndLabelLinesAfter.toFixed(2)}`)

            if (angleBetweenRadialAndLabelLinesAfter > maxAngleBetweenRadialAndLabelLines) {
              // throw new AngleThresholdExceeded(gettingPushedLabel)
              labelLogger.warn(`  ${lp} ${pi(gettingPushedLabel)} line angle exceeds threshold of ${maxAngleBetweenRadialAndLabelLines}. Cancelling downSweep.`)
              phase1LineAngleExceeded = true
              return terminateLoop
            }

            if (!inBounds(gettingPushedIndex + 1)) { return terminateLoop } // terminate
          })
        }
      })
    }

    if ((phase1HitBottom || phase1LineAngleExceeded) && stages.upSweep) {
      // throw away our attempt at inner labelling and start again wrt inner labels!
      // XXX NB TODO strictly speaking we can only throw out our quadrant/hemisphere worth of inner labels
      _(innerLabelSet).each(innerLabel => {
        const matchingOuterLabel = _.find(outerLabelSet, ({id: outerLabelId}) => outerLabelId === innerLabel.id)
        if (matchingOuterLabel) {
          matchingOuterLabel.labelShown = true
          if (matchingOuterLabel.inLeftHalf) {
            matchingOuterLabel.setBottomMedialPoint({ x: pieCenter.x - spacingBetweenUpperTrianglesAndCenterMeridian, y: lowerBoundary })
          } else {
            matchingOuterLabel.setBottomMedialPoint({ x: pieCenter.x + spacingBetweenUpperTrianglesAndCenterMeridian, y: lowerBoundary })
          }
        } else {
          console.error(`should have found matching outer label for inner label ${pi(innerLabel)}`)
        }
      })
      innerLabelSet.length = 0 // NB must preserve array references !

      // use the original sorted by Y list; when we hit bottom mid algorithm we just placed all the other labels at the bottom, so we can no longer use the label positions for ordering
      const reversedLabelSet = _.reverse(outerLabelSet)
      let lp = `${hemisphere}:UP` // lp = logPrefix
      let phase2HitTop = false

      labelLogger.debug(`${lp} start. Size ${reversedLabelSet.length}`)
      _(reversedLabelSet).each((frontierLabel, frontierIndex) => {
        labelLogger.debug(`${lp} frontier: ${pi(frontierLabel)}`)
        if (phase2HitTop) { labelLogger.debug(`${lp} cancelled`); return terminateLoop }
        if (isLast(frontierIndex)) { return terminateLoop }
        if (frontierLabel.isBottomApexLabel) { return continueLoop }
        if (frontierLabel.hide) { return continueLoop }

        const nextLabel = reversedLabelSet[frontierIndex + 1]
        if (nextLabel.hide) { return continueLoop }

        if (frontierLabel.intersectsWith(nextLabel) || nextLabel.isCompletelyBelow(frontierLabel)) {
          labelLogger.debug(` ${lp} intersect ${pi(frontierLabel)} v ${pi(nextLabel)}`)
          _(_.range(frontierIndex + 1, reversedLabelSet.length)).each((gettingPushedIndex) => {
            const alreadyAdjustedLabel = getPreviousShownLabel(reversedLabelSet, gettingPushedIndex)
            if (!alreadyAdjustedLabel) { return continueLoop }

            const immediatePreviousNeighbor = reversedLabelSet[gettingPushedIndex - 1]
            const immediatePreviousNeighborIsInInside = !immediatePreviousNeighbor.labelShown

            const gettingPushedLabel = reversedLabelSet[gettingPushedIndex]
            if (gettingPushedLabel.hide) { return continueLoop }

            if (gettingPushedLabel.isTopApexLabel) {
              labelLogger.debug(`  ${lp} attempt to push ${pi(gettingPushedLabel)} top label. cancelling inner`)
              phase2HitTop = true
              return terminateLoop
            }

            if (gettingPushedLabel.isHigherThan(alreadyAdjustedLabel) && !gettingPushedLabel.intersectsWith(alreadyAdjustedLabel)) {
              labelLogger.debug(`   ${lp} ${pi(alreadyAdjustedLabel)} and ${pi(gettingPushedLabel)} no intersect. cancelling inner`)
              return terminateLoop
            }

            if (canUseInnerLabelsInTheseQuadrants.includes(gettingPushedLabel.segmentQuadrant) && !immediatePreviousNeighborIsInInside) {
              try {
                labels.moveToInnerLabel({
                  label: gettingPushedLabel,
                  innerLabelSet,
                  innerLabelRadius,
                  innerRadius,
                  pieCenter
                })
                return continueLoop
              } catch (error) {
                if (error.isInterrupt && error.type === 'CannotMoveToInner') {
                  labelLogger.debug(`${lp} could not move ${pi(gettingPushedLabel)} to inner: "${error.description}". Proceed with adjustment`)
                } else {
                  throw error
                }
              }
            }

            const newY = alreadyAdjustedLabel.topLeftCoord.y - (gettingPushedLabel.height + minGap)
            const deltaY = gettingPushedLabel.topLeftCoord.y - newY
            if (newY < upperBoundary) {
              labelLogger.debug(`  ${lp} pushing ${pi(gettingPushedLabel)} exceeds canvas. cancelling inner`)
              phase2HitTop = true
              // return terminateLoop
              throw new AngleThresholdExceeded(gettingPushedLabel) // TODO better exception here
            }

            const angleBetweenRadialAndLabelLinesBefore = gettingPushedLabel.angleBetweenLabelAndRadial

            let apexLabelCorrection = 0
            if ((gettingPushedLabel.topLeftCoord.x < pieCenter.x && hasTopLabel) ||
              (gettingPushedLabel.topLeftCoord.x > pieCenter.x && hasBottomLabel)) {
              apexLabelCorrection = maxFontSize + minGap
            }

            labels.adjustLabelToNewY({
              anchor: 'top',
              newY,
              labelRadius: outerLabelRadius,
              yRange: outerRadius + maxVerticalOffset - apexLabelCorrection,
              labelLiftOffAngle,
              labelDatum: gettingPushedLabel,
              pieCenter,
              horizontalPadding,
              topIsLifted,
              bottomIsLifted
            })

            const angleBetweenRadialAndLabelLinesAfter = gettingPushedLabel.angleBetweenLabelAndRadial

            labelLogger.debug(`  ${lp} pushing ${pi(gettingPushedLabel)} up by ${deltaY}. Angle before ${angleBetweenRadialAndLabelLinesBefore.toFixed(2)} and after ${angleBetweenRadialAndLabelLinesAfter.toFixed(2)}`)

            if (angleBetweenRadialAndLabelLinesAfter > maxAngleBetweenRadialAndLabelLines) {
              throw new AngleThresholdExceeded(gettingPushedLabel)
            }

            if (!inBounds(gettingPushedIndex + 1)) { return terminateLoop }
          })
        }
      })

      // final check for left over line angle violators
      _(outerLabelSet).each(label => {
        const angleBetweenRadialAndLabelLine = label.angleBetweenLabelAndRadial
        if (angleBetweenRadialAndLabelLine > maxAngleBetweenRadialAndLabelLines) {
          labelLogger.warn(`  final pass found ${pi(label)} line angle exceeds threshold.`)
          throw new AngleThresholdExceeded(label)
        }
      })

      // final check for colliding labels
      const collidingLabels = findIntersectingLabels(outerLabelSet)
      if (collidingLabels.length > 0) {
        labelLogger.warn(`  final pass found ${collidingLabels.length} colliding labels.`)
        throw new AngleThresholdExceeded(collidingLabels[0]) // TODO make new exception
      }
    }
  },

  shortenTopAndBottom (pie) {
    this.shortenLiftedTopLabels(pie)
    this.shortenTopLabel(pie)
    this.shortenLiftedBottomLabels(pie)
    this.shortenBottomLabel(pie)
  },

  shortenLiftedTopLabels (pie) {
    if (pie.topIsLifted && pie.options.labels.stages.shortenTopAndBottom) {
      const labelPadding = parseFloat(pie.options.labels.outer.outerPadding)
      const outerRadiusYCoord = pie.pieCenter.y - pie.outerRadius

      const pointAtZeroDegreesAlongLabelOffset = {
        x: pie.pieCenter.x - pie.outerRadius - pie.labelOffset,
        y: pie.pieCenter.y
      }
      const labelLiftOffAngle = parseFloat(pie.options.labels.outer.liftOffAngle)
      const leftPointWhereTriangleMeetsLabelRadius = math.rotate(pointAtZeroDegreesAlongLabelOffset, pie.pieCenter, 90 - labelLiftOffAngle)
      const rightPointWhereTriangleMeetsLabelRadius = math.rotate(pointAtZeroDegreesAlongLabelOffset, pie.pieCenter, 90 + labelLiftOffAngle)

      const setsSortedBottomToTop = {
        left: _(pie.outerLabelData)
          .filter('inLeftHalf')
          .filter(({topY}) => topY <= leftPointWhereTriangleMeetsLabelRadius.y)
          .filter(({isTopApexLabel}) => !isTopApexLabel)
          .sortBy([({lineConnectorCoord}) => { return -1 * lineConnectorCoord.y }, ({id}) => { return -1 * id }])
          .value(),
        right: _(pie.outerLabelData)
          .filter('inRightHalf')
          .filter(({topY}) => topY <= rightPointWhereTriangleMeetsLabelRadius.y)
          .filter(({isTopApexLabel}) => !isTopApexLabel)
          .sortBy([({lineConnectorCoord}) => { return -1 * lineConnectorCoord.y }, ({id}) => { return -1 * id }])
          .value()
      }

      const excessLeftVerticalSpace = pie.maxVerticalOffset - pie.labelOffset - _(setsSortedBottomToTop.left).map('height').sum() - (setsSortedBottomToTop.left.length - 1) * labelPadding
      const excessRightVerticalSpace = pie.maxVerticalOffset - pie.labelOffset - _(setsSortedBottomToTop.right).map('height').sum() - (setsSortedBottomToTop.right.length - 1) * labelPadding
      const excessVerticalSpace = Math.min(excessLeftVerticalSpace, excessRightVerticalSpace)

      if (excessVerticalSpace <= 10) {
        console.log(`cancelling shortenLiftedTopLabels, there is not enough excess vertical space`)
        return
      }

      const leftNearestNeighborBelow = labels.nearestNeighborBelow(pie, _.first(setsSortedBottomToTop.left))
      const rightNearestNeighborBelow = labels.nearestNeighborBelow(pie, _.first(setsSortedBottomToTop.right))

      // NB the hardcoded 10s here are a sub optimal solution to prevent crowding around the leftPointWhereTriangleMeetsLabelRadius and rightPointWhereTriangleMeetsLabelRadius coords. Not sure why they are needed yet (TODO)
      const triangleLatitude = _([
        leftPointWhereTriangleMeetsLabelRadius.y - 5, // NB y coord of left and right are the same, so using left is OK
        (leftNearestNeighborBelow) ? leftNearestNeighborBelow.topY - 10 : null,
        (rightNearestNeighborBelow) ? rightNearestNeighborBelow.topY - 10 : null
      ])
        .filter(y => !_.isNull(y))
        .filter(y => !_.isUndefined(y))
        .min()

      let newMaxVerticalOffset = pie.maxVerticalOffset - excessVerticalSpace
      while (true) {
        labelLogger.info(`trying to shrink top with new maxVerticalOffset: ${newMaxVerticalOffset} (original: ${pie.maxVerticalOffset})`)
        // NB the hardcoded 5s here are a sub optimal solution to prevent crowding around the leftPointWhereTriangleMeetsLabelRadius and rightPointWhereTriangleMeetsLabelRadius coords
        const leftPlacementTriangleLine = [
          { x: leftPointWhereTriangleMeetsLabelRadius.x, y: triangleLatitude },
          { x: pie.pieCenter.x - spacingBetweenUpperTrianglesAndCenterMeridian, y: outerRadiusYCoord - newMaxVerticalOffset }
        ]

        const rightPlacementTriangleLine = [
          { x: rightPointWhereTriangleMeetsLabelRadius.x, y: triangleLatitude },
          { x: pie.pieCenter.x + spacingBetweenUpperTrianglesAndCenterMeridian, y: outerRadiusYCoord - newMaxVerticalOffset }
        ]

        _(setsSortedBottomToTop.left).each((label, index) => {
          const verticalLineThroughLabelConnector = [
            label.lineConnectorCoord,
            {x: label.lineConnectorCoord.x, y: pie.pieCenter.y}
          ]

          const intersection = math.computeIntersection(leftPlacementTriangleLine, verticalLineThroughLabelConnector)
          if (intersection) {
            const amountToMoveDownBy = intersection.y - label.lineConnectorCoord.y
            labelLogger.debug(`shorten top: left side: moving ${pi(label)} down by ${amountToMoveDownBy}`)
            label.moveStraightDownBy(amountToMoveDownBy)
          } else {
            labelLogger.error(`unexpected condition. could not compute intersection with new placementTriangleLine  and verticalLineThroughLabelConnector for ${label.labelText}`)
          }
        })

        _(setsSortedBottomToTop.right).each((label, index) => {
          const verticalLineThroughLabelConnector = [
            label.lineConnectorCoord,
            {x: label.lineConnectorCoord.x, y: pie.pieCenter.y}
          ]

          const intersection = math.computeIntersection(rightPlacementTriangleLine, verticalLineThroughLabelConnector)
          if (intersection) {
            const amountToMoveDownBy = intersection.y - label.lineConnectorCoord.y
            labelLogger.debug(`shorten top: right side: moving ${pi(label)} down by ${amountToMoveDownBy}`)
            label.moveStraightDownBy(amountToMoveDownBy)
          } else {
            labelLogger.error(`unexpected condition. could not compute intersection with new placementTriangleLine  and verticalLineThroughLabelConnector for ${label.labelText}`)
          }
        })

        const labelsToTestForCollision = _([
          labels.nearestNeighborBelow(pie, _.first(setsSortedBottomToTop.left)),
          setsSortedBottomToTop.left,
          setsSortedBottomToTop.right,
          labels.nearestNeighborBelow(pie, _.first(setsSortedBottomToTop.right))
        ])
          .flatten()
          .filter(label => !_.isNull(label))
          .filter(label => !_.isUndefined(label))
          .value()

        // NB findIntersectingLabels assumes sorted labels (for now)
        const collidingLabels = findIntersectingLabels(labelsToTestForCollision, 0)
        if (collidingLabels.length === 0) { break }
        labelLogger.debug(`shorten top: found ${collidingLabels.length} colliding labels`)

        // getting here implies collision, so lets increase the newMaxVerticalOffset and try again
        newMaxVerticalOffset = Math.min(newMaxVerticalOffset + 5, pie.maxVerticalOffset)

        if (newMaxVerticalOffset >= pie.maxVerticalOffset) { break }
      }
    }
  },

  shortenTopLabel (pie) {
    const topLabel = _(pie.outerLabelData).find('isTopApexLabel')
    if (topLabel) {
      const topLabelIndex = pie.outerLabelData.indexOf(topLabel)
      const nearestNeighbors = []
      if (topLabelIndex > 0) { nearestNeighbors.push(pie.outerLabelData[topLabelIndex - 1]) }
      if (topLabelIndex < pie.outerLabelData.length - 1) { nearestNeighbors.push(pie.outerLabelData[topLabelIndex + 1]) }
      const topYOfNearestLabel = _(nearestNeighbors).map('topLeftCoord.y').min()

      const newBottomYCoord = _.min([
        topYOfNearestLabel - parseFloat(pie.options.labels.outer.outerPadding),
        pie.pieCenter.y - pie.outerRadius - pie.labelOffset
      ])

      if (newBottomYCoord > topLabel.bottomLeftCoord.y) {
        topLabel.placeLabelViaConnectorCoord({ x: topLabel.lineConnectorCoord.x, y: newBottomYCoord })
      }
    }
  },

  shortenLiftedBottomLabels (pie) {
    if (pie.bottomIsLifted && pie.options.labels.stages.shortenTopAndBottom) {
      const labelPadding = parseFloat(pie.options.labels.outer.outerPadding)
      const outerRadiusYCoord = pie.pieCenter.y + pie.outerRadius

      const pointAtZeroDegreesAlongLabelOffset = {
        x: pie.pieCenter.x - pie.outerRadius - pie.labelOffset,
        y: pie.pieCenter.y
      }
      const labelLiftOffAngle = parseFloat(pie.options.labels.outer.liftOffAngle)
      const leftPointWhereTriangleMeetsLabelRadius = math.rotate(pointAtZeroDegreesAlongLabelOffset, pie.pieCenter, 270 + labelLiftOffAngle)
      const rightPointWhereTriangleMeetsLabelRadius = math.rotate(pointAtZeroDegreesAlongLabelOffset, pie.pieCenter, 270 - labelLiftOffAngle)

      const setsSortedTopToBottom = {
        left: _(pie.outerLabelData)
          .filter('inLeftHalf')
          .filter(({bottomY}) => bottomY >= leftPointWhereTriangleMeetsLabelRadius.y)
          .filter(({isBottomApexLabel}) => !isBottomApexLabel)
          .sortBy([({lineConnectorCoord}) => { return lineConnectorCoord.y }, ({id}) => { return -1 * id }])
          .value(),
        right: _(pie.outerLabelData)
          .filter('inRightHalf')
          .filter(({bottomY}) => bottomY >= rightPointWhereTriangleMeetsLabelRadius.y)
          .filter(({isBottomApexLabel}) => !isBottomApexLabel)
          .sortBy([({lineConnectorCoord}) => { return lineConnectorCoord.y }, ({id}) => { return -1 * id }])
          .value()
      }

      const excessLeftVerticalSpace = pie.maxVerticalOffset - pie.labelOffset - _(setsSortedTopToBottom.left).map('height').sum() - (setsSortedTopToBottom.left.length - 1) * labelPadding
      const excessRightVerticalSpace = pie.maxVerticalOffset - pie.labelOffset - _(setsSortedTopToBottom.right).map('height').sum() - (setsSortedTopToBottom.right.length - 1) * labelPadding
      const excessVerticalSpace = Math.min(excessLeftVerticalSpace, excessRightVerticalSpace)

      if (excessVerticalSpace <= 10) {
        console.log(`cancelling shortenLiftedBottomLabels, there is not enough excess vertical space`)
        return
      }

      const leftNearestNeighborAbove = labels.nearestNeighborAbove(pie, _.first(setsSortedTopToBottom.left))
      const rightNearestNeighborAbove = labels.nearestNeighborAbove(pie, _.first(setsSortedTopToBottom.right))

      // NB the hardcoded 10s here are a sub optimal solution to prevent crowding around the leftPointWhereTriangleMeetsLabelRadius and rightPointWhereTriangleMeetsLabelRadius coords. Not sure why they are needed yet (TODO)
      const triangleLatitude = _([
        leftPointWhereTriangleMeetsLabelRadius.y, // NB y coord of left and right are the same, so using left is OK
        (leftNearestNeighborAbove) ? leftNearestNeighborAbove.bottomY + 10 : null,
        (rightNearestNeighborAbove) ? rightNearestNeighborAbove.bottomY + 10 : null
      ])
        .filter(y => !_.isNull(y))
        .filter(y => !_.isUndefined(y))
        .max()

      let newMaxVerticalOffset = pie.maxVerticalOffset - excessVerticalSpace
      while (true) {
        labelLogger.info(`trying to shrink bottom with new maxVerticalOffset: ${newMaxVerticalOffset} (original: ${pie.maxVerticalOffset})`)

        const leftPlacementTriangleLine = [
          { x: leftPointWhereTriangleMeetsLabelRadius.x, y: triangleLatitude },
          { x: pie.pieCenter.x - spacingBetweenUpperTrianglesAndCenterMeridian, y: outerRadiusYCoord + newMaxVerticalOffset }
        ]

        const rightPlacementTriangleLine = [
          { x: rightPointWhereTriangleMeetsLabelRadius.x, y: triangleLatitude },
          { x: pie.pieCenter.x + spacingBetweenUpperTrianglesAndCenterMeridian, y: outerRadiusYCoord + newMaxVerticalOffset }
        ]

        _(setsSortedTopToBottom.left).each((label, index) => {
          const verticalLineThroughLabelConnector = [
            label.lineConnectorCoord,
            {x: label.lineConnectorCoord.x, y: pie.pieCenter.y}
          ]

          const intersection = math.computeIntersection(leftPlacementTriangleLine, verticalLineThroughLabelConnector)
          if (intersection) {
            const amountToMoveUpBy = label.lineConnectorCoord.y - intersection.y
            labelLogger.debug(`shorten bottom: left side: moving ${pi(label)} up by ${amountToMoveUpBy}`)
            label.moveStraightUpBy(amountToMoveUpBy)
          } else {
            labelLogger.error(`unexpected condition. could not compute intersection with new placementTriangleLine  and verticalLineThroughLabelConnector for ${label.labelText}`)
          }
        })

        _(setsSortedTopToBottom.right).each((label, index) => {
          const verticalLineThroughLabelConnector = [
            label.lineConnectorCoord,
            {x: label.lineConnectorCoord.x, y: pie.pieCenter.y}
          ]

          const intersection = math.computeIntersection(rightPlacementTriangleLine, verticalLineThroughLabelConnector)
          if (intersection) {
            const amountToMoveUpBy = label.lineConnectorCoord.y - intersection.y
            labelLogger.debug(`shorten bottom: right side: moving ${pi(label)} up by ${amountToMoveUpBy}`)
            label.moveStraightUpBy(amountToMoveUpBy)
          } else {
            labelLogger.error(`unexpected condition. could not compute intersection with new placementTriangleLine  and verticalLineThroughLabelConnector for ${label.labelText}`)
          }
        })

        const labelsToTestForCollision = _([
          labels.nearestNeighborAbove(pie, _.first(setsSortedTopToBottom.right)),
          setsSortedTopToBottom.right,
          setsSortedTopToBottom.left,
          labels.nearestNeighborAbove(pie, _.first(setsSortedTopToBottom.left))
        ])
          .flatten()
          .filter(label => !_.isNull(label))
          .filter(label => !_.isUndefined(label))
          .value()

        // NB findIntersectingLabels assumes sorted labels (for now)
        const collidingLabels = findIntersectingLabels(labelsToTestForCollision, 0)
        if (collidingLabels.length === 0) { break }
        labelLogger.debug(`shorten bottom: found ${collidingLabels.length} colliding labels`)

        // getting here implies collision, so lets increase the newMaxVerticalOffset and try again
        newMaxVerticalOffset = Math.min(newMaxVerticalOffset + 5, pie.maxVerticalOffset)

        if (newMaxVerticalOffset >= pie.maxVerticalOffset) { break }
      }
    }
  },

  shortenBottomLabel (pie) {
    const bottomLabel = _(pie.outerLabelData).find('isBottomApexLabel')
    if (bottomLabel) {
      const bottomLabelIndex = pie.outerLabelData.indexOf(bottomLabel)
      const nearestNeighbors = []
      if (bottomLabelIndex > 0) { nearestNeighbors.push(pie.outerLabelData[bottomLabelIndex - 1]) }
      if (bottomLabelIndex < pie.outerLabelData.length - 1) { nearestNeighbors.push(pie.outerLabelData[bottomLabelIndex + 1]) }
      const bottomYOfNearestLabel = _(nearestNeighbors).map('bottomLeftCoord.y').max()

      const newTopYCoord = _.max([
        bottomYOfNearestLabel + parseFloat(pie.options.labels.outer.outerPadding),
        pie.pieCenter.y + pie.outerRadius + pie.labelOffset
      ])

      if (newTopYCoord < bottomLabel.topLeftCoord.y) {
        bottomLabel.placeLabelViaConnectorCoord({ x: bottomLabel.lineConnectorCoord.x, y: newTopYCoord })
      }
    }
  },

  wrapAndFormatLabelUsingSvgApproximation ({
    parentContainer,
    labelText,
    fontSize,
    fontFamily,
    innerPadding,
    maxLabelWidth
  }) {
    let lines = splitIntoLines(labelText, maxLabelWidth, fontSize, fontFamily)
    const dimensions = lines.map(line => {
      return getLabelDimensionsUsingSvgApproximation(parentContainer, line, fontSize, fontFamily)
    })
    const widestLine = _(dimensions).map('width').max()
    const sumHeightAndPadding = _(dimensions).map('height').sum() + (lines.length - 1) * innerPadding

    return {
      lineHeight: dimensions[0].height,
      width: widestLine,
      height: sumHeightAndPadding,
      labelTextLines: lines
    }
  },

  buildLabelSet: function ({
    labelData,
    totalSize,
    minAngle,
    fontSize,
    fontFamily,
    displayPercentage,
    displayDecimals,
    displayPrefix,
    displaySuffix,
    innerPadding
}) {
    let cumulativeValue = 0

    return labelData
      .filter(({value}) => { return value * 360 / totalSize >= minAngle })
      .map((datum) => {
        const angleExtent = datum.value * 360 / totalSize
        const angleStart = cumulativeValue * 360 / totalSize
        cumulativeValue += datum.value

        return new OuterLabel({
          segmentAngleMidpoint: angleStart + angleExtent / 2,
          color: datum.color,
          fontFamily,
          fontSize,
          group: datum.group,
          id: datum.id,
          innerPadding,
          label: datum.label,
          totalValue: totalSize,
          value: datum.value,
          displayPercentage,
          displayDecimals,
          displayPrefix,
          displaySuffix
        })
      })
  },

  computeLabelStats: function (labelSet, outerlabelPadding = 1) {
    const leftLabels = _(labelSet).filter({hemisphere: 'left'}).value()
    const rightLabels = _(labelSet).filter({hemisphere: 'right'}).value()

    const minDataValue = _(labelSet)
      .map('value')
      .min()

    const maxDataValue = _(labelSet)
      .map('value')
      .max()

    let maxLeftSideLabelWidth = _(leftLabels)
      .map('width')
      .max() || 0

    let maxRightSideLabelWidth = _(rightLabels)
      .map('width')
      .max() || 0

    let maxLeftSideLabelHeight = _(leftLabels)
      .map('height')
      .max() || 0

    let maxRightSideLabelHeight = _(rightLabels)
      .map('height')
      .max() || 0

    let cumulativeLeftSideLabelHeight = _(leftLabels)
        .map('height')
        .sum() + outerlabelPadding * Math.max(0, (leftLabels.length - 1))

    let cumulativeRightSideLabelHeight = _(rightLabels)
        .map('height')
        .sum() + outerlabelPadding * Math.max(0, (rightLabels.length - 1))

    let fontSizeDistribution = _(labelSet).countBy('fontSize')

    let densities = _(labelSet)
      .countBy(labelDatum => {
        if (between(60, labelDatum.segmentAngleMidpoint, 120)) { return 'top' }
        if (between(240, labelDatum.segmentAngleMidpoint, 300)) { return 'bottom' }
        return 'middle'
      })
      .defaults({ top: 0, middle: 0, bottom: 0 })
      .value()

    return {
      densities,
      fontSizeDistribution, // TODO this is a lodash wrapped object (but it works ?)
      minDataValue,
      maxDataValue,
      maxLeftSideLabelWidth,
      maxRightSideLabelWidth,
      maxLabelWidth: Math.max(maxLeftSideLabelWidth, maxRightSideLabelWidth),
      maxLeftSideLabelHeight,
      maxRightSideLabelHeight,
      maxLabelHeight: Math.max(maxLeftSideLabelHeight, maxRightSideLabelHeight),
      cumulativeLeftSideLabelHeight,
      cumulativeRightSideLabelHeight
    }
  },

  // Current Assumptions / Limitations:
  //   * assuming that inner labels are added in order of fractionalValue descending,
  //       therefore if I cant place the current label, abort, leaving the existing inner labels as is (note this assumption is not valid, but in practice code works fine)
  moveToInnerLabel: function ({
    label,
    innerLabelSet,
    innerLabelRadius,
    innerRadius,
    pieCenter
  }) {
    const newInnerLabel = InnerLabel.fromOuterLabel(label)
    newInnerLabel.innerLabelRadius = innerLabelRadius
    newInnerLabel.innerRadius = innerRadius
    newInnerLabel.pieCenter = pieCenter
    const coordAtZeroDegreesAlongInnerPieDistance = {
      x: pieCenter.x - innerLabelRadius,
      y: pieCenter.y
    }

    const innerRadiusLabelCoord = math.rotate(coordAtZeroDegreesAlongInnerPieDistance, pieCenter, label.segmentAngleMidpoint)
    newInnerLabel.placeAlongFitLine(innerRadiusLabelCoord)

    if (!_.isEmpty(innerLabelSet)) {
      const previousLabel = _.last(innerLabelSet)

      const rightHemiAndNewShouldBeLower = (newInnerLabel.hemisphere === 'right' && newInnerLabel.segmentAngleMidpoint > previousLabel.segmentAngleMidpoint)
      const topLeftHemiAndNewShouldBeLower = (newInnerLabel.hemisphere === 'left' && between(0, newInnerLabel.segmentAngleMidpoint, 90) && newInnerLabel.segmentAngleMidpoint < previousLabel.segmentAngleMidpoint)
      const bottomLeftHemiAndNewShouldBeLower = (newInnerLabel.hemisphere === 'left' && between(270, newInnerLabel.segmentAngleMidpoint, 360) && newInnerLabel.segmentAngleMidpoint < previousLabel.segmentAngleMidpoint)

      // ignore cross hemispheres
      const newLabelShouldBeBelowPreviousLabel = (
        rightHemiAndNewShouldBeLower ||
        topLeftHemiAndNewShouldBeLower ||
        bottomLeftHemiAndNewShouldBeLower
      )

      const newLabelIsInOrderVertically = (newLabelShouldBeBelowPreviousLabel)
       ? newInnerLabel.isLowerThan(previousLabel)
       : newInnerLabel.isHigherThan(previousLabel)

      if (newInnerLabel.intersectsWith(previousLabel, 2) || !newLabelIsInOrderVertically) {
        if (newLabelShouldBeBelowPreviousLabel) {
          labelLogger.debug(`inner collision between ${pi(previousLabel)} v ${pi(newInnerLabel)}(new). Moving new down`)
          innerRadiusLabelCoord.y = previousLabel.topLeftCoord.y + previousLabel.height + 2 // TODO now have a couple hard coded 2's about

          // place X along innerLabelRadius based on new y position
          // Given the yOffset and the labelRadius, use pythagorem to compute the xOffset that places label along labelRadius
          const xOffset = Math.sqrt(Math.pow(innerLabelRadius, 2) - Math.pow(Math.abs(pieCenter.y - innerRadiusLabelCoord.y), 2))
          innerRadiusLabelCoord.x = (newInnerLabel.hemisphere === 'left')
            ? pieCenter.x - xOffset
            : pieCenter.x + xOffset

          newInnerLabel.setTopMedialPoint(innerRadiusLabelCoord)
        } else {
          labelLogger.debug(`inner collision between ${pi(previousLabel)} v ${pi(newInnerLabel)}(new). Moving new up`)
          innerRadiusLabelCoord.y = previousLabel.topLeftCoord.y - 2 // TODO now have a couple hard coded 2's about

          // place X along innerLabelRadius based on new y position
          // Given the yOffset and the labelRadius, use pythagorem to compute the xOffset that places label along labelRadius
          const xOffset = Math.sqrt(Math.pow(innerLabelRadius, 2) - Math.pow(Math.abs(pieCenter.y - innerRadiusLabelCoord.y), 2))
          innerRadiusLabelCoord.x = (newInnerLabel.hemisphere === 'left')
            ? pieCenter.x - xOffset
            : pieCenter.x + xOffset

          newInnerLabel.setBottomMedialPoint(innerRadiusLabelCoord)
        }
      }
    }

    const relativeToCenter = ({x, y}) => { return { x: x - pieCenter.x, y: y - pieCenter.y } }

    const topLeftCoordIsInArc = ptInArc(relativeToCenter(newInnerLabel.topLeftCoord), 0, innerRadius, 0, 360)
    const topRightCoordIsInArc = ptInArc(relativeToCenter(newInnerLabel.topRightCoord), 0, innerRadius, 0, 360)
    const bottomLeftCoordIsInArc = ptInArc(relativeToCenter(newInnerLabel.bottomLeftCoord), 0, innerRadius, 0, 360)
    const bottomRightCoordIsInArc = ptInArc(relativeToCenter(newInnerLabel.bottomRightCoord), 0, innerRadius, 0, 360)

    const labelIsContainedWithinArc = (
      topLeftCoordIsInArc &&
      topRightCoordIsInArc &&
      bottomLeftCoordIsInArc &&
      bottomRightCoordIsInArc
    )

    labelLogger.debug(`attempt to move ${pi(newInnerLabel)} to inner : ${labelIsContainedWithinArc ? 'succeed' : 'fail'}`)

    if (!labelIsContainedWithinArc) {
      throw new CannotMoveToInner(label, 'out of bounds after adjustment')
    }

    if (newInnerLabel.angleBetweenLabelAndRadial > 45) {
      throw new CannotMoveToInner(label, `label line angle excceds threshold (${newInnerLabel.angleBetweenLabelAndRadial} > ${45}`)
    }

    labelLogger.info(`placed ${pi(label)} inside`)
    innerLabelSet.push(newInnerLabel)
    label.labelShown = false
  },

  nearestNeighborAbove (pie, label) {
    try {
      if (!label) { return null }
      if (label.isTopApexLabel) { return null }

      const labelIndex = pie.outerLabelData.indexOf(label)
      if (labelIndex === -1) { return null }

      let labelAbove = null
      if (label.inTopLeftQuadrant) {
        labelAbove = pie.outerLabelData[labelIndex + 1]
      } else if (label.inTopRightQuadrant) {
        labelAbove = pie.outerLabelData[labelIndex - 1]
      } else if (label.inBottomLeftQuadrant) {
        if (labelIndex === pie.outerLabelData.length - 1) {
          labelAbove = _.first(pie.outerLabelData)
        } else {
          labelAbove = pie.outerLabelData[labelIndex + 1]
        }
      } else if (label.inBottomRightQuadrant) {
        labelAbove = pie.outerLabelData[labelIndex - 1]
      }

      // sanity check
      if (labelAbove.topLeftCoord.y < label.topLeftCoord.y) {
        return labelAbove
      } else {
        console.error(`nearestNeighborAbove yields incorrect results for label`, label)
        return null
      }
    } catch (e) {
      console.error(`nearestNeighborAbove failed on `, e)
      return null
    }
  },

  nearestNeighborBelow (pie, label) {
    try {
      if (!label) { return null }
      if (label.isBottomApexLabel) { return null }

      const labelIndex = pie.outerLabelData.indexOf(label)
      if (labelIndex === -1) { return null }

      let labelBelow = null
      if (label.inTopLeftQuadrant) {
        if (labelIndex === 0) {
          labelBelow = _.last(pie.outerLabelData)
        } else {
          labelBelow = pie.outerLabelData[labelIndex - 1]
        }
      } else if (label.inTopRightQuadrant) {
        labelBelow = pie.outerLabelData[labelIndex + 1]
      } else if (label.inBottomLeftQuadrant) {
        labelBelow = pie.outerLabelData[labelIndex - 1]
      } else if (label.inBottomRightQuadrant) {
        labelBelow = pie.outerLabelData[labelIndex + 1]
      }

      // sanity check
      if (labelBelow.topLeftCoord.y > label.topLeftCoord.y) {
        return labelBelow
      } else {
        console.error(`nearestNeighborBelow yields incorrect results for label`, label)
        return null
      }
    } catch (e) {
      console.error(`nearestNeighborAbove failed on `, e)
      return null
    }
  }
}

// helper function to print label. TODO make toString work
function pi (labelData) {
  const ellipsisThreshold = 11
  const labelName = (labelData.label.length > ellipsisThreshold)
    ? `${labelData.label.substr(0, ellipsisThreshold - 3)}...`
    : labelData.label
  // return `${labelName}(${labelData.id})`
  return labelName
}

module.exports = labels
