const _ = require('lodash')
const cliArgs = require('yargs').argv

// Intent:
// we want to test the performance of the labeller for an ordered set
// but we want to push the highest value labels into different quadrants

const setSize = (cliArgs.size) ? parseInt(cliArgs.size) : 100
const offsetProportion = (cliArgs.offset) ? parseFloat(cliArgs.offset) : 0.25
const reverse = cliArgs.reverse

let series = _.range(setSize).map(x => x + 1)
if (reverse) { series = series.reverse() }

const sumWithoutLargeSlice = _(series).sum()
const offsetSize = parseInt(sumWithoutLargeSlice / ((1 - offsetProportion) / offsetProportion))

series = (reverse)
 ? [offsetSize].concat(series)
 : series.concat([offsetSize])

const donutConfig = {
  values: series,
  labels: series.map(x => `${x}`),
  settings: {}
}

console.log(JSON.stringify(donutConfig, {}, 2))

// node bin/create_offset_ordered_distribution.js --reverse --size=100 --offset=0.125 > theSrc/internal_www/data/decreasing_value_sets/100_decreasing_values_offset_12_5_percent.json
// node bin/create_offset_ordered_distribution.js --reverse --size=100 --offset=0.25 > theSrc/internal_www/data/decreasing_value_sets/100_decreasing_values_offset_25_percent.json
// node bin/create_offset_ordered_distribution.js --reverse --size=100 --offset=0.375 > theSrc/internal_www/data/decreasing_value_sets/100_decreasing_values_offset_37_5_percent.json
// node bin/create_offset_ordered_distribution.js --reverse --size=100 --offset=0.50 > theSrc/internal_www/data/decreasing_value_sets/100_decreasing_values_offset_50_percent.json
// node bin/create_offset_ordered_distribution.js --reverse --size=100 --offset=0.625 > theSrc/internal_www/data/decreasing_value_sets/100_decreasing_values_offset_62_5_percent.json
// node bin/create_offset_ordered_distribution.js --reverse --size=100 --offset=0.75 > theSrc/internal_www/data/decreasing_value_sets/100_decreasing_values_offset_75_percent.json
// node bin/create_offset_ordered_distribution.js --reverse --size=100 --offset=0.875 > theSrc/internal_www/data/decreasing_value_sets/100_decreasing_values_offset_87_5_percent.json

// node bin/create_offset_ordered_distribution.js --reverse --size=150 --offset=0.125 > theSrc/internal_www/data/decreasing_value_sets/150_decreasing_values_offset_12_5_percent.json
// node bin/create_offset_ordered_distribution.js --reverse --size=150 --offset=0.25 > theSrc/internal_www/data/decreasing_value_sets/150_decreasing_values_offset_25_percent.json
// node bin/create_offset_ordered_distribution.js --reverse --size=150 --offset=0.375 > theSrc/internal_www/data/decreasing_value_sets/150_decreasing_values_offset_37_5_percent.json
// node bin/create_offset_ordered_distribution.js --reverse --size=150 --offset=0.50 > theSrc/internal_www/data/decreasing_value_sets/150_decreasing_values_offset_50_percent.json
// node bin/create_offset_ordered_distribution.js --reverse --size=150 --offset=0.625 > theSrc/internal_www/data/decreasing_value_sets/150_decreasing_values_offset_62_5_percent.json
// node bin/create_offset_ordered_distribution.js --reverse --size=150 --offset=0.75 > theSrc/internal_www/data/decreasing_value_sets/150_decreasing_values_offset_75_percent.json
// node bin/create_offset_ordered_distribution.js --reverse --size=150 --offset=0.875 > theSrc/internal_www/data/decreasing_value_sets/150_decreasing_values_offset_87_5_percent.json

// node bin/create_offset_ordered_distribution.js --reverse --size=200 --offset=0.125 > theSrc/internal_www/data/decreasing_value_sets/200_decreasing_values_offset_12_5_percent.json
// node bin/create_offset_ordered_distribution.js --reverse --size=200 --offset=0.25 > theSrc/internal_www/data/decreasing_value_sets/200_decreasing_values_offset_25_percent.json
// node bin/create_offset_ordered_distribution.js --reverse --size=200 --offset=0.375 > theSrc/internal_www/data/decreasing_value_sets/200_decreasing_values_offset_37_5_percent.json
// node bin/create_offset_ordered_distribution.js --reverse --size=200 --offset=0.50 > theSrc/internal_www/data/decreasing_value_sets/200_decreasing_values_offset_50_percent.json
// node bin/create_offset_ordered_distribution.js --reverse --size=200 --offset=0.625 > theSrc/internal_www/data/decreasing_value_sets/200_decreasing_values_offset_62_5_percent.json
// node bin/create_offset_ordered_distribution.js --reverse --size=200 --offset=0.75 > theSrc/internal_www/data/decreasing_value_sets/200_decreasing_values_offset_75_percent.json
// node bin/create_offset_ordered_distribution.js --reverse --size=200 --offset=0.875 > theSrc/internal_www/data/decreasing_value_sets/200_decreasing_values_offset_87_5_percent.json

