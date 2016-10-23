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
library(devtools)
install_github("NumbersInternational/rhtmlDonut@VIS-57")
data("browser", package = "rhtmlDonut")
labels[1] = "IE xcsdsds TTDF 11.0"
labels[labels == "Chrome for Android"] = "Chrome for Android dfwer ijo 2323d fddfdfe53sdsdsdsdsdsdsds"
set.seed(1)
rhtmlDonut::Donut(values = runif(length(labels)), labels = labels)
rhtmlDonut::Donut(values = values, labels = labels, groups = groups)
rhtmlDonut::Donut(values = values, values.font.size = 10,
                  labels = labels, labels.font.size = 10,
                  groups = groups, groups.color = qColors,
                  prefix = "", suffix = "%")
rhtmlDonut::Donut(values = values,
                  labels = labels, labels.font.size = 11,
                  prefix = "", suffix = "%")
rhtmlDonut::Donut(values = values, labels = labels, groups = groups, groups.color = qColors, border.color = "none")
data("browser", package = "rhtmlDonut")
Donut(values = values, labels = labels, groups = groups)

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
library(rhtmlDonut)
Donut(values = values, values.size = 10, border.color = "none",values.order = "descending",
                  labels = labels, labels.size = 10,
                  prefix = "", suffix = "%")
Donut(values = values, values.size = 10,values.order = "initial",
                  labels = labels, labels.size = 10,
                  prefix = "", suffix = "%")
Donut(values = values, values.size = 10, values.order = "alphabetical",
                  labels = labels, labels.size = 10,
                  prefix = "", suffix = "%")
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
data("browser", package = "rhtmlDonut")
out = sort(values, decreasing = T, index.return = T)
values1 = out[[1]][1:30]
labels1 = labels[out[[2]]][1:30]
groups1 = groups[out[[2]]][1:30]
# a donut plot
rhtmlDonut::Donut(values = values1, labels = labels1, title = "This is a title")
rhtmlDonut::Donut(values = values1, labels = labels1, values.order = "descending", prefix = "", suffix = "%",
                  title = "Browser Market Share Feb/2016", title.horizontal.align = "center",title.vertical.align = "top")
rhtmlDonut::Donut(values = values1, labels = labels1, values.order = "descending", prefix = "", suffix = "%",
                  title = "Browser Market Share Feb/2016", title.horizontal.align = "center",title.vertical.align = "bottom")
rhtmlDonut::Donut(values = values1, labels = labels1, values.order = "descending", prefix = "", suffix = "%",
                  title = "Browser Market Share Feb/2016", title.horizontal.align = "right",title.vertical.align = "top")

rhtmlDonut::Donut(values = values1, labels = labels1, values.order = "descending", gradient = T, border.color = "none", prefix = "", suffix = "%")
# a donut plot with groups
rhtmlDonut::Donut(values = values1, labels = labels1, groups = groups1, inner.radius = "80%", prefix = "", suffix = "%")


rhtmlDonut::Donut(values = values1, values.size = 10, values.order = "descending", inner.radius = "80%",
                  labels = labels1, labels.size = 10, labels.inner = TRUE,
                  prefix = "", suffix = "%")
rhtmlDonut::Donut(values = values1, values.size = 10, values.thres = 0, values.order = "initial", inner.radius = "0%",
                  labels = labels1, labels.size = 10, labels.inner = FALSE, gradient = F, border.color = "white",
                  prefix = "", suffix = "%")
rhtmlDonut::Donut(values = values1, values.size = 10, values.thres = 0, values.order = "alphabetical", inner.radius = "90%",
                  labels = labels1, labels.size = 10, labels.inner = TRUE, gradient = T, border.color = "none",
                  prefix = "", suffix = "%")

devtools::document()
rhtmlDonut::Donut(values = values1, labels = labels1, groups = groups1, groups.color = qColors)

v = rhtmlDonut::Donut(values = values1, values.size = 10, values.thres = 0, values.order = "descending", inner.radius = "80%",
                      labels = labels1, labels.size = 10, labels.inner = TRUE, gradient = T, border.color = "none",
                      prefix = "", suffix = "%")
htmlwidgets::saveWidget(v, "/Users/MichaelW/Work/rhtmlDonut/index.html", selfcontained = TRUE, background = "white")

library(rhtmlDonut)
data("browser", package = "rhtmlDonut")

out = sort(values, decreasing = T, index.return = T)
# select a smaller subset, too many segments will cause rendering to become slow
values1 = out[[1]][1:30]
labels1 = labels[out[[2]]][1:30]
groups1 = groups[out[[2]]][1:30]
Donut(values = values1, labels = labels1, groups = groups1, values.order = "descending", groups.order = "alphabetical", groups.color = qColors,prefix = "", suffix = "%")

values <- c(10, 60, 30)
labels <- c("A","B","C")
values.color <- c("red", "blue", "green")
rhtmlDonut::Donut(values = values, labels = labels, values.color = values.color, values.order = "descending")

values <- c(10, 60, 30, 45, 25, 30, 25, 25, 50)
groups <- c("Male","Male", "Male", "Female","Female","Female","Undecided","Undecided","Undecided")
labels <- c("A","B","C","A","B","C","A","B","C")
values.color <- c("#E3D37C", "#F49F9A", "#E27DC3", "#E3D37C", "#F49F9A", "#E27DC3", "#E3D37C", "#F49F9A", "#E27DC3")
group.color <- c("#222222", "#999999", "#DDDDDD")

rhtmlDonut::Donut(values = values,
                  labels = labels,
                  values.color = values.color,
                  groups.color = group.color,
                  groups = groups,
                  values.order = "descending")

