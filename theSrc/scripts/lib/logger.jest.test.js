const _ = require('lodash')
const logger = require('./logger')

const levels = logger.levels

describe('logger', () => {
  it('export at least one logType', () => {
    expect(Object.keys(logger.logTypes).length > 0).toEqual(true)
  })

  describe('setting log levels in initialiseLogger', () => {
    it('accepts no params and sets everything to info', () => {
      logger.initialiseLogger()
      _(logger.logTypes)
        .each(logType => {
          expect(logger[`${logType.toLowerCase()}Logger`].isDebugEnabled()).toEqual(false)
          expect(logger[`${logType.toLowerCase()}Logger`].isInfoEnabled()).toEqual(true)
          expect(logger[`${logType.toLowerCase()}Logger`].isWarnEnabled()).toEqual(true)
          expect(logger[`${logType.toLowerCase()}Logger`].isErrorEnabled()).toEqual(true)
        })
    })

    it('accepts "error" sets everything to error', () => {
      logger.initialiseLogger('error')
      _(logger.logTypes)
        .each(logType => {
          expect(logger[`${logType.toLowerCase()}Logger`].isDebugEnabled()).toEqual(false)
          expect(logger[`${logType.toLowerCase()}Logger`].isInfoEnabled()).toEqual(false)
          expect(logger[`${logType.toLowerCase()}Logger`].isWarnEnabled()).toEqual(false)
          expect(logger[`${logType.toLowerCase()}Logger`].isErrorEnabled()).toEqual(true)
        })
    })

    it('accepts "ERROR" sets everything to error', () => {
      logger.initialiseLogger('ERROR')
      _(logger.logTypes)
        .each(logType => {
          expect(logger[`${logType.toLowerCase()}Logger`].isDebugEnabled()).toEqual(false)
          expect(logger[`${logType.toLowerCase()}Logger`].isInfoEnabled()).toEqual(false)
          expect(logger[`${logType.toLowerCase()}Logger`].isWarnEnabled()).toEqual(false)
          expect(logger[`${logType.toLowerCase()}Logger`].isErrorEnabled()).toEqual(true)
        })
    })

    it('accepts "info" and sets everything to info', () => {
      logger.initialiseLogger('info')
      _(logger.logTypes)
        .each(logType => {
          expect(logger[`${logType.toLowerCase()}Logger`].isDebugEnabled()).toEqual(false)
          expect(logger[`${logType.toLowerCase()}Logger`].isInfoEnabled()).toEqual(true)
          expect(logger[`${logType.toLowerCase()}Logger`].isWarnEnabled()).toEqual(true)
          expect(logger[`${logType.toLowerCase()}Logger`].isErrorEnabled()).toEqual(true)
        })
    })

    it('accepts "warn" sets everything to error', () => {
      logger.initialiseLogger('warn')
      _(logger.logTypes)
        .each(logType => {
          expect(logger[`${logType.toLowerCase()}Logger`].isDebugEnabled()).toEqual(false)
          expect(logger[`${logType.toLowerCase()}Logger`].isInfoEnabled()).toEqual(false)
          expect(logger[`${logType.toLowerCase()}Logger`].isWarnEnabled()).toEqual(true)
          expect(logger[`${logType.toLowerCase()}Logger`].isErrorEnabled()).toEqual(true)
        })
    })

    it('accepts "debug" sets everything to error', () => {
      logger.initialiseLogger('debug')
      _(logger.logTypes)
        .each(logType => {
          expect(logger[`${logType.toLowerCase()}Logger`].isDebugEnabled()).toEqual(true)
          expect(logger[`${logType.toLowerCase()}Logger`].isInfoEnabled()).toEqual(true)
          expect(logger[`${logType.toLowerCase()}Logger`].isWarnEnabled()).toEqual(true)
          expect(logger[`${logType.toLowerCase()}Logger`].isErrorEnabled()).toEqual(true)
        })
    })

    it('accepts an object that configures the level of each logger', () => {
      logger.initialiseLogger({
        [logger.logTypes.ROOT]: 'error',
        [logger.logTypes.LAYOUT]: 'info',
        [logger.logTypes.LABEL]: 'debug',
      })

      expect(logger.rootLogger.isInfoEnabled()).toEqual(false)
      expect(logger.rootLogger.isErrorEnabled()).toEqual(true)
      expect(logger.layoutLogger.isDebugEnabled()).toEqual(false)
      expect(logger.layoutLogger.isInfoEnabled()).toEqual(true)
      expect(logger.labelLogger.isDebugEnabled()).toEqual(true)
    })
  })
})
