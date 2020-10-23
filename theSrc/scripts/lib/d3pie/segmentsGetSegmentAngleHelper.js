import _ from 'lodash'

/**
 * General helper function to return a segment's angle, in various different ways.
 * @param index
 * @param opts optional object for fine-tuning exactly what you want.
 */
const getSegmentAngle = (index, data, totalValue, opts) => {
  let options = _.merge({
    // if true, this returns the full angle from the origin. Otherwise it returns the single segment angle
    compounded: true,

    // optionally returns the midpoint of the angle instead of the full angle
    midpoint: false,
  }, opts)

  let currValue = data[index].value
  let fullValue
  if (options.compounded) {
    fullValue = 0

    // get all values up to and including the specified index
    for (let i = 0; i <= index; i++) {
      fullValue += data[i].value
    }
  }

  if (typeof fullValue === 'undefined') {
    fullValue = currValue
  }

  // now convert the full value to an angle
  let angle = (fullValue / totalValue) * 360

  // lastly, if we want the midpoint, factor that sucker in
  if (options.midpoint) {
    let currAngle = (currValue / totalValue) * 360
    angle -= (currAngle / 2)
  }

  return angle
}

module.exports = getSegmentAngle
