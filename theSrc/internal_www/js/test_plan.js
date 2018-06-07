/* global _ */
/* global $ */
/* global fetch */
/* global Mustache */

$(document).ready(() => {
  console.log('ready R')
  addLinkToIndex()
  fetch('/test_plan.json')
    .then(response => { return response.text() })
    .then(JSON.parse)
    .then(testPlanGroups => {
      return _(testPlanGroups).each(renderTestPlanGroup)
    })
    .catch(console.error)
})

const addLinkToIndex = function () {
  const indexLinkContainer = $('<div>')
    .addClass('index-link')

  const indexLink = $('<a>')
    .attr('href', '/')
    .html('back to index')

  indexLinkContainer.append(indexLink)
  return $('body').prepend(indexLinkContainer)
}

const renderTestPlanGroup = function (testPlan) {
  const testGroupContainer = $(`
    <div class="test-plan-group-container">
      <div class="test-plan-group-name">${testPlan.groupName}</div>
      <div class="test-cases-container">
        ${_(testPlan.tests).map((testCase, testIndex) => renderTestCase(testCase, testIndex, testPlan.groupName)).value()}
      </div>
    </div>
  `)

  $('body').append(testGroupContainer)
}

const testCaseTemplate = `
  <div class="test-case">
    <div class="test-definition-container {{ groupName }} {{ testIndex }}">
      <div class="test-definition-toggle collapsed" data-toggle="collapse" href=".test-definition-container.{{ groupName }}.{{ testIndex }} .test-definition" role="button" aria-expanded="false" aria-controls="collapseExample">{{ testName }}</div>
      <div class="test-definition collapse" style="height: 0px;">
        <pre>{{ testDefinition }}</pre>
      </div>
      <a href="{{ testUrl }}" class="test-link">Go</a>
    </div>
  </div>
`

const renderTestCase = function (testCase, testIndex, groupName) {
  const testDefinition = JSON.stringify(_.omit(testCase, ['renderExampleUrl', 'testname']), {}, 2)
  const testName = testCase.testname
  const testUrl = testCase.renderExampleUrl
  // var template = $('#test-case-template')
  Mustache.parse(testCaseTemplate)
  return Mustache.render(testCaseTemplate, { testName, testDefinition, testUrl, testIndex, groupName })
}
