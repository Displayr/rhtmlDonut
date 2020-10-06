const gulp = require('gulp')
const rhtmlBuildUtils = require('rhtmlBuildUtils')

const dontRegisterTheseTasks = []
rhtmlBuildUtils.registerGulpTasks({ gulp, exclusions: dontRegisterTheseTasks })

gulp.task('compileTestFixtures', require('./build/tasks/compileTestFixtures')(gulp))
gulp.task('copyTestDependencies', require('./build/tasks/copyTestDependencies')(gulp))
