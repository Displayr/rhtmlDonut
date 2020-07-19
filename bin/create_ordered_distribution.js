const _ = require('lodash')

const setSize = 200

const donutConfig = {
  values: _.range(setSize).map(x => x + 1),
  labels: _.range(setSize).map(x => x + 1).map(x => `${x}`),
  settings: {}
}

console.log(JSON.stringify(donutConfig, {}, 2))
