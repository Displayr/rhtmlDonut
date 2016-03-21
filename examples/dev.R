library(devtools)
install_github("xtmwang/DetailedDonutPlot")

browser = as.data.frame(data.table::fread("examples/browser_version.csv", header = T, sep = ","))
values = as.numeric(browser[13,-1])
labels = colnames(browser)[-1]
groups = strsplit(labels, " ")
groups = sapply(groups, function(x){x[1]})

DetailedDonutPlot::detailed.donut(values = values, labels = labels, groups = groups)
DetailedDonutPlot::detailed.donut(values = values, labels = labels)
