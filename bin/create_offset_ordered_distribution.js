const _ = require('lodash')

// we want to test the performance of the labeller for an ordered set
// but we want to push the highest value labels into different quadrants

const setSize = 200
const offsetProportion = 0.25
const series = _.range(setSize).reverse().map(x => x + 1)
const sumWithoutLargeSlice = _(series).sum()
const offsetSize = sumWithoutLargeSlice / ((1-offsetProportion)/offsetProportion)

const donutConfig = {
  values: [offsetSize].concat(series),
  labels: ([offsetSize].concat(series)).map(x => `${x}`),
  settings: {}
}

console.log(JSON.stringify(donutConfig, {}, 2))
