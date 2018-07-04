const _ = require('lodash')
const path = require('path')
const bluebird = require('bluebird')
const fs = bluebird.promisifyAll(require('fs-extra'))
const jsyaml = require('js-yaml')
const readdir = require('recursive-readdir')

const projectRoot = path.join(__dirname, '..', '..')
const testPlansDir = path.join(projectRoot, 'theSrc', 'test_plans')
const browserDir = path.join(projectRoot, 'browser')
const browserDestination = path.join(browserDir, 'test_plan.json')
const bddDir = path.join(projectRoot, '.tmp')
const bddDestination = path.join(bddDir, 'testplan.feature')
const renderExampleBasePath = '/renderExample.html'

function registerTaskWithGulp (gulp) {
  return function () {
    return loadConfigs(testPlansDir)
      .then(extractGroupedTestCases)
      .then(generateBddFeatureFile)
      .then(generateBrowserJsonFile)
      .catch(echoError)
  }
}

function loadConfigs (testPlansDir) {
  return readdir(testPlansDir)
    .then(filePaths => filePaths.filter(fileName => fileName.endsWith('.yaml')))
    .then(testPlanFilePaths => {
      return Promise.all(testPlanFilePaths.map(testPlanFilePath => {
        return new Promise((resolve, reject) => {
          fs.readFileAsync(testPlanFilePath, 'utf8')
            .then(jsyaml.safeLoad)
            .then(fileContents => {
              if (!_.has(fileContents, 'tests[0].testname')) {
                fileContents.tests[0].testname = extractTestNameFromPath(testPlanFilePath)
              }

              resolve({
                fileName: testPlanFilePath, // deprecate
                filePath: testPlanFilePath, // deprecate
                groupname: fileContents.groupname || extractGroupFromPath(testPlansDir, testPlanFilePath),
                plan: fileContents
              })
            })
            .catch(reject)
        })
      }))
    })
}

// Given baseDir of /foo/bar
// '/foo/bar/anonymised_samples.yaml' => anonymised_samples
// '/foo/bar/functional_tests/color_variations.yaml' => functional_tests,
function extractGroupFromPath (baseDir, absolutePath) {
  const relativePath = absolutePath.substring(baseDir.length + 1).replace('.yaml', '')
  const relativePathParts = relativePath.split('/')
  return relativePathParts[0]
}

function extractTestNameFromPath (testFilePath) {
  const fileName = _.last(testFilePath.split('/'))
  return fileName.replace(/.(yaml|json)/, '')
}

function extractGroupedTestCases (testPlanFiles) {
  return _(testPlanFiles)
    .groupBy('groupname')
    .map((plans, groupname) => {
      try {
        return {
          tests: _(plans)
            .map('plan.tests')
            .flatten()
            .map(testDefinition => configToTestCases(testDefinition, groupname))
            .flatten()
            .value(),
          groupName: groupname
        }
      } catch (error) {
        throw new Error(`error converting ${groupname} files ${_(plans).map('filePath')} contents ${JSON.stringify(plans, {}, 2)} : ${error}`)
      }
    })
    .value()
}

// const exampleConfig = {
//   width: 0,
//   height: 0,
//   testname: '',
//   general_comments: [],
//   comments: [
//     { location: 18, text: "the flux capacitor is broken, this example shows it" }
//   ],
//   widgets: [],
//   widget: {
//     config: [''],
//     comment: '',
//     status: 'red'
//   }
// }

function generateRenderExampleUrl (renderExampleConfig) {
  const configString = new Buffer(JSON.stringify(renderExampleConfig)).toString('base64') // eslint-disable-line node/no-deprecated-api
  return `${renderExampleBasePath}?config=${configString}`
}