rhtmlDonut::Donut(values = values,
                  labels = labels,
                  values.color = values.color,
                  groups.color = group.color,
                  groups = groups,
                  values.order = "initial")

rhtmlDonut::Donut(values = values,
                  labels = labels,
                  values.color = values.color,
                  groups.color = group.color,
                  groups = groups,
                  values.order = "alphabetical")

rhtmlDonut::Donut(values = runif(26*3),values.display.thres = 0.3,
                  labels = rep(paste0(letters, letters, letters), times = 3),labels.inner = TRUE,
                  values.order = "descending")


# v = rhtmlDonut::Donut(values = values,
#                   labels = labels,
#                   values.order = "initial")

# htmlwidgets::saveWidget(v, "/Users/MichaelW/Work/rhtmlDonut/index.html", selfcontained = FALSE, background = "white")
data = read.table("/Users/MichaelW/Work/rhtmlDonut/data1.txt", sep = "\t", stringsAsFactors = FALSE)
rhtmlDonut::Donut(values = data$V1, values.order = "descending",values.decimal.places = 0,
                             values.display.as = "original", values.font.size = 11,
                             labels = data$V2, labels.min.font.size = 8, labels.font.size = 11,
                             prefix = "$",title = "This is a good title",title.top.padding = 6,title.font.size = 18,
                  values.display.thres = 0.3)

rhtmlDonut::Donut(values = data$V1, values.order = "descending", values.decimal.places = 0,
                  values.display.as = "original", values.font.size = 11, values.display.thres = 0.3,
                  labels = data$V2, labels.min.font.size = 8, labels.font.size = 11,labels.inner = TRUE,
                  title = "This is a good title", inner.radius = "80%",title.font.size = 24,
                  prefix = "$")

rhtmlDonut::Donut(values = c(3,3,3,3,3,3), labels = c("Coke Zero", "Coca Cola", "Diet Coke", "Pepsi", "Pepsi Max", "Pepsi Light"),
                  values.display.as = "original", values.font.size = 11, title = "This is a good title",title.font.size = 18,title.top.padding = 5)
rhtmlDonut::Donut(values = c(3,3,3,3,3,3), labels = c("Coke Zero", "Coca Cola", "Diet Coke", "Pepsi", "Pepsi Max", "Pepsi Light"),
                  values.display.as = "original", values.font.size = 11)

rhtmlDonut::Donut(values = c(100),
                  labels = c("Asiatic Dominions"),
                  values.order = "initial",
                  inner.radius = "45%",
                  values.decimal.places = 0,
                  title = "Russian Empire",
                  title.font.size = 24,
                  border.color = "black")
rhtmlDonut::Donut(values = c(100),
                  labels = c("Asiatic Dominions"),
                  values.order = "initial",
                  inner.radius = "45%",
                  values.decimal.places = 0,
                  title = "Russian Empire",
                  title.font.size = 24,
                  border.color = "black")
playfair.segment.colors <- c(grDevices::rgb(218, 232, 199, max = 255))
playfair.groups.colors <- c(grDevices::rgb(229, 190, 190, max = 255))

rhtmlDonut::Donut(values = c(100),
                  labels = c("Asiatic Dominions"),
                  values.color = playfair.segment.colors,
                  values.order = "initial",
                  inner.radius = "45%",
                  values.decimal.places = 0,
                  title = "Russian Empire",
                  title.font.size = 24,
                  border.color = "black")
rhtmlDonut::Donut(values = c(100),
                  labels = c("Asiatic Dominions"),
                  values.color = playfair.segment.colors,
                  values.order = "initial",
                  groups = "group1",
                  inner.radius = "45%",
                  values.decimal.places = 0,
                  title = "Russian Empire",
                  title.font.size = 24,
                  border.color = "black")
rhtmlDonut::Donut(values = c(100),
                  labels = c("Asiatic Dominions"),
                  values.color = playfair.segment.colors,
                  values.order = "initial",
                  groups = "group1",
                  groups.color = playfair.groups.colors,
                  inner.radius = "45%",
                  values.decimal.places = 0,
                  title = "Russian Empire",
                  title.font.size = 24,
                  border.color = "black")
vals = c(44,10,11,1,5,5,2,2,1,19)
labs = c("Electronics", "Clothing & Apparel", "Sports & Outdoors", "Auto Parts", "Tools & Garden", "Shoes & Accessories", "Pharmacy", "Office Supplies", "Health & Beauty", "Physical & Electronic media")
title = "Amazon Australia - category share estimate"
rhtmlDonut::Donut(values = vals, labels = labs, title = title, suffix = "%", inner.radius = "0%", labels.font.size = 12, values.font.size = 12, labels.min.font.size = 10, values.decimal.places = 0, border.color = "none")
# v = rhtmlDonut::Donut(values = data$V1,
#                   values.display = "original",
#                   labels = data$V2,labels.minFontSize = 10,
#                   prefix = "$",
#                   values.thres = 0.3)
# Issues
# wrapping texts: done
# Font size should go from high to low
# too much space at the bottom when order is descending: done
# left right labels not balanced at the boundary: done
# htmlwidgets::saveWidget(v, "/Users/MichaelW/Work/rhtmlDonut/index.html", selfcontained = FALSE, background = "white")

# change angle of tangent as a function of the width of the plot
# specify color change
library(rhtmlDonut)
data("browser", package = "rhtmlDonut")
labels <- labels[values > 0.01]
groups <- groups[values > 0.01]
values <- values[values > 0.01]
browser.data <- data.frame(groups, labels, values)#, stringsAsFactors = FALSE)
values <- browser.data$values
labels <- browser.data$labels
groups <- browser.data$groups
rhtmlDonut::Donut(values = values, labels = labels, groups = groups, prefix = "", suffix = "%")

