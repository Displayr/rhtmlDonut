const _ = require('lodash')

const setSize = 150
const range = 5

// let candidates = _.range(setSize)
let candidates = _.range(setSize + 1).map((i, index) => index % (range + 1))

const orderedList = []

while (candidates.length > 0) {
  const selectionIndex = Math.ceil(Math.random() * (candidates.length - 1))
  orderedList.push(candidates[selectionIndex])
  candidates.splice(selectionIndex, 1)
}

orderedList.pop()

const donutConfig = {
  values: orderedList,
  labels: orderedList.map(x => `${x}`),
  settings: {}
}

console.log(JSON.stringify(donutConfig, {}, 2))
