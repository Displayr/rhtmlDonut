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
      <h3 class="test-plan-group-name">${testPlan.groupName}</h3>
      <ul class="test-cases-container">
        ${_(testPlan.tests).map((testCase, testIndex) => renderTestCase(testCase, testIndex, testPlan.groupName)).value().join('')}
      </ul>
    </div>
  `)

  $('body').append(testGroupContainer)
}

const testCaseTemplate = `
  <li class="test-case">
    <a class="load-link" href="{{ testUrl }}" title="{{ testDefinition }}" class="test-link">{{ testName }}</a>
    <!--<div class="test-definition-container {{ groupName }} {{ testIndex }}">-->
      <!--<div class="test-definition-toggle collapsed" data-toggle="collapse" href=".test-definition-container.{{ groupName }}.{{ testIndex }} .test-definition" role="button" aria-expanded="false" aria-controls="collapseExample">Definition</div>-->
      <!--<div class="test-definition collapse">-->
      <!--<pre>{{ testDefinition }}</pre>-->
    <!--</div>-->
  </li>
`

const renderTestCase = function (testCase, testIndex, groupName) {
  const testDefinition = JSON.stringify(_.omit(testCase, ['renderExampleUrl', 'testname']), {}, 2)
  const testName = testCase.testname
  const testUrl = testCase.renderExampleUrl
  Mustache.parse(testCaseTemplate)
  return Mustache.render(testCaseTemplate, { testName, testDefinition, testUrl, testIndex, groupName })
}
