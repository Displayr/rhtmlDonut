const _ = require('lodash')
const path = require('path')
const bluebird = require('bluebird')
const fs = bluebird.promisifyAll(require('fs-extra'))
const jsyaml = require('js-yaml')

const tmpDir = path.join(__dirname, '..', '..', '.tmp')
const testPlansDir = path.join(__dirname, '..', '..', 'theSrc', 'test_plans')
const browserDestination = path.join(__dirname, '..', '..', 'browser', 'test_plan.json')
const bddDestination = path.join(tmpDir, 'testplan.feature')
const renderExampleBasePath = '/renderExample.html'

function registerTaskWithGulp (gulp) {
  return function () {
    return fs.readdirAsync(testPlansDir)
      .then(testPlanFileNames => {
        const testPlanFilePaths = testPlanFileNames.map(testPlanFileName => path.join(testPlansDir, testPlanFileName))
        return Promise.all(testPlanFilePaths.map(testPlanFilePath => {
          return new Promise((resolve, reject) => {
            fs.readFileAsync(testPlanFilePath, 'utf8')
              .then(jsyaml.safeLoad)
              .then(fileContents => {
                resolve({
                  fileName: testPlanFilePath,
                  plan: fileContents
                })
              })
              .catch(reject)
          })
        }))
      })
      .then(testPlanFiles => {
        return testPlanFiles.map(({fileName, plan}) => {
          return {
            groupName: extractNameFromPath(fileName),
            tests: convertConfigIntoTestCases(plan)
          }
        })
      })
    .then(generateBddFeatureFile)
    .then(combinedTestPlan => {
      fs.writeFileAsync(browserDestination, JSON.stringify(combinedTestPlan, {}, 2))
    })
  }
}

function extractNameFromPath (filePath) {
  const pathParts = filePath.split('/')
  const fileName = _.last(pathParts)
  return fileName.split('.')[0]
}

function convertConfigIntoTestCases (config) {
  return _(config.tests)
    .map(configToTestCase)
    .flatten()
    .value()
}

function configToTestCase (testDefinition) {
  switch (testDefinition.type) {
    case 'single':
      return addRenderExampleUrlToTestExample(testDefinition)
    case 'single_page_one_example_per_config':
      const testname = testDefinition['testname'] || `${testDefinition.data}-${testDefinition.config.join('-')}`
      const configStrings = toArray(testDefinition.config).map(configPath => {
        return `config=${testDefinition.data}|${configPath}`
      }).join('&')
      return Object.assign(
        { testname: 'name-this-test' },
        testDefinition,
        { renderExampleUrl: `${renderExampleBasePath}?${configStrings}&width=1000&height=1000&snapshotName=${testname}` }
      )
    default:
      return addRenderExampleUrlToTestExample(testDefinition)
  }
}

function addRenderExampleUrlToTestExample (testDefinition) {
  const {
    width = 1000,
    height = 1000,
    config: configPathArray = [],
    data: dataPath = [],
    testname
  } = testDefinition

  const configUrlParam = toArray(dataPath).concat(toArray(configPathArray)).join('|')
  const renderExampleUrl = `${renderExampleBasePath}?width=${width}&height=${height}&config=${configUrlParam}&snapshotName=${testname}`

  return Object.assign(testDefinition, { renderExampleUrl })
}

function toArray (stringOrArray) {
  return (_.isArray(stringOrArray)) ? stringOrArray : [stringOrArray]
}

function generateBddFeatureFile (combinedTestPlan) {
  const tests = _(combinedTestPlan)
    .map('tests')
    .flatten()
    .value()

  let featureFileContents = `
    Feature: Take Snapshots in Content Directory
    `

  const scenarioStrings = tests.map(({ testname, renderExampleUrl }) => {
    return `
      @applitools @autogen,
      Scenario: ${testname},
        When I take all the snapshots on the page "${renderExampleUrl}"
      `
  })

  featureFileContents += scenarioStrings.join('')
  featureFileContents += '\n'

  return fs.mkdirpAsync(tmpDir)
    .then(() => {
      console.log(`creating ${bddDestination}`)
      fs.writeFileAsync(bddDestination, featureFileContents, 'utf-8')
    })
    .then(() => combinedTestPlan)
}

module.exports = registerTaskWithGulp
