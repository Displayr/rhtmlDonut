detailed.donut <- function(
    values,
    values.font = NULL,
    values.size = 10,
    values.color = NULL,
    labels = NULL,
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
    width = NULL,
    height = NULL) {

    n = length(values)

    if (is.null(labels)) {
        labels = paste0("label", 1:n)
    }

    if (!is.null(groups)) {
        groups.lab = unique(groups)
        groups.sums = rep(0, length(groups.lab))
        for (i in 1:length(groups.lab)) {
            groups.sums[i] = sum(values[groups == groups.lab[i]])
        }
    } else {
        groups.lab = NULL
        groups.sums = NULL
    }


    # create a list that contains the settings
    settings <- list(
        valuesFont = values.font,
        valuesSize = values.size,
        valuesColor = values.color,
        labelsFont = labels.font,
        labelsSize = labels.size,
        labelsColor = labels.color,
        groupsLab = groups.lab,
        groupsSums = groups.sums,
        groups = groups,
        groupsFont = groups.font,
        groupsSize = groups.size,
        groupsColor = groups.color,
        prefix = prefix,
        suffix = suffix,
        order = order,
        orderControl = order.control,
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
        name = "DetailedDonutPlot",
        x,
        width = width,
        height = height,
        sizingPolicy = htmlwidgets::sizingPolicy(
            padding = 5,
            browser.fill = TRUE, # resizing will not work if FALSE
            viewer.fill = TRUE
        ),
        package = "DetailedDonutPlot"
    )
}
