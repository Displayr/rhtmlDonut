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
     
    rhtmlDonut::Donut(values = values1,
                      labels = labels1,
                      values.order = "descending",
                      prefix = "", suffix = "%")
                      
Developing / Contributing
------

To install for local development: `yarn install`

To run local server: `gulp serve`

To build the `inst` directory: `gulp build`