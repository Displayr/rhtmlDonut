An R htmlwidget package that can create a pie or donut plot with many labels, based on d3pie.
Examples can be found in the examples folder.

Features
-------
1. Allows groups to be set.
2. Improves label collision checking and resolves collision when possible.
3. Allows dynamic sizing of fonts based on available space.
4. Allows three options for the ordering of the data.
5. Gradient color and hide/show donut borders.


License
-------
MIT + file LICENSE © [Displayr](https://www.displayr.com)

Local Test
-------

In R:

    library(devtools)
    install()
    
    values1 <- c(42.41, 9.78, 7.37, 5.24, 3.71, 3.6, 2.78, 2.29, 1.4, 1.39,
    1.34, 1.03, 1.02, 0.94, 0.94, 0.88, 0.82, 0.71, 0.59, 0.54, 0.51,
    0.43, 0.39, 0.37, 0.36, 0.34, 0.32, 0.31, 0.26, 0.26)
     
    labels1 <- c("Chrome 48.0", "IE 11.0", "Firefox 44.0", "Safari iPad", "Chrome for Android",
    "Firefox 43.0", "Safari 9.0", "Chrome 47.0", "Edge 13", "Android 0",
    "IE 8.0", "IE 9.0", "IE 10.0", "Opera 35.0", "Other", "Chrome 45.0",
    "Chrome 46.0", "Chrome 43.0", "Chrome 31.0", "Safari 8.0", "Chrome 44.0",
    "Edge 12", "Firefox 38.0", "Chrome iPad", "Firefox 42.0", "Firefox 45.0",
    "Firefox 31.0", "Opera 34.0", "Chrome 41.0", "Opera 12.1")
     
    rhtmlDonut::Donut(footer="IE Sucks",
                      footer.font.size=8,
                      title="Browser Usage",
                      title.font.size=32,
                      subtitle="Circa ~ 2013",
                      subtitle.font.size=24, 
                      values = values1,
                      labels = labels1,
                      labels.font.size = 16,
                      values.order = "descending",
                      prefix = "", suffix = "%")
                      
Developing / Contributing
------

### Quick Command Reference

* To install for local development: `yarn install`
* To run local server: `gulp serve`
* To build the `inst` directory: `gulp build`

### Developer Docs

rhtmlDonut relies heavily on [rhtmlBuildUtils](https://github.com/Displayr/rhtmlBuildUtils). You should read through the docs in the rhtmlBuildUtils repo to understand:
 
 1. which gulp tasks are available
 1. the constraints on file layout in your widget project
 1. How to perform visual testing.
 
 Here are a few important notes (both detailed in the rhtmlBuildUtils docs) you must keep in mind:

1. The last thing you do before committing is run `gulp build` to ensure all the autogenerated files are up to date.
2. (With some exceptions) ONLY EDIT THINGS IN these directories: `theSrc`, `bdd`, `docs`, and sometimes `build` !! Many of the other files are auto generated based on the contents of `theSrc`. As an example, if you edit `R/rhtmlTemplate.R` and then run `gulp build` your changes will be DELETED FOREVER!, because `R/rhtmlTemplate.R` is just a copy of `theSrc/R/htmlwidget.R`. See [htmlwidget_build_system](docs/htmlwidget_build_system.md) for more details.

### Contributing to rhtmlDonut
1. Do not work in master, as the master branch of rhtmlTemplate is used to verify the R server build process.
1. Create a branch, make some changes, add test for your changes, update the docs if necessary, push your branch, and create a pull request on github.

### How the git prepush hook works (aka: My git push got rejected ?!)

This project uses the npm [husky](https://github.com/typicode/husky) module to add git lifecycle hooks to the project. These are defined in the `scripts` section of the [package.json](./package.json) file.
 
Of particular interest is the `prepush` entry which runs a script that checks the project code style using the `gulp lint` command. If there are errors, then it will reject your git push command. You have two options:
  
1. Fix the errors and try pushing again. To see which errors are in the code run `gulp lint`. To autofix as many as possible run `gulp lint --fix`; this will only report the errors it could not auto-fix. Don't forget to commit your code again before pushing.
1. If you must (not recommended) add a --no-verify (i.e., `git push origin head --no-verify`) to skip the style checking.

Here is an illustrative sequence:

```bash
$ git push origin head

> husky - npm run -s prepush

...

/Users/kyle/projects/numbers/rhtmlTemplate/bdd/steps/loadThePage.steps.js
  8:47  error  Missing semicolon  semi

✖ 1 problem (1 error, 0 warnings)

[17:50:09] 'lint' errored after 4.85 s

...

$ gulp lint --fix
[17:50:16] Starting 'lint'...
[17:50:21] Finished 'lint' after 4.94 s

$ git commit -a -m 'fix the style'
...

$ git push origin head
```

Notes
----

## What logic is contained in the R wrapper?
  * validate and enforce format of values and labels
  * compute group sums
  * ensure there are enough group colors
  * compute group counts
  * reorder values and groups depending on order "descending" v "alphabetical" v "initial"
  
