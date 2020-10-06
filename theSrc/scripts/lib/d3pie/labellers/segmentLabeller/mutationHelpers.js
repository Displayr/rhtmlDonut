import _ from 'lodash'

const extractAndThrowIfNullFactory = (mutationName) =>
  (obj, key) => {
    if (!_.has(obj, key)) { throw new Error(`${mutationName}: missing ${key}`) }
    if (_.isNull(obj[key])) { throw new Error(`${mutationName}: null ${key}`) }
    if (_.isUndefined(obj[key])) { throw new Error(`${mutationName}: undefined ${key}`) }
    return obj[key]
  }

module.exports = { extractAndThrowIfNullFactory }
