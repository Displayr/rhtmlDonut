
// NB fundamental for understanding the labellers : _.each iterations are cancelled if the loop function returns false
const continueLoop = true // NB this is done for readability to make it more obvious what 'return true' does in a _.each loop
const terminateLoop = false // NB this is done for readability to make it more obvious what 'return false' does in a _.each loop

module.exports = { continueLoop, terminateLoop }