const parsers = {
  single: function (testDefinition, groupname) {
    // NB return an array of one because this generates a single test case
    return [
      {
        widgets: [{config: [testDefinition.data]}]
      }
    ]
  },
  multipart_single: function (testDefinition, groupname) {
    // NB return an array of one because this generates a single test case
    return [
      {
        widgets: [{config: testDefinition.config}]
      }
    ]
  },
  single_page_one_example_per_config: function (testDefinition, groupname) {
    // NB return an array of one because this generates a single test case
    return [
      {
        widgets: toArray(testDefinition.config).map(configPath => {
          return { config: (_.has(testDefinition, 'data')) ? [testDefinition.data, configPath] : [configPath] }
        })
      }
    ]
  },
  single_page_one_example_per_data: function (testDefinition, groupname) {
    // NB return an array of one because this generates a single test case
    return [
      {
        widgets: getDataStringsFromTestDefinition(testDefinition).map((dataString) => {
          return { config: [dataString] }
        })
      }
    ]
  },
  for_each_data_in_directory: function (testDefinition, groupname) {
    // NB return an array of N because this generates a test case per data file
    const dataStrings = getDataStringsFromTestDefinition(testDefinition)
    const configStrings = toArray(testDefinition.config) || []
    return dataStrings
      .map(dataString => {
        return {
          testname: `${groupname} ${dataString}`,
          widgets: [{ config: [dataString].concat(configStrings) }]
        }
      })
      .map(config => {
        if (testDefinition.use_config_as_title) {
          config.title = config.widgets[0].config.join('|')
        }
        return config
      })
  }
}

function configToTestCases (testDefinition, groupname) {
  const commonRenderExampleParts = extractCommonParamsFromTestDefinition(testDefinition)
  const arrayOfwidgetConfigsAndOverrides = extractWidgetConfigsAndOverrides(testDefinition, groupname)

  return arrayOfwidgetConfigsAndOverrides.map((widgetConfig, outerWidgetIndex) => {
    const renderExampleConfigWithoutUrl = _.assign({}, commonRenderExampleParts, widgetConfig)
    if (!_.has(renderExampleConfigWithoutUrl, 'testname')) { throw new Error('missing testname') }

    const positionalComments = _(renderExampleConfigWithoutUrl.comments || [])
      .transform((result, { location, text }) => {
        const isNumberRegex = new RegExp('^[0-9]+$')
        const locationIsIndex = isNumberRegex.test(`${location}`)

        if (locationIsIndex) {
          result[`index-${location}`] = text
        } else {
          result[location] = text
        }
        return result
      }, {})
      .value()

    _(renderExampleConfigWithoutUrl.widgets).each((widgetConfig, index) => {
      // this deals with for each config or for each data but only generate one snapshot (ie one renderExample configs)
      if (_.has(positionalComments, `index-${index}`)) {
        widgetConfig.comment = positionalComments[`index-${index}`]
        widgetConfig.status = 'red'
      }

      // this deals with directory scanning configs that have more than one snapshot (ie multiple renderExample configs)
      if (arrayOfwidgetConfigsAndOverrides.length > 1 && _.has(positionalComments, `index-${outerWidgetIndex}`)) {
        widgetConfig.comment = positionalComments[`index-${outerWidgetIndex}`]
        widgetConfig.status = 'red'
      }

      const widgetConfigStrings = widgetConfig.config.join('|')
      const matchingComment = _.find(_.keys(positionalComments), (commentLocation) => {
        return widgetConfigStrings.indexOf(commentLocation) !== -1
      })
      if (matchingComment) {
        widgetConfig.comment = positionalComments[matchingComment]
        widgetConfig.status = 'red'
      }
    })
    delete renderExampleConfigWithoutUrl.comments

    const renderExampleUrl = generateRenderExampleUrl(renderExampleConfigWithoutUrl)
    return _.assign({}, renderExampleConfigWithoutUrl, { renderExampleUrl })
  })
}

