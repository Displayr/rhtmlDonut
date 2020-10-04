import {
  findLabelsIntersecting,
  findLabelsExceedingMaxLabelLineAngle,
  findLabelsOutOfBounds,
} from '../labelUtils'
import _ from 'lodash'
import * as rootLog from 'loglevel'
import UnexpectedCondition from '../../interrupts/unexpectedCondition'
const labelLogger = rootLog.getLogger('label')

/*
    start top left quadrant
      check for collision in top left quadrant
        if collision
          for I in [0,10,...,maxLabelLineAngle]
            set biggest at labelLineAngle I below segment, then start placing as we move up
              break when we can place all
          if all placed, move on, if not then lift and try the whole thing again
        if no collisions move on

    start right hemisphere
      NB if collisions in left hemi, assume collisions in right hemi

      check for collision in right hemisphere
          for I in [0,10,...,maxLabelLineAngle]
            set biggest at labelLineAngle I below segment, then start placing as we move up
              break when we can place all
          if all placed, move on, if not then lift and try the whole thing again
      if no collisions move on

    same for last quadrant
 */

// TODO handle lifting. Currently assuming it will always lift
const performDescendingOrderCollisionResolution = (pie, outerLabeller) => {
  const getMaxInvalidValue = getMaxInvalidValueFactory(pie)
  const moveLabelsDown = moveLabelsDownFactory(pie, outerLabeller)
  const moveLabelsUp = moveLabelsUpFactory(pie, outerLabeller)

  let minValue = 0
  const ignoreThreshold = 0.1
  const labelsToIgnore = pie.outerLabelData.filter(label => label.fractionalValue > ignoreThreshold)
  const labelsToPlace = pie.outerLabelData.filter(label => label.fractionalValue <= ignoreThreshold)

  const { newMinValue: topLeftMinValue, acceptedLabels: topLeftAcceptedLabels } = placeTopLeft({
    minValue,
    existingLabels: labelsToIgnore,
    labelSet: labelsToPlace,
    pie,
    outerLabeller,
    getMaxInvalidValue,
    moveLabelsDown,
    moveLabelsUp,
  })
  minValue = topLeftMinValue

  const { newMinValue: rightMinValue, acceptedLabels: rightAcceptedLabels } = placeRight({
    minValue,
    existingLabels: labelsToIgnore.concat(topLeftAcceptedLabels),
    labelSet: labelsToPlace,
    pie,
    outerLabeller,
    getMaxInvalidValue,
    moveLabelsDown,
    moveLabelsUp,
  })
  minValue = rightMinValue

  const { newMinValue: bottomLeftMinValue, acceptedLabels: bottomLeftAcceptedLabels } = placeBottomLeft({
    minValue,
    existingLabels: labelsToIgnore.concat(topLeftAcceptedLabels).concat(rightAcceptedLabels),
    labelSet: labelsToPlace,
    pie,
    outerLabeller,
    getMaxInvalidValue,
    moveLabelsDown,
    moveLabelsUp,
  })
  minValue = bottomLeftMinValue

  pie.outerLabelData = _([
    labelsToIgnore,
    topLeftAcceptedLabels,
    rightAcceptedLabels,
    bottomLeftAcceptedLabels,
  ])
    .flatten()
    .sortBy('value')
    .reverse()
    .value()
}

