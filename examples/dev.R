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
rhtmlDonut::Donut(values = values, values.size = 10, values.thres = 0, values.order = "descending",
                  labels = labels, labels.size = 10, labels.inner = FALSE,
                  prefix = "", suffix = "%")
rhtmlDonut::Donut(values = values, values.size = 10, values.thres = 0, values.order = "initial",
                  labels = labels, labels.size = 10,
                  prefix = "", suffix = "%")
rhtmlDonut::Donut(values = values, values.thres = 0, values.order = "alphabetical",
                  labels = labels, labels.size = 10,
                  prefix = "", suffix = "%")

rhtmlDonut::Donut(values = values, values.size = 10, border.color = "none",
                  labels = labels, labels.size = 10,
                  prefix = "", suffix = "%", order = "default")
rhtmlDonut::Donut(values = values, values.size = 10,
                  labels = labels, labels.size = 10,
                  prefix = "", suffix = "%", order = "initial")
rhtmlDonut::Donut(values = values, values.size = 10,
                  labels = labels, labels.size = 10,
                  prefix = "", suffix = "%", order = "alphabetical")
### order


rhtmlDonut::Donut(values = values, values.order = "descending", groups.order = "descending",
                  labels = labels, groups = groups, groups.color = qColors, prefix = "", suffix = "%")
rhtmlDonut::Donut(values = values, values.order = "alphabetical", groups.order = "descending",
                  labels = labels, groups = groups, groups.color = qColors, prefix = "", suffix = "%")
rhtmlDonut::Donut(values = values, values.order = "initial", groups.order = "descending",
                  labels = labels, groups = groups, groups.color = qColors, prefix = "", suffix = "%")
rhtmlDonut::Donut(values = values, values.order = "descending", groups.order = "alphabetical",
                  labels = labels, groups = groups, groups.color = qColors, prefix = "", suffix = "%")
rhtmlDonut::Donut(values = values, values.order = "alphabetical", groups.order = "alphabetical",
                  labels = labels, groups = groups, groups.color = qColors, prefix = "", suffix = "%")
rhtmlDonut::Donut(values = values, values.order = "initial", groups.order = "alphabetical",
                  labels = labels, groups = groups, groups.color = qColors, prefix = "", suffix = "%")
rhtmlDonut::Donut(values = values, values.order = "descending", groups.order = "initial",
                  labels = labels, groups = groups, groups.color = qColors, prefix = "", suffix = "%")
rhtmlDonut::Donut(values = values, values.order = "alphabetical", groups.order = "initial",
                  labels = labels, groups = groups, groups.color = qColors, prefix = "", suffix = "%")
rhtmlDonut::Donut(values = values, values.order = "initial", groups.order = "initial",
                  labels = labels, groups = groups, groups.color = qColors, prefix = "", suffix = "%")

### gradient
out = sort(values, decreasing = T, index.return = T)
values1 = out[[1]][1:30]
labels1 = labels[out[[2]]][1:30]
groups1 = groups[out[[2]]][1:30]
# a donut plot
rhtmlDonut::Donut(values = values1, labels = labels1, values.order = "descending", prefix = "", suffix = "%")
rhtmlDonut::Donut(values = values1, labels = labels1, values.order = "descending", gradient = T, border.color = "none", prefix = "", suffix = "%")
# a donut plot with groups
rhtmlDonut::Donut(values = values1, labels = labels1, groups = groups1, prefix = "", suffix = "%")


rhtmlDonut::Donut(values = values1, values.size = 10, values.thres = 0, values.order = "descending",
                  labels = labels1, labels.size = 10, labels.inner = FALSE, gradient = T, border.color = "none",
                  prefix = "", suffix = "%")
rhtmlDonut::Donut(values = values1, values.size = 10, values.thres = 0, values.order = "initial",
                  labels = labels1, labels.size = 10, labels.inner = FALSE, gradient = F, border.color = "white",
                  prefix = "", suffix = "%")
rhtmlDonut::Donut(values = values1, values.size = 10, values.thres = 0, values.order = "alphabetical",
                  labels = labels1, labels.size = 10, labels.inner = FALSE, gradient = T, border.color = "none",
                  prefix = "", suffix = "%")

devtools::document()
rhtmlDonut::Donut(values = values1, labels = labels1, groups = groups1, groups.color = qColors)

htmlwidgets::saveWidget(v, "/Users/MichaelW/Work/rhtmlDonut/index.html", selfcontained = TRUE, background = "white")