function extractWidgetConfigsAndOverrides (testDefinition, groupname) {
  switch (testDefinition.type) {
    case 'single':
      return parsers.single(testDefinition, groupname)
    case 'multipart_single':
      return parsers.multipart_single(testDefinition, groupname)
    case 'single_page_one_example_per_config':
      return parsers.single_page_one_example_per_config(testDefinition, groupname)
    case 'single_page_one_example_per_data':
      return parsers.single_page_one_example_per_data(testDefinition, groupname)
    case 'for_each_data_in_directory':
      return parsers.for_each_data_in_directory(testDefinition, groupname)
    default:
      throw new Error(`invalid type ${testDefinition.type}`)
  }
}

function extractCommonParamsFromTestDefinition (testDefinition) {
  const renderExampleConfig = {}

  if (_.has(testDefinition, 'testname')) {
    renderExampleConfig.testname = testDefinition.testname
  }

  if (_.has(testDefinition, 'general_comments')) {
    renderExampleConfig.general_comments = toArray(testDefinition.general_comments)
  }

  if (_.has(testDefinition, 'comments')) {
    renderExampleConfig.comments = toArray(testDefinition.comments)
  }

  if (_.has(testDefinition, 'title')) { renderExampleConfig.title = testDefinition.title }

  if (_.has(testDefinition, 'type')) {
    renderExampleConfig.type = testDefinition.type
  } else {
    throw new Error('missing type')
  }

  if (_.has(testDefinition, 'width')) {
    renderExampleConfig.width = parseInt(testDefinition.width)
    if (_.isNaN(renderExampleConfig.width)) {
      throw new Error(`invalid width: ${testDefinition.width}`)
    }
  }
  if (_.has(testDefinition, 'height')) {
    renderExampleConfig.height = parseInt(testDefinition.height)
    if (_.isNaN(renderExampleConfig.height)) {
      throw new Error(`invalid height: ${testDefinition.height}`)
    }
  }

  if (_.has(testDefinition, 'rowSize')) {
    renderExampleConfig.rowSize = parseInt(testDefinition.rowSize)
    if (_.isNaN(renderExampleConfig.rowSize)) {
      throw new Error(`invalid rowSize: ${testDefinition.rowSize}`)
    }
  }
  return renderExampleConfig
}

function echoError (error) {
  console.error(error)
  console.error(error)
  throw error
}

function toArray (stringOrArray) {
  if (_.isNull(stringOrArray)) { return [] }
  if (_.isUndefined(stringOrArray)) { return [] }
  if (_.isArray(stringOrArray)) { return stringOrArray }
  return [stringOrArray]
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

  return fs.mkdirpAsync(bddDir)
    .then(() => {
      console.log(`creating ${bddDestination}`)
      return fs.writeFileAsync(bddDestination, featureFileContents, 'utf-8')
    })
    .then(() => combinedTestPlan)
}

function generateBrowserJsonFile (combinedTestPlan) {
  return fs.mkdirpAsync(browserDir)
    .then(() => {
      console.log(`creating ${browserDestination}`)
      return fs.writeFileAsync(browserDestination, JSON.stringify(combinedTestPlan, {}, 2))
    })
    .then(() => combinedTestPlan)
}

function getDataStringsFromTestDefinition (testDefinition) {
  if (_.has(testDefinition, 'data_directory')) {
    const directoryPath = path.join(projectRoot, 'theSrc', 'internal_www', testDefinition.data_directory)
    const allSlashesRegExp = new RegExp('/', 'g')
    return fs.readdirSync(directoryPath)
      .map(fileName => `${testDefinition.data_directory.replace(allSlashesRegExp, '.')}.${extractTestNameFromPath(fileName)}`)
  } else if (_.has(testDefinition, 'data')) {
    return toArray(testDefinition.data)
  } else {
    throw new Error(`cannot extract data strings, test definition must contain 'data' or 'data_directory' : ${JSON.stringify(testDefinition)}`)
  }
}

module.exports = registerTaskWithGulp