const placeTopLeft = ({ minValue: currentMinValue, existingLabels, labelSet, pie, outerLabeller, getMaxInvalidValue, moveLabelsDown, moveLabelsUp }) => {
  let acceptedLabels = null
  let newMinValue = null

  const maxLineAngleValue = parseFloat(pie.options.labels.segment.labelMaxLineAngle)
  const canvasHeight = parseFloat(pie.options.size.canvasHeight)
  const topIsLifted = true
  const bottomIsLifted = true

  const topLeftLabels = _(labelSet)
    .filter('inTopLeftQuadrant')
    .filter(({ value }) => value > currentMinValue)
    .value()
  const collisionsInTopLeft = findLabelsIntersecting(existingLabels.concat(topLeftLabels))

  if (collisionsInTopLeft.length === 0) {
    acceptedLabels = topLeftLabels
  } else {
    const getLargestLabel = labelSet => labelSet[0]
    labelLogger.info('descending placement: top left: collisions detected')
    const stepSize = 5

    // loop conditions
    let allLabelsSuccessfullyPlaced = false
    let largestLabelExceedsMaxLabelLineAngle = false
    let haveHitBottom = false

    // data structures to persist out of loop
    let workingLabelSet = null
    let lastPlacementLabelSet = null

    // each iteration: move the starting point of the "lowest and largest" label lower,
    //   and then place the remaining labels going up
    let startingBottomYPositionOfBiggestLabel = getLargestLabel(topLeftLabels).maxY
    while (!allLabelsSuccessfullyPlaced && !haveHitBottom && !largestLabelExceedsMaxLabelLineAngle) {
      startingBottomYPositionOfBiggestLabel += stepSize
      if (startingBottomYPositionOfBiggestLabel > canvasHeight) {
        haveHitBottom = true
        break
      }

      workingLabelSet = _.cloneDeep(topLeftLabels)
      const {
        collidingLabels,
        outOfBoundsLabels,
        maxAngleExceededLabels,
      } = moveLabelsUp({
        phase: 'top left',
        placedSet: existingLabels,
        labelSet: workingLabelSet,
        startingY: startingBottomYPositionOfBiggestLabel,
        topIsLifted,
        bottomIsLifted,
      })

      allLabelsSuccessfullyPlaced = _.isEmpty(collidingLabels) && _.isEmpty(outOfBoundsLabels) && _.isEmpty(maxAngleExceededLabels)

      if (getLargestLabel(workingLabelSet).labelLineAngle > maxLineAngleValue) {
        largestLabelExceedsMaxLabelLineAngle = true
        break
      }

      lastPlacementLabelSet = workingLabelSet
    }

    if (allLabelsSuccessfullyPlaced) {
      labelLogger.info('descending placement: top left: worked - all labels placed')
      acceptedLabels = workingLabelSet
    } else if (largestLabelExceedsMaxLabelLineAngle) {
      labelLogger.info('descending placement: top left: Largest label exceeds maxLabelLineAngle')

      // must use the previous run, not the current run, because currently this test run after mod of workingSet
      if (lastPlacementLabelSet) {
        newMinValue = getMaxInvalidValue({ placedSet: existingLabels, workingSet: lastPlacementLabelSet })

        acceptedLabels = lastPlacementLabelSet
          .filter(label => label.value > newMinValue)
      }
    } else if (haveHitBottom) {
      // NB this condition should be impossible as maxLineAngle will always be exceeded before we go off bottom,
      // but for symmetry with placeRight and placeBottomLeft we keep it
      labelLogger.info('descending placement: top left: Hit bottom')

      if (workingLabelSet) {
        newMinValue = getMaxInvalidValue({ placedSet: existingLabels, workingSet: workingLabelSet })
        acceptedLabels = workingLabelSet.filter(label => label.value > newMinValue)
      }
    } else {
      throw new UnexpectedCondition('descending placement: top left: Unexplained loop break')
    }
  }

  return { newMinValue, acceptedLabels }
}

