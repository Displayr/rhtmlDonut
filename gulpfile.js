const gulp = require('gulp')
const rhtmlBuildUtils = require('rhtmlBuildUtils')

const dontRegisterTheseTasks = ['testSpecs', 'lint']
rhtmlBuildUtils.registerGulpTasks({ gulp, exclusions: dontRegisterTheseTasks })

gulp.task('testSpecs', function () {
  console.log('skipping test')
  return true
})

gulp.task('lint', function () {
  console.log('skipping lint')
  return true
})
