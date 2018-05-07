import _ from 'lodash'
import d3 from 'd3'
import { getLabelDimensionsUsingSvgApproximation, splitIntoLines, ptInArc } from './labelUtils'
import helpers from '../helpers'
import math from '../math'
import segments from '../segments'
import OuterLabel from './outerLabel'
import InnerLabel from './innerLabel'
import AngleThresholdExceeded from '../interrupts/angleThresholdExceeded'
import CannotMoveToInner from '../interrupts/cannotMoveToInner'
import * as rootLog from 'loglevel'
const labelLogger = rootLog.getLogger('label')

// const inclusiveBetween = (a, b, c) => (b >= a && b <= c)
// const exclusiveBetween = (a, b, c) => (b > a && b < c)
const between = (a, b, c) => (b >= a && b < c)

let labels = {
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
      const { width, height, labelTextLines } = labels.wrapAndFormatLabelUsingSvgApproximation({
        parentContainer,
        labelText: label.labelText,
        fontSize: label.fontSize,
        fontFamily: label.fontFamily,
        maxLabelWidth,
        innerPadding
      })

      return Object.assign(label, {
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
            const { width, height, labelTextLines } = labels.wrapAndFormatLabelUsingSvgApproximation({
              parentContainer,
              labelText: label.labelText,
              fontSize: newFontSize,
              fontFamily: label.fontFamily,
              maxLabelWidth,
              innerPadding
            })

            Object.assign(label, {
              fontSize: newFontSize,
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

    // niavely place label
    labels.computeInitialLabelCoordinates(pie)

    // adjust label positions to try to accommodate conflicts
    labels.performCollisionResolution(pie)

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
    const maxFontSize = _(pie.outerLabelData).map('fontSize').max()
    _(pie.outerLabelData).each(label => {
      labels.placeLabelAlongLabelRadiusWithLiftOffAngle({
        labelDatum: label,
        labelOffset: pie.labelOffset,
        maxVerticalOffset: parseFloat(pie.options.labels.outer.maxVerticalOffset),
        labelLiftOffAngle: parseFloat(pie.options.labels.outer.liftOffAngle),
        outerRadius: pie.outerRadius,
        pieCenter: pie.pieCenter,
        canvasHeight: parseFloat(pie.options.size.canvasHeight),
        maxFontSize
      })
    })
  },

  // TODO need to doc this using an image, and test that it lines up with computeXGivenY
  placeLabelAlongLabelRadiusWithLiftOffAngle: function ({
    labelDatum,
    labelOffset,
    maxVerticalOffset,
    labelLiftOffAngle,
    outerRadius,
    pieCenter,
    canvasHeight,
    maxFontSize
  }) {
    const angle = labelDatum.segmentAngleMidpoint
    let fitLineCoord = null

    const highYOffSetAngle = (angle) => (between(90 - labelLiftOffAngle, angle, 90 + labelLiftOffAngle) || between(270 - labelLiftOffAngle, angle, 270 + labelLiftOffAngle))
    const pointAtZeroDegrees = { x: pieCenter.x - outerRadius - labelOffset, y: pieCenter.y }

    if (highYOffSetAngle(angle)) {
      const radialCoord = math.rotate(pointAtZeroDegrees, pieCenter, angle)
      const radialLine = [pieCenter, radialCoord]

      const verticalWhiteSpace = canvasHeight / 2 - labelOffset - outerRadius
      const correctedMaxVerticalOffset = Math.max(maxVerticalOffset, labelOffset) // NB cannot set less than labelOffset
      const excessVerticalWhiteSpace = Math.max(0, verticalWhiteSpace - correctedMaxVerticalOffset)

      let placementLineCoord1 = (between(0, angle, 180))
        ? { x: pieCenter.x, y: excessVerticalWhiteSpace }
        : { x: pieCenter.x, y: canvasHeight - excessVerticalWhiteSpace - maxFontSize }

      let placementLineCoord2 = null
      if (between(0, angle, 90)) {
        placementLineCoord2 = math.rotate(pointAtZeroDegrees, pieCenter, 90 - labelLiftOffAngle)
      } else if (between(90, angle, 180)) {
        placementLineCoord2 = math.rotate(pointAtZeroDegrees, pieCenter, 90 + labelLiftOffAngle)
      } else if (between(180, angle, 270)) {
        placementLineCoord2 = math.rotate(pointAtZeroDegrees, pieCenter, 270 - labelLiftOffAngle)
      } else {
        placementLineCoord2 = math.rotate(pointAtZeroDegrees, pieCenter, 270 + labelLiftOffAngle)
      }

      const placementLine = [placementLineCoord1, placementLineCoord2]

      const intersection = math.computeIntersection(radialLine, placementLine)

      if (intersection) {
        fitLineCoord = intersection
      } else {
        labelLogger.error(`unexpected condition. could not compute intersection with placementLine for label ${labelDatum.label}`)
        fitLineCoord = math.rotate(pointAtZeroDegrees, pieCenter, angle)
      }
    } else {
      fitLineCoord = math.rotate(pointAtZeroDegrees, pieCenter, angle)
    }

    labelDatum.placeAlongFitLine(fitLineCoord)
  },

  drawOuterLabelLines: function (pie) {
    pie.outerLabelLines = pie.outerLabelData
      .map(labelData => {
        return labels.computeOuterLabelLine({
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

  computeOuterLabelLine: function ({ pieCenter, outerRadius, labelData }) {
    const pointAtZeroDegrees = { x: pieCenter.x - outerRadius, y: pieCenter.y }
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

    return [originCoords, mid, end]
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

    labels.correctOutOfBoundLabelsPreservingOrder({
      labelSet: pie.outerLabelData,
      pieCenter: pie.pieCenter,
      canvasHeight: parseFloat(pie.options.size.canvasHeight),
      canvasWidth: parseFloat(pie.options.size.canvasWidth),
      labelRadius: pie.outerRadius + pie.labelOffset,
      labelLiftOffAngle: parseFloat(pie.options.labels.outer.liftOffAngle),
      outerPadding: parseFloat(pie.options.labels.outer.outerPadding)
    })

    labels._performCollisionResolutionIteration({
      useInnerLabels: pie.options.labels.outer.innerLabels,
      minAngleThreshold: parseFloat(pie.options.data.minAngle),
      labelSet: pie.outerLabelData,
      minIncrement: parseFloat(pie.options.labels.outer.iterationMinIncrement),
      maxIncrement: parseFloat(pie.options.labels.outer.iterationMaxIncrement),
      breakOutAngleThreshold: 0.1,
      pie })
  },

  _performCollisionResolutionIteration ({ useInnerLabels, minAngleThreshold, labelSet, minIncrement, maxIncrement, breakOutAngleThreshold, pie }) {
    const clonedAndFilteredLabelSet = _.cloneDeep(labelSet).filter(labelDatum => labelDatum.fractionalValue > minAngleThreshold)
    labelLogger.info(`collision iteration started. minAngle=${minAngleThreshold}, beforeFilterCount=${labelSet.length}, afterFilterCount: ${clonedAndFilteredLabelSet.length}`)

    try {
      let { candidateOuterLabelSet, candidateInnerLabelSet } = labels._performCollisionResolutionAlgorithm(pie, clonedAndFilteredLabelSet, useInnerLabels)

      if (candidateOuterLabelSet.length > 0) {
        pie.outerLabelData = candidateOuterLabelSet
        pie.innerLabelData = candidateInnerLabelSet
      } else {
        labelLogger.error(`collision resolution failed: removed all labels!`)
      }
    } catch (error) {
      if (minAngleThreshold >= breakOutAngleThreshold) {
        labelLogger.error(`collision resolution failed: hit breakOutAngle: ${breakOutAngleThreshold}`)
        return
      }

      if (error.isInterrupt && error.type === 'AngleThresholdExceeded') {
        const offendingLabel = error.labelDatum
        labelLogger.warn(`collision iteration failed: label '${offendingLabel.label}' exceeded radial to labelLine angle threshold of ${pie.options.labels.outer.labelMaxLineAngle} (${offendingLabel.angleBetweenLabelAndRadial})`)
        let newMinAngleThrehsold = offendingLabel.fractionalValue
        if (newMinAngleThrehsold < minAngleThreshold + minIncrement) { newMinAngleThrehsold = minAngleThreshold + minIncrement }
        if (newMinAngleThrehsold > minAngleThreshold + maxIncrement) { newMinAngleThrehsold = minAngleThreshold + maxIncrement }

        labels._performCollisionResolutionIteration({
          useInnerLabels,
          minAngleThreshold: newMinAngleThrehsold,
          labelSet: labelSet, // NB it is the original labelset passed to next iteration, not the modified one
          breakOutAngleThreshold,
          minIncrement,
          maxIncrement,
          pie
        })
      } else {
        labelLogger.error(`collision resolution failed: unexpected error: ${error}`)
        labelLogger.error(error)
      }
    }
  },

  _performCollisionResolutionAlgorithm (pie, outerLabelSet, useInnerLabels) {
    const leftOuterLabelsSortedByVerticalPositionAscending = _(outerLabelSet)
      .filter({hemisphere: 'left'})
      .sortBy(['topLeftCoord.y', 'id'])
      .value()

    const rightOuterLabelsSortedByVerticalPositionAscending = _(outerLabelSet)
      .filter({hemisphere: 'right'})
      .sortBy('topLeftCoord.y')
      .value()

    const innerLabelSet = []
    const canUseInnerLabelsInTheseQuadrants = (useInnerLabels)
      // NB I cannot handle 2,3 because 3 will get placed first, but two are smaller segments,
      // and the inner collision assumes larger gets placed first
      // ? [4, 1, 2, 3]
      ? [1, 2, 3]
      // ? [2, 3]
      // ? [3]
      : []

    labels.performTwoPhaseLabelAdjustment({
      outerLabelSet: leftOuterLabelsSortedByVerticalPositionAscending,
      innerLabelSet,
      canUseInnerLabelsInTheseQuadrants,
      hemisphere: 'left',
      pieCenter: pie.pieCenter,
      canvasHeight: parseFloat(pie.options.size.canvasHeight),
      innerLabelRadius: pie.innerRadius - pie.labelOffset,
      innerRadius: pie.innerRadius,
      outerLabelRadius: pie.outerRadius + pie.labelOffset,
      horizontalPadding: parseFloat(pie.options.labels.mainLabel.horizontalPadding),
      labelLiftOffAngle: parseFloat(pie.options.labels.outer.liftOffAngle),
      maxAngleBetweenRadialAndLabelLines: parseFloat(pie.options.labels.outer.labelMaxLineAngle),
      minGap: parseFloat(pie.options.labels.outer.outerPadding)
    })

    labels.performTwoPhaseLabelAdjustment({
      outerLabelSet: rightOuterLabelsSortedByVerticalPositionAscending,
      innerLabelSet,
      canUseInnerLabelsInTheseQuadrants,
      hemisphere: 'right',
      pieCenter: pie.pieCenter,
      canvasHeight: parseFloat(pie.options.size.canvasHeight),
      innerLabelRadius: pie.innerRadius - pie.labelOffset,
      innerRadius: pie.innerRadius,
      outerLabelRadius: pie.outerRadius + pie.labelOffset,
      horizontalPadding: parseFloat(pie.options.labels.mainLabel.horizontalPadding),
      labelLiftOffAngle: parseFloat(pie.options.labels.outer.liftOffAngle),
      maxAngleBetweenRadialAndLabelLines: parseFloat(pie.options.labels.outer.labelMaxLineAngle),
      minGap: parseFloat(pie.options.labels.outer.outerPadding)
    })

    outerLabelSet = outerLabelSet.filter(label => label.labelShown)

    return {
      candidateOuterLabelSet: outerLabelSet,
      candidateInnerLabelSet: innerLabelSet
    }
  },

  adjustLabelToNewY ({
    anchor, // top or bottom
    newY,
    labelDatum,
    labelRadius,
    yRange,
    labelLiftOffAngle,
    pieCenter
  }) {
    let quadrant = null
    if (newY - pieCenter > 0) {
      quadrant = (labelDatum.hemisphere === 'left') ? 3 : 2
    } else {
      quadrant = (labelDatum.hemisphere === 'left') ? 4 : 1
    }

    let newLabelConnectorY = null
    // the newY could be the lineConnector coord or it could be the top of the label , in which case the lineConnector is the bottom of the label
    if (anchor === 'top') {
      if (quadrant === 4 || quadrant === 1) {
        newLabelConnectorY = newY + labelDatum.height
      } else {
        newLabelConnectorY = newY
      }
    } else if (anchor === 'bottom') {
      if (quadrant === 4 || quadrant === 1) {
        newLabelConnectorY = newY
      } else {
        newLabelConnectorY = newY - labelDatum.height
      }
    } else {
      throw new Error('not top nor bottom so wtf mate')
    }

    const yOffset = Math.abs(pieCenter.y - newLabelConnectorY)

    if (yOffset > yRange) {
      throw new Error(`yOffset(${yOffset}) cannot be greater than yRange(${yRange})`)
    }

    const labelLiftOffAngleInRadians = math.toRadians(labelLiftOffAngle)
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
      xOffset = yLengthOfLabelOnUpperTriangle * Math.tan(upperTriangleYAngleInRadians)
    }

    const newLineConnectorCoord = {
      x: (labelDatum.hemisphere === 'left') ? pieCenter.x - xOffset : pieCenter.x + xOffset,
      y: newY
    }

    // drawTheseCoords.push({ coord: newLineConnectorCoord, color: 'green', note: labelDatum.label})

    if (anchor === 'top') {
      if (quadrant === 4 || quadrant === 1) {
        labelDatum.setTopTouchPoint(newLineConnectorCoord)
      } else {
        labelDatum.setBottomTouchPoint(newLineConnectorCoord)
      }
    } else {
      if (quadrant === 4 || quadrant === 1) {
        labelDatum.setTopTouchPoint(newLineConnectorCoord)
      } else {
        labelDatum.setBottomTouchPoint(newLineConnectorCoord)
      }
    }
  },

  correctOutOfBoundLabelsPreservingOrder ({ labelSet, labelLiftOffAngle, labelRadius, canvasHeight, canvasWidth, pieCenter, outerPadding }) {
    const newYPositions = {}
    const useYFromLookupTableAndCorrectX = (yPositionLookupTable, anchor) => {
      return (labelDatum) => {
        labels.adjustLabelToNewY({
          anchor,
          newY: yPositionLookupTable[labelDatum.id],
          labelRadius,
          yRange: canvasHeight / 2,
          labelLiftOffAngle,
          labelDatum,
          pieCenter
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
    _(leftLabelsUnderBottom).each(useYFromLookupTableAndCorrectX(newYPositions, 'bottom'))
    _(rightLabelsUnderBottom).each(useYFromLookupTableAndCorrectX(newYPositions, 'bottom'))

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

  performTwoPhaseLabelAdjustment ({
    outerLabelSet,
    innerLabelSet,
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
    minGap
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
    const terminateLoop = false // NB this is odd. It's done for readability to make it more obvious what 'return false' does in a _.each loop
    const continueLoop = true // NB this is odd. It's done for readability to make it more obvious what 'return true' does in a _.each loop
    let phase1HitBottom = false

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

    labelLogger.debug(`${lp} start. Size ${outerLabelSet.length}`)
    _(outerLabelSet).each((frontierLabel, frontierIndex) => {
      labelLogger.debug(`${lp} frontier: ${pi(frontierLabel)}`)
      if (phase1HitBottom) { labelLogger.debug(`${lp} cancelled`); return terminateLoop }
      if (isLast(frontierIndex)) { return terminateLoop }
      if (frontierLabel.hide) { return continueLoop }

      const nextLabel = outerLabelSet[frontierIndex + 1]
      if (nextLabel.hide) { return continueLoop }

      if (frontierLabel.intersectsWith(nextLabel) || nextLabel.isCompletelyAbove(frontierLabel)) {
        labelLogger.debug(` ${lp} intersect ${pi(frontierLabel)} v ${pi(nextLabel)}`)

        // NB this option is only used on the label immediately after the frontier. This achieves the alternating pattern
        if (canUseInnerLabelsInTheseQuadrants.includes(nextLabel.segmentQuadrant)) {
          try {
            labels.moveToInnerLabel({
              label: nextLabel,
              innerLabelSet,
              innerLabelRadius,
              innerRadius,
              pieCenter
            })
            // return continueLoop
          } catch (error) {
            if (error.isInterrupt && error.type === 'CannotMoveToInner') {
              labelLogger.debug(`${lp} could not move ${pi(nextLabel)} to inner: "${error.description}". Proceed with adjustment`)
            } else {
              throw error
            }
          }
        }

        _(_.range(frontierIndex + 1, outerLabelSet.length)).each((gettingPushedIndex) => {
          const alreadyAdjustedLabel = getPreviousShownLabel(outerLabelSet, gettingPushedIndex)
          if (!alreadyAdjustedLabel) { return continueLoop }
          const gettingPushedLabel = outerLabelSet[gettingPushedIndex]
          if (gettingPushedLabel.hide) { return continueLoop }

          if (phase1HitBottom) {
            labelLogger.debug(`  ${lp} already hit bottom, placing ${pi(gettingPushedLabel)} at bottom`)
            // we need to place the remaining labels at the bottom so phase 2 will place them as we sweep "up" the hemisphere
            gettingPushedLabel.setBottomTouchPoint({ x: pieCenter.x, y: canvasHeight - minGap }) // TODO can I use adjustLabelToNewY ?
            return continueLoop
          }

          if (gettingPushedLabel.isLowerThan(alreadyAdjustedLabel) && !gettingPushedLabel.intersectsWith(alreadyAdjustedLabel)) {
            labelLogger.debug(`   ${lp} ${pi(alreadyAdjustedLabel)} and ${pi(gettingPushedLabel)} no intersect. cancelling inner`)
            return terminateLoop
          }

          const newY = alreadyAdjustedLabel.topLeftCoord.y + alreadyAdjustedLabel.height + minGap
          const deltaY = newY - gettingPushedLabel.topLeftCoord.y
          if (newY + gettingPushedLabel.height > canvasHeight) {
            labelLogger.debug(`  ${lp} pushing ${pi(gettingPushedLabel)} exceeds canvas. placing remaining labels at bottom and cancelling inner`)
            phase1HitBottom = true

            gettingPushedLabel.setBottomTouchPoint({ x: pieCenter.x, y: canvasHeight - minGap })  // TODO can I use adjustLabelToNewY ?
            return continueLoop
          }

          const angleBetweenRadialAndLabelLinesBefore = gettingPushedLabel.angleBetweenLabelAndRadial

          labels.adjustLabelToNewY({
            anchor: 'top',
            newY,
            labelRadius: outerLabelRadius,
            yRange: canvasHeight / 2,
            labelLiftOffAngle,
            labelDatum: gettingPushedLabel,
            pieCenter,
            horizontalPadding
          })

          const angleBetweenRadialAndLabelLinesAfter = gettingPushedLabel.angleBetweenLabelAndRadial
          labelLogger.debug(`  ${lp} pushing ${pi(gettingPushedLabel)} down by ${deltaY}. Angle before ${angleBetweenRadialAndLabelLinesBefore.toFixed(2)} and after ${angleBetweenRadialAndLabelLinesAfter.toFixed(2)}`)

          if (angleBetweenRadialAndLabelLinesAfter > maxAngleBetweenRadialAndLabelLines) {
            throw new AngleThresholdExceeded(gettingPushedLabel)
          }

          if (!inBounds(gettingPushedIndex + 1)) { return terminateLoop } // terminate
        })
      }
    })

    if (phase1HitBottom) {
      // aww shit now we gotta throw away our attempt at inner labelling and start again !
      // XXX NB TODO strictly speaking we can only throw out our quadrant worth of inner labels

      console.log(`resetting labelShown for ${_(innerLabelSet).map('id').value()}`)
      _(innerLabelSet).each(innerLabel => {
        const matchingOuterLabel = _.find(outerLabelSet, ({id: outerLabelId}) => outerLabelId === innerLabel.id)
        if (matchingOuterLabel) {
          matchingOuterLabel.labelShown = true
          matchingOuterLabel.setBottomTouchPoint({x: pieCenter.x, y: canvasHeight - minGap})  // TODO can I use adjustLabelToNewY ?
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
        if (frontierLabel.hide) { return continueLoop }

        const nextLabel = reversedLabelSet[frontierIndex + 1]
        if (nextLabel.hide) { return continueLoop }

        if (frontierLabel.intersectsWith(nextLabel) || nextLabel.isCompletelyBelow(frontierLabel)) {
          labelLogger.debug(` ${lp} intersect ${pi(frontierLabel)} v ${pi(nextLabel)}`)

          // NB this option is only used on the label immediately after the frontier. This achieves the alternating pattern
          if (canUseInnerLabelsInTheseQuadrants.includes(nextLabel.segmentQuadrant)) {
            try {
              labels.moveToInnerLabel({
                label: nextLabel,
                innerLabelSet,
                innerLabelRadius,
                innerRadius,
                pieCenter
              })
              // return continueLoop
            } catch (error) {
              if (error.isInterrupt && error.type === 'CannotMoveToInner') {
                labelLogger.debug(`${lp} could not move ${pi(nextLabel)} to inner: "${error.description}". Proceed with adjustment`)
              } else {
                throw error
              }
            }
          }

          _(_.range(frontierIndex + 1, reversedLabelSet.length)).each((gettingPushedIndex) => {
            const alreadyAdjustedLabel = getPreviousShownLabel(reversedLabelSet, gettingPushedIndex)
            if (!alreadyAdjustedLabel) { return continueLoop }

            const immediatePreviousNeighbor = reversedLabelSet[gettingPushedIndex - 1]
            const immediatePreviousNeighborIsInInside = !immediatePreviousNeighbor.labelShown

            const gettingPushedLabel = reversedLabelSet[gettingPushedIndex]
            if (gettingPushedLabel.hide) { return continueLoop }

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
                  labelLogger.debug(`${lp} could not move ${pi(nextLabel)} to inner: "${error.description}". Proceed with adjustment`)
                } else {
                  throw error
                }
              }
            }

            const newY = alreadyAdjustedLabel.topLeftCoord.y - (gettingPushedLabel.height + minGap)
            const deltaY = gettingPushedLabel.topLeftCoord.y - newY
            if (newY < 0) {
              labelLogger.debug(`  ${lp} pushing ${pi(gettingPushedLabel)} exceeds canvas. cancelling inner`)
              phase2HitTop = true
              return terminateLoop
            }

            const angleBetweenRadialAndLabelLinesBefore = gettingPushedLabel.angleBetweenLabelAndRadial

            labels.adjustLabelToNewY({
              anchor: 'top',
              newY,
              labelRadius: outerLabelRadius,
              yRange: canvasHeight / 2,
              yAngleThreshold: 30, // TODO configurable,
              labelDatum: gettingPushedLabel,
              labelLiftOffAngle,
              pieCenter,
              horizontalPadding
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
    displaySuffix
  }) {
    let cumulativeValue = 0
    return labelData
      .filter(({value}) => { return value * 360 / totalSize >= minAngle })
      .map((datum) => {
        const angleExtent = datum.value * 360 / totalSize
        const angleStart = cumulativeValue * 360 / totalSize
        cumulativeValue += datum.value

        return new OuterLabel({
          angleExtent,
          angleStart,
          color: datum.color,
          fontFamily,
          fontSize,
          group: datum.group,
          id: datum.id,
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

          newInnerLabel.setTopTouchPoint(innerRadiusLabelCoord)
        } else {
          labelLogger.debug(`inner collision between ${pi(previousLabel)} v ${pi(newInnerLabel)}(new). Moving new up`)
          innerRadiusLabelCoord.y = previousLabel.topLeftCoord.y - 2 // TODO now have a couple hard coded 2's about

          // place X along innerLabelRadius based on new y position
          // Given the yOffset and the labelRadius, use pythagorem to compute the xOffset that places label along labelRadius
          const xOffset = Math.sqrt(Math.pow(innerLabelRadius, 2) - Math.pow(Math.abs(pieCenter.y - innerRadiusLabelCoord.y), 2))
          innerRadiusLabelCoord.x = (newInnerLabel.hemisphere === 'left')
            ? pieCenter.x - xOffset
            : pieCenter.x + xOffset

          newInnerLabel.setBottomTouchPoint(innerRadiusLabelCoord)
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

    labelLogger.info(`placed ${pi(label)} inside`) // you are here
    innerLabelSet.push(newInnerLabel)
    label.labelShown = false
  }
}

// helper function to print label. TODO make toString work
function pi (labelData) {
  const labelName = (labelData.label.length > 6)
    ? `${labelData.label.substr(0, 6)}...`
    : labelData.label
  // return `${labelName}(${labelData.id})`
  return labelName
}

module.exports = labels
