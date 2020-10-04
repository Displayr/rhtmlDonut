const _ = require('lodash')

// compute these stats
// independent:
//   * min duration
// * max duration
// * average duration
// * median duration
//
// first pass: use positional index as identifier
// after: incorporate scenario into stats and use as identifier
// * regen local link
//

function compareTwoTestRuns ({ baseline, candidate }) {
  console.log(`using ${baseline.batchName} as baseline`)
  console.log(`using ${candidate.batchName} as candidate`)

  const independentStats = {
    baseline: computeIndependent(baseline.tests),
    candidate: computeIndependent(candidate.tests),
  }

  printIndependentStats(independentStats)

  const mergedTests = getMergedTests({ baseline: baseline.tests, candidate: candidate.tests })

  computeDistributions(mergedTests)

  computeComparison(mergedTests)

  return mergedTests
}

function computeIndependent (testStatArray) {
  const stats = {
    min_duration: _(testStatArray).map('totalDuration').min().toFixed(0),
    max_duration: _(testStatArray).map('totalDuration').max().toFixed(0),
    average_duration: _(testStatArray).meanBy('totalDuration').toFixed(0),
    median_duration: median(_(testStatArray).map('totalDuration').value()).toFixed(0),
  }
  return stats
}

function printIndependentStats ({ baseline: a, candidate: b }) {
  console.log(`
                            baseline : candidate
   min_duration           : ${a.min_duration.padEnd(8, ' ')} : ${b.min_duration.padEnd(8, ' ')} 
   max_duration           : ${a.max_duration.padEnd(8, ' ')} : ${b.max_duration.padEnd(8, ' ')} 
   average_duration       : ${a.average_duration.padEnd(8, ' ')} : ${b.average_duration.padEnd(8, ' ')} 
   median_duration        : ${a.median_duration.padEnd(8, ' ')} : ${b.median_duration.padEnd(8, ' ')} 
  `)
}

function getMergedTests ({ baseline, candidate }) {
  const nestUnderField = (array, type) => array.map(item => ({ scenario: item.scenario, [type]: item }))

  const merged = _.merge(
    _.keyBy(nestUnderField(baseline, 'baseline'), 'scenario'),
    _.keyBy(nestUnderField(candidate, 'checkpoint'), 'scenario')
  )
  return _.values(merged)
}

function computeComparison (mergedTests) {
  const mergedTestsWithBothRecords = _(mergedTests)
    .filter(({ baseline, checkpoint }) => baseline && checkpoint)
    .value()

  const makeDurationStatements = (dimension, thresholds) => {
    _(thresholds).each(threshold => {
      const baselineBetterCount = _(mergedTestsWithBothRecords)
        .filter(({ baseline, checkpoint }) => baseline[dimension] < (1 - threshold) * checkpoint[dimension])
        .size()
      console.log(` baseline beats checkpoint on ${dimension} by more than ${100 - 100 * (1 - threshold)}%: ${baselineBetterCount}`)
    })

    _(thresholds).each(threshold => {
      const checkpointBetterCount = _(mergedTestsWithBothRecords)
        .filter(({ baseline, checkpoint }) => checkpoint[dimension] < (1 - threshold) * baseline[dimension])
        .size()
      console.log(` checkpoint beats baseline on ${dimension} by more than ${100 - 100 * (1 - threshold)}%: ${checkpointBetterCount}`)
    })
  }

  console.log('counts:')
  makeDurationStatements('totalDuration', [0.1, 0.25, 0.5])
}

function computeDistributions (mergedTests) {
  const durationRatioBuckets = {}

  _(mergedTests).each(test => {
    if (_.has(test, 'checkpoint') && _.has(test, 'baseline')) {
      test.durationRatio = test.checkpoint.totalDuration / test.baseline.totalDuration

      const durationRatioBucket = Math.ceil(test.durationRatio * 10) / 10
      test.durationRatioBucket = durationRatioBucket
      if (!_.has(durationRatioBuckets, durationRatioBucket)) { durationRatioBuckets[durationRatioBucket] = 0 }
      durationRatioBuckets[durationRatioBucket]++
    }
  })

  const printDistribution = (buckets) => {
    const sortedKeys = Object.keys(buckets).sort(function (a, b) { return parseFloat(a) - parseFloat(b) })

    _(sortedKeys).each(key => {
      const value = buckets[key] || 0
      console.log(` ${key.padStart(3, ' ')}: ${value}`)
    })
  }

  console.log('duration ratio frequencies (candidate / baseline):')
  printDistribution(durationRatioBuckets)
  console.log('')
}

function median (array) {
  array = array.sort()
  if (array.length % 2 === 0) { // array with even number elements
    return (array[array.length / 2] + array[(array.length / 2) - 1]) / 2
  } else {
    return array[(array.length - 1) / 2] // array with odd number elements
  }
}

module.exports = compareTwoTestRuns
