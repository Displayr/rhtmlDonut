#' Create an rhtmlDonut plot
#' @param values.display c("percentage", "original")
#' @param order ordering of the plot = c("default", "initial", "alphabetical", "descending")
#' @param border.color c("white", "none", hex colors)

Donut <- function(
    values,
    values.font = NULL,
    values.size = 10,
    values.color = NULL,
    values.display = "percentage",
    labels,
    labels.font = NULL,
    labels.size = 10,
    labels.color = NULL,
    groups = NULL,
    groups.font = NULL,
    groups.size = 10,
    groups.color = NULL,
    prefix = NULL,
    suffix = NULL,
    order = "default",
    order.control = TRUE,
    border.color = "white",
    max.label.length = 150,
    small.angle = NULL,
    large.angle = NULL,
    width = NULL,
    height = NULL) {

    val.perc = values/sum(values)
    vmax = max(val.perc)
    n = length(values)

    if (is.null(labels)) {
        labels = paste0("label", 1:n)
    }

    if (!is.null(groups)) {
        groups.temp = table(groups)
        groups.num = as.numeric(as.factor(groups))
        groups.bins = as.vector(groups.temp)
        groups.lab = names(groups.temp)
        ng = length(groups.lab)

        hash = new.env(hash=TRUE, parent=emptyenv(), size=ng)
        for (i in 1:ng) {
            assign(groups.lab[i], i, hash)
        }

        gnmax = max(groups.num)
        groups.sums = rep(0, length(groups.lab))
        groups.sums.each = rep(0, length(groups))
        groups.size.each = rep(0, length(groups))

        if (!is.null(groups.color)) {
            if (length(groups.color) < ng) {
                for (i in 1:(ng-length(groups.color))) {
                    groups.color = c(groups.color, groups.color[i])
                }
            }
            groups.color = groups.color[sort(unique(groups), index.return = T)$ix]
        }
        # a linear scan search, might be slow if data is too large
        for (i in 1:ng) {
            groups.sums[i] = sum(values[groups == groups.lab[i]])
        }
        groups.sums.perc = groups.sums/sum(values)
        if (order == "default" || order == "descending") {

            # group.num[i] * vmax * 10 >> values[i]
            # groups.sums[idx] * gnmax * vmax * 10000 should be >> group.num[i] * vmax * 10
            for (i in 1:n) {
                idx = get(groups[i], hash)
                groups.sums.each[i] = groups.sums.perc[idx] * gnmax * vmax * 10000 + groups.num[i] * vmax * 2 + val.perc[i]
                groups.size.each[i] = groups.bins[idx];
            }

        } else if (order == "alphabetical") {
            for (i in 1:n) {
                idx = get(groups[i], hash)
                groups.size.each[i] = groups.bins[idx];
                if (values[i] == 0) {
                    groups.sums.each[i] = groups.num[i] * vmax * 10
                } else {
                    groups.sums.each[i] = groups.num[i] * vmax * 10 + 1/values[i]
                }
                if (is.null(values.color)) {

                }
            }
        }

    } else {
        groups.lab = NULL
        groups.bins = NULL
        groups.sums = NULL
        groups.sums.each = NULL
        groups.size.each = NULL
    }

    if (is.null(small.angle)) {
        small.angle = 0.2 / 100
    } else {
        small.angle = small.angle / 100
    }

    if (is.null(large.angle)) {
        large.angle = 2 / 100
    } else {
        large.angle = large.angle / 100
    }

    if (small.angle > large.angle) {
        small.angle = large.angle
    }

    # create a list that contains the settings
    settings <- list(
        valuesFont = values.font,
        valuesSize = values.size,
        valuesColor = values.color,
        valuesDisplay = values.display,
        labelsFont = labels.font,
        labelsSize = labels.size,
        labelsColor = labels.color,
        groups = groups, # length = n
        groupsFont = groups.font, # string
        groupsSize = groups.size, # scalar
        groupsColor = groups.color, # length = length(unique(groups))
        groupsLab = groups.lab, # sorted unique labels
        groupsBins = groups.bins, # number of items in each group
        groupsSums = groups.sums, # length = length(unique(groups))
        groupsSumsEach = groups.sums.each, # length = n
        groupsSizeEach = groups.size.each, # length = n
        prefix = prefix,
        suffix = suffix,
        order = order,
        orderControl = order.control,
        maxLabelLength = max.label.length,
        minAngle = small.angle,
        maxAngle = large.angle,
        borderColor = border.color
    )

    # pass the data and settings using 'x'
    x <- list(
        values = values,
        labels = labels,
        settings = settings
    )

    # create the widget
    htmlwidgets::createWidget(
        name = "rhtmlDonut",
        x,
        width = width,
        height = height,
        sizingPolicy = htmlwidgets::sizingPolicy(
            padding = 5,
            browser.fill = TRUE, # resizing will not work if FALSE
            viewer.fill = TRUE
        ),
        package = "rhtmlDonut"
    )
}
