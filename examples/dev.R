# library(devtools)
# install_github("xtmwang/DetailedDonutPlot")
# browser = as.data.frame(data.table::fread("data/browser_version.csv", header = T, sep = ","))
# values = as.numeric(browser[1,-1])
# labels = colnames(browser)[-1]
# groups = as.character(browser[2,-1])
#
# qColors1 <- c(grDevices::rgb(91, 155, 213, 255, max = 255), # blue
#              grDevices::rgb(237, 125, 49, 255, max = 255), # orange
#              grDevices::rgb(165, 165, 165, 255, max = 255), # grey
#              grDevices::rgb(30, 192, 0, 255, max = 255), # yelow
#              grDevices::rgb(68, 114, 196, 255, max = 255), # darker blue
#              grDevices::rgb(112, 173, 71, 255, max = 255), # green
#              grDevices::rgb(37, 94, 145, 255, max = 255), # even darker blue
#              grDevices::rgb(158, 72, 14, 255, max = 255), # blood
#              grDevices::rgb(99, 99, 99, 255, max = 255), # dark grey
#              grDevices::rgb(153, 115, 0, 255, max = 255), # brown
#              grDevices::rgb(38, 68, 120, 255, max = 255), # very dark blue
#              grDevices::rgb(67, 104, 43, 255, max = 255), # darker green
#              grDevices::rgb(0, 0, 0, 255, max = 255), # black
#              grDevices::rgb(255, 35, 35, 255, max = 255)) # red
# qColors = substring(qColors1,1,7)
# save(values, labels, groups, qColors, file = 'data/browser.rda')

data("browser", package = "rhtmlDonut")
labels[1] = "IE xcsdsds TTDF 11.0"
labels[labels == "Chrome for Android"] = "Chrome for Android dfwer ijo 2323d fddfdfe53sdsdsdsdsdsdsds"
rhtmlDonut::Donut(values = values, labels = labels, groups = groups, groups.color = qColors)
rhtmlDonut::Donut(values = values, labels = labels, groups = groups, groups.color = qColors, max.label.length = 150)
rhtmlDonut::Donut(values = values, values.size = 10,
                  labels = labels, labels.size = 10,
                  groups = groups, groups.color = qColors,
                  prefix = "", suffix = "%")
rhtmlDonut::Donut(values = values,
                  labels = labels, labels.size = 11,
                  prefix = "", suffix = "%",
                  max.label.length = 120)
rhtmlDonut::Donut(values = values, labels = labels, groups = groups, groups.color = qColors, border.color = "none")

# load("data/browser.rda")
# DetailedDonutPlot::detailed.donut(values = values, labels = labels, groups = groups, groups.color = qColors)

DetailedDonutPlot::detailed.donut(values = values, labels = labels, groups = groups, groups.color = qColors, order = "alphabetical")
# DetailedDonutPlot::detailed.donut(values = values, labels = labels, groups = groups)

# order
rhtmlDonut::Donut(values = values, values.size = 10, value.thres = 0,
                  labels = labels, labels.size = 10, labels.inner = FALSE,
                  prefix = "", suffix = "%", order = "default",
                  max.label.length = 150)
rhtmlDonut::Donut(values = values, values.size = 10, value.thres = 0,
                  labels = labels, labels.size = 10,
                  prefix = "", suffix = "%", order = "initial",
                  max.label.length = 150)
rhtmlDonut::Donut(values = values, values.color = qColors, value.thres = 0,
                  labels = labels, labels.size = 10,
                  prefix = "", suffix = "%", order = "alphabetical",
                  max.label.length = 150)

rhtmlDonut::Donut(values = values, values.size = 10, border.color = "none",
                  labels = labels, labels.size = 10,
                  prefix = "", suffix = "%", order = "default")
rhtmlDonut::Donut(values = values, values.size = 10,
                  labels = labels, labels.size = 10,
                  prefix = "", suffix = "%", order = "initial")
rhtmlDonut::Donut(values = values, values.size = 10,
                  labels = labels, labels.size = 10,
                  prefix = "", suffix = "%", order = "alphabetical")

htmlwidgets::saveWidget(v, "/Users/MichaelW/Work/rhtmlDonut/index.html", selfcontained = TRUE, background = "white")