const placeRight = ({ existingLabels, labelSet, minValue: currentMinValue, pie, outerLabeller, getMaxInvalidValue, moveLabelsDown, moveLabelsUp }) => {
  let acceptedLabels = null
  let newMinValue = null

  const maxLineAngleValue = parseFloat(pie.options.labels.segment.labelMaxLineAngle)
  const topIsLifted = true
  const bottomIsLifted = true

  const rightLabels = _(labelSet)
    .filter('inRightHalf')
    .filter(({ value }) => value > currentMinValue)
    .value()
  const collisionsInRight = findLabelsIntersecting(existingLabels.concat(rightLabels))

  if (collisionsInRight.length === 0) {
    acceptedLabels = rightLabels
  } else {
    const getLargestLabel = labelSet => labelSet[0]
    labelLogger.info('descending placement: right: collisions detected')

    const stepSize = 5

    // loop conditions
    let allLabelsSuccessfullyPlaced = false
    let largestLabelExceedsMaxLabelLineAngle = false
    let haveHitTop = false

    // data structures to persist out of loop
    let workingLabelSet = null
    let lastPlacementLabelSet = null

    // each iteration: move the starting point of the "highest and largest" label higher,
    //   and then place the remaining labels going down
    let startingTopYPositionOfBiggestLabel = getLargestLabel(rightLabels).minY
    while (!allLabelsSuccessfullyPlaced && !haveHitTop && !largestLabelExceedsMaxLabelLineAngle) {
      workingLabelSet = _.cloneDeep(rightLabels)
      const {
        collidingLabels,
        outOfBoundsLabels,
        maxAngleExceededLabels,
      } = moveLabelsDown({
        phase: 'right',
        placedSet: existingLabels,
        labelSet: workingLabelSet,
        startingY: startingTopYPositionOfBiggestLabel,
        topIsLifted,
        bottomIsLifted,
      })

      allLabelsSuccessfullyPlaced = _.isEmpty(collidingLabels) && _.isEmpty(outOfBoundsLabels) && _.isEmpty(maxAngleExceededLabels)

      if (getLargestLabel(workingLabelSet).labelLineAngle > maxLineAngleValue) {
        largestLabelExceedsMaxLabelLineAngle = true
        break
      }

      startingTopYPositionOfBiggestLabel -= stepSize
      if (startingTopYPositionOfBiggestLabel < 0) {
        haveHitTop = true
        break
      }

      lastPlacementLabelSet = workingLabelSet
    }

    if (allLabelsSuccessfullyPlaced) {
      labelLogger.info('descending placement: right: worked - all labels placed')
      acceptedLabels = workingLabelSet
    } else if (largestLabelExceedsMaxLabelLineAngle) {
      labelLogger.info('descending placement: right: Largest label exceeds maxLabelLineAngle')

      // must use the previous run, not the current run, because currently the largestLabelExceedsMaxLabelLineAngle test run after modification of workingSet, therefore workingset at this point is "one loop iteration too far"
      if (lastPlacementLabelSet) {
        newMinValue = getMaxInvalidValue({ placedSet: existingLabels, workingSet: lastPlacementLabelSet })
        acceptedLabels = lastPlacementLabelSet.filter(label => label.value > newMinValue)
      }
    } else if (haveHitTop) {
      labelLogger.info('descending placement: right: Hit top')

      if (workingLabelSet) {
        newMinValue = getMaxInvalidValue({ placedSet: existingLabels, workingSet: workingLabelSet })
        acceptedLabels = workingLabelSet.filter(label => label.value > newMinValue)
      }
    } else {
      throw new UnexpectedCondition('descending placement: right: Unexplained loop break')
    }
  }

  return { newMinValue, acceptedLabels }
}

