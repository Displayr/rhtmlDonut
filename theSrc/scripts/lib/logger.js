const _ = require('lodash')
const rootLog = require('loglevel')

const logTypes = {
  LAYOUT: 'LAYOUT',
  TOOLTIP: 'TOOLTIP',
  LABEL: 'LABEL',
  ROOT: 'ROOT',
}

const loggers = {}
const namedLoggers = {}

_(logTypes)
  .each(logType => {
    const logger = rootLog.getLogger(logType)
    logger.isDebugEnabled = () => logger.getLevel() <= rootLog.levels.DEBUG
    logger.isInfoEnabled = () => logger.getLevel() <= rootLog.levels.INFO
    logger.isWarnEnabled = () => logger.getLevel() <= rootLog.levels.WARN
    logger.isErrorEnabled = () => logger.getLevel() <= rootLog.levels.ERROR

    const shortHandAccessFnName = `${logType.toLowerCase()}Logger`
    namedLoggers[shortHandAccessFnName] = logger
    loggers[logType] = logger
  })

module.exports = {
  levels: rootLog.levels,
  logTypes: logTypes,
  ...namedLoggers,
  initialiseLogger: (loggerSettings = 'info') => {
    if (_.isString(loggerSettings)) {
      const logVerbosity = loggerSettings
      _(logTypes).each(logType => { loggers[logType].setLevel(logVerbosity) })
    } else {
      _(loggerSettings).each((logVerbosity, logType) => {
        if (_.has(logTypes, logType)) {
          rootLog.getLogger(logType).setLevel(logVerbosity)
        } else {
          rootLog.error(`Invalid loggerName in config: ${logType}`)
        }
      })
    }
  }
}


