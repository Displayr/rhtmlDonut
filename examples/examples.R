library(devtools)
install_github("Displayr/rhtmlDonut")

data("browser", package = "rhtmlDonut")
rhtmlDonut::Donut(values = values, labels = labels, groups = groups)
rhtmlDonut::Donut(values = values, labels = labels, groups = groups, groups.color = qColors, border.color = "white")

# order
idx = sort(values, decreasing = TRUE, index.return = TRUE)
rhtmlDonut::Donut(values = values[idx$ix[1:30]],labels = labels[idx$ix[1:30]], values.order = "descending")
rhtmlDonut::Donut(values = values,labels = labels, values.order = "initial")
rhtmlDonut::Donut(values = values[idx$ix[1:30]],labels = labels[idx$ix[1:30]], values.order = "alphabetical")

rhtmlDonut::Donut(values = values, values.order = "descending", groups.order = "descending",
                  labels = labels, groups = groups, groups.color = qColors, prefix = "", suffix = "%")
rhtmlDonut::Donut(values = values, values.order = "descending", groups.order = "descending",
                  labels = labels, groups = groups, groups.color = qColors, prefix = "", suffix = "%")

# colors
rhtmlDonut::Donut(values = values, labels = labels, values.color = qColors, border.color = "none")
rhtmlDonut::Donut(values = values, labels = labels, groups = groups, groups.color = qColors, border.color = "none")

# gradient
rhtmlDonut::Donut(values = values[idx$ix[1:30]], values.font.size = 11, values.display.thres = 0, values.order = "descending", inner.radius = "80%",
                  labels = labels[idx$ix[1:30]], labels.font.size = 11, labels.inner = TRUE, gradient = T, border.color = "none",
                  prefix = "", suffix = "%")

vals = c(44,10,11,1,5,5,2,2,1,19)
labs = c("Electronics", "Clothing & Apparel", "Sports & Outdoors", "Auto Parts", "Tools & Garden", "Shoes & Accessories", "Pharmacy", "Office Supplies", "Health & Beauty", "Physical & Electronic media")
title = "Amazon Australia - category share estimate"
rhtmlDonut::Donut(values = vals, labels = labs, title = title, suffix = "%", inner.radius = "0%",
                  labels.font.size = 12, values.font.size = 12, labels.min.font.size = 10, values.decimal.places = 0, border.color = "white")