const placeBottomLeft = ({ minValue: currentMinValue, existingLabels, labelSet, pie, outerLabeller, getMaxInvalidValue, moveLabelsDown, moveLabelsUp }) => {
  let acceptedLabels = null
  let newMinValue = null

  const maxLineAngleValue = parseFloat(pie.options.labels.segment.labelMaxLineAngle)
  const canvasHeight = parseFloat(pie.options.size.canvasHeight)
  const topIsLifted = true
  const bottomIsLifted = true

  const bottomLeftLabels = _(labelSet)
    .filter('inBottomLeftQuadrant')
    .filter(({ value }) => value > currentMinValue)
    .value()
  const collisionsInBottomLeft = findLabelsIntersecting(existingLabels.concat(bottomLeftLabels))

  if (collisionsInBottomLeft.length === 0) {
    acceptedLabels = bottomLeftLabels
  } else {
    const getLargestLabel = labelSet => labelSet[0]
    labelLogger.info('descending placement: bottom left: collisions detected')
    const stepSize = 5

    // loop conditions
    let allLabelsSuccessfullyPlaced = false
    let largestLabelExceedsMaxLabelLineAngle = false
    let haveHitBottom = false

    // data structures to persist out of loop
    let workingLabelSet = null
    let lastPlacementLabelSet = null

    // each iteration: move the starting point of the "lowest and largest" label lower,
    //   and then place the remaining labels going up
    let startingBottomYPositionOfBiggestLabel = getLargestLabel(bottomLeftLabels).maxY
    while (!allLabelsSuccessfullyPlaced && !haveHitBottom && !largestLabelExceedsMaxLabelLineAngle) {
      startingBottomYPositionOfBiggestLabel += stepSize
      if (startingBottomYPositionOfBiggestLabel > canvasHeight) {
        haveHitBottom = true
        break
      }

      workingLabelSet = _.cloneDeep(bottomLeftLabels)
      const {
        collidingLabels,
        outOfBoundsLabels,
        maxAngleExceededLabels,
      } = moveLabelsUp({
        phase: 'bottom left',
        placedSet: existingLabels,
        labelSet: workingLabelSet,
        startingY: startingBottomYPositionOfBiggestLabel,
        topIsLifted,
        bottomIsLifted,
      })

      allLabelsSuccessfullyPlaced = _.isEmpty(collidingLabels) && _.isEmpty(outOfBoundsLabels) && _.isEmpty(maxAngleExceededLabels)

      if (getLargestLabel(workingLabelSet).labelLineAngle > maxLineAngleValue) {
        largestLabelExceedsMaxLabelLineAngle = true
        break
      }

      lastPlacementLabelSet = workingLabelSet
    }

    if (allLabelsSuccessfullyPlaced) {
      labelLogger.info('descending placement: bottom left: worked - all labels placed')
      acceptedLabels = workingLabelSet
    } else if (largestLabelExceedsMaxLabelLineAngle) {
      labelLogger.info('descending placement: bottom left: Largest label exceeds maxLabelLineAngle')

      // must use the previous run, not the current run, because currently this test run after mod of workingSet
      if (lastPlacementLabelSet) {
        newMinValue = getMaxInvalidValue({ placedSet: existingLabels, workingSet: lastPlacementLabelSet })

        acceptedLabels = lastPlacementLabelSet
          .filter(label => label.value > newMinValue)
      }
    } else if (haveHitBottom) {
      labelLogger.info('descending placement: bottom left: Hit bottom')

      if (workingLabelSet) {
        newMinValue = getMaxInvalidValue({ placedSet: existingLabels, workingSet: workingLabelSet })
        acceptedLabels = workingLabelSet.filter(label => label.value > newMinValue)
      }
    } else {
      throw new UnexpectedCondition('descending placement: bottom left: Unexplained loop break')
    }
  }

  return { newMinValue, acceptedLabels }
}

const getMaxInvalidValueFactory = (pie) => {
  const maxLineAngleValue = parseFloat(pie.options.labels.segment.labelMaxLineAngle)
  const canvasHeight = parseFloat(pie.options.size.canvasHeight)
  const canvasWidth = parseFloat(pie.options.size.canvasWidth)

  return ({ workingSet, placedSet }) => _([
    findLabelsIntersecting(placedSet.concat(workingSet)),
    findLabelsOutOfBounds(workingSet, canvasWidth, canvasHeight),
    findLabelsExceedingMaxLabelLineAngle(workingSet, maxLineAngleValue),
  ])
    .flatten()
    .map('value')
    .max()
}

