detailed.donut <- function(
    values,
    values.font = 10,
    values.size = NULL,
    values.color = NULL,
    labels = NULL,
    labels.font = 10,
    labels.size = NULL,
    labels.color = NULL,
    groups = NULL,
    groups.font = 10,
    groups.size = NULL,
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


    # create a list that contains the settings
    settings <- list(
        valuesFont = values.font,
        valuesSize = values.size,
        valuesColor = values.color,
        labelsFont = labels.font,
        labelsSize = labels.size,
        labelsColor = labels.color,
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