// node bin/create_offset_ordered_distribution.js --size=100 --offset=0.125 > theSrc/internal_www/data/increasing_value_sets/100_increasing_values_offset_12_5_percent.json
// node bin/create_offset_ordered_distribution.js --size=100 --offset=0.25 > theSrc/internal_www/data/increasing_value_sets/100_increasing_values_offset_25_percent.json
// node bin/create_offset_ordered_distribution.js --size=100 --offset=0.375 > theSrc/internal_www/data/increasing_value_sets/100_increasing_values_offset_37_5_percent.json
// node bin/create_offset_ordered_distribution.js --size=100 --offset=0.50 > theSrc/internal_www/data/increasing_value_sets/100_increasing_values_offset_50_percent.json
// node bin/create_offset_ordered_distribution.js --size=100 --offset=0.625 > theSrc/internal_www/data/increasing_value_sets/100_increasing_values_offset_62_5_percent.json
// node bin/create_offset_ordered_distribution.js --size=100 --offset=0.75 > theSrc/internal_www/data/increasing_value_sets/100_increasing_values_offset_75_percent.json
// node bin/create_offset_ordered_distribution.js --size=100 --offset=0.875 > theSrc/internal_www/data/increasing_value_sets/100_increasing_values_offset_87_5_percent.json

// node bin/create_offset_ordered_distribution.js --size=150 --offset=0.125 > theSrc/internal_www/data/increasing_value_sets/150_increasing_values_offset_12_5_percent.json
// node bin/create_offset_ordered_distribution.js --size=150 --offset=0.25 > theSrc/internal_www/data/increasing_value_sets/150_increasing_values_offset_25_percent.json
// node bin/create_offset_ordered_distribution.js --size=150 --offset=0.375 > theSrc/internal_www/data/increasing_value_sets/150_increasing_values_offset_37_5_percent.json
// node bin/create_offset_ordered_distribution.js --size=150 --offset=0.50 > theSrc/internal_www/data/increasing_value_sets/150_increasing_values_offset_50_percent.json
// node bin/create_offset_ordered_distribution.js --size=150 --offset=0.625 > theSrc/internal_www/data/increasing_value_sets/150_increasing_values_offset_62_5_percent.json
// node bin/create_offset_ordered_distribution.js --size=150 --offset=0.75 > theSrc/internal_www/data/increasing_value_sets/150_increasing_values_offset_75_percent.json
// node bin/create_offset_ordered_distribution.js --size=150 --offset=0.875 > theSrc/internal_www/data/increasing_value_sets/150_increasing_values_offset_87_5_percent.json

// node bin/create_offset_ordered_distribution.js --size=200 --offset=0.125 > theSrc/internal_www/data/increasing_value_sets/200_increasing_values_offset_12_5_percent.json
// node bin/create_offset_ordered_distribution.js --size=200 --offset=0.25 > theSrc/internal_www/data/increasing_value_sets/200_increasing_values_offset_25_percent.json
// node bin/create_offset_ordered_distribution.js --size=200 --offset=0.375 > theSrc/internal_www/data/increasing_value_sets/200_increasing_values_offset_37_5_percent.json
// node bin/create_offset_ordered_distribution.js --size=200 --offset=0.50 > theSrc/internal_www/data/increasing_value_sets/200_increasing_values_offset_50_percent.json
// node bin/create_offset_ordered_distribution.js --size=200 --offset=0.625 > theSrc/internal_www/data/increasing_value_sets/200_increasing_values_offset_62_5_percent.json
// node bin/create_offset_ordered_distribution.js --size=200 --offset=0.75 > theSrc/internal_www/data/increasing_value_sets/200_increasing_values_offset_75_percent.json
// node bin/create_offset_ordered_distribution.js --size=200 --offset=0.875 > theSrc/internal_www/data/increasing_value_sets/200_increasing_values_offset_87_5_percent.json