const moveLabelsDownFactory = (pie, outerLabeller) => {
  const maxLineAngleValue = parseFloat(pie.options.labels.segment.labelMaxLineAngle)
  const canvasWidth = parseFloat(pie.options.size.canvasWidth)
  const canvasHeight = parseFloat(pie.options.size.canvasHeight)
  const labelRadius = pie.outerRadius + pie.labelOffset
  const outerRadius = pie.outerRadius
  const maxVerticalOffset = pie.maxVerticalOffset
  const apexLabelCorrection = 0 // TODO may need this
  const labelLiftOffAngle = parseFloat(pie.options.labels.segment.liftOffAngle)
  const pieCenter = pie.pieCenter
  const minGap = parseFloat(pie.options.labels.segment.outerPadding)

  return ({ phase, placedSet, labelSet, startingY, topIsLifted, bottomIsLifted }) => {
    _(labelSet).each((labelDatum, index) => {
      const newY = (index === 0)
        ? startingY
        : labelSet[index - 1].maxY + minGap

      outerLabeller.adjustLabelToNewY({
        anchor: 'top',
        newY: Math.min(canvasHeight - labelDatum.height, newY),
        labelRadius,
        yRange: outerRadius + maxVerticalOffset - apexLabelCorrection,
        labelLiftOffAngle,
        labelDatum: labelDatum,
        pieCenter,
        topIsLifted,
        bottomIsLifted,
      })
    })

    const collidingLabels = findLabelsIntersecting(placedSet.concat(labelSet))
    const outOfBoundsLabels = findLabelsOutOfBounds(labelSet, canvasWidth, canvasHeight)
    const maxAngleExceededLabels = findLabelsExceedingMaxLabelLineAngle(labelSet, maxLineAngleValue)

    const largestLabel = labelSet[0]
    labelLogger.info(`descending placement: ${phase}: placement offset for ${largestLabel.shortText} : ${startingY.toFixed(2)} (labelLineAngle: ${largestLabel.labelLineAngle.toFixed(2)}`, {
      collidingLabels: collidingLabels.map(({ shortText }) => shortText).join(','),
      outOfBoundsLabels: outOfBoundsLabels.map(({ shortText }) => shortText).join(','),
      maxAngleExceededLabels: maxAngleExceededLabels.map(({ shortText, labelLineAngle }) => `${shortText}:${labelLineAngle.toFixed(2)}`).join(','),
    })

    return {
      collidingLabels,
      outOfBoundsLabels,
      maxAngleExceededLabels,
    }
  }
}

const moveLabelsUpFactory = (pie, outerLabeller) => {
  const maxLineAngleValue = parseFloat(pie.options.labels.segment.labelMaxLineAngle)
  const canvasWidth = parseFloat(pie.options.size.canvasWidth)
  const canvasHeight = parseFloat(pie.options.size.canvasHeight)
  const labelRadius = pie.outerRadius + pie.labelOffset
  const outerRadius = pie.outerRadius
  const maxVerticalOffset = pie.maxVerticalOffset
  const apexLabelCorrection = 0 // TODO may need this
  const labelLiftOffAngle = parseFloat(pie.options.labels.segment.liftOffAngle)
  const pieCenter = pie.pieCenter
  const minGap = parseFloat(pie.options.labels.segment.outerPadding)

  return ({ phase, placedSet, labelSet, startingY, topIsLifted, bottomIsLifted }) => {
    _(labelSet).each((labelDatum, index) => {
      const newY = (index === 0)
        ? startingY
        : labelSet[index - 1].minY - minGap

      outerLabeller.adjustLabelToNewY({
        anchor: 'bottom',
        newY: Math.max(labelDatum.height, newY),
        labelRadius,
        yRange: outerRadius + maxVerticalOffset - apexLabelCorrection,
        labelLiftOffAngle,
        labelDatum: labelDatum,
        pieCenter,
        topIsLifted,
        bottomIsLifted,
      })
    })

    const collidingLabels = findLabelsIntersecting(placedSet.concat(labelSet))
    const outOfBoundsLabels = findLabelsOutOfBounds(labelSet, canvasWidth, canvasHeight)
    const maxAngleExceededLabels = findLabelsExceedingMaxLabelLineAngle(labelSet, maxLineAngleValue)

    const largestLabel = labelSet[0]
    labelLogger.info(`descending placement: ${phase}: placement offset for ${largestLabel.shortText} : ${startingY.toFixed(2)} (labelLineAngle: ${largestLabel.labelLineAngle.toFixed(2)}`, {
      collidingLabels: collidingLabels.map(({ shortText }) => shortText).join(','),
      outOfBoundsLabels: outOfBoundsLabels.map(({ shortText }) => shortText).join(','),
      maxAngleExceededLabels: maxAngleExceededLabels.map(({ shortText, labelLineAngle }) => `${shortText}:${labelLineAngle.toFixed(2)}`).join(','),
    })

    return {
      collidingLabels,
      outOfBoundsLabels,
      maxAngleExceededLabels,
    }
  }
}

module.exports = performDescendingOrderCollisionResolution
