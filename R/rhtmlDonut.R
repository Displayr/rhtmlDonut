#' Create a Donut plot
#' @param values vector of real numbers
#' @param labels character vector, length must be the same as \code{values}
#' @param values.color (optional) colors for \code{values}. If not provided then default colors are generated. If \code{groups} are provided or \code{gradient} set to \code{FALSE}, then generate colors using D3 library. If \code{groups} not provided, then can generate gradient colors when \code{gradient} is \code{TRUE}.
#' @param values.display.as (optional) choice of c("percentage", "original"). If "percentage" then values are converted to percentages. If "original" display the original data. The default is "percentage".
#' @param values.display.thres (optional) threshold of the minimum value in percentage that will have a label attached. Range is [0,1] and he default is 0.003.
#' @param values.order (optional) ordering of \code{values} = c("descending", "initial", "alphabetical"). The default is "descending".
#' @param values.decimal.places (optional) non-negative integer. Number of decimal places for \code{values} and group values (if \code{groups} exists).
#' @param labels.enabled (optional) enable / disable outer labels. The default is TRUE.
#' @param labels.font.family (optional) font family for \code{labels}. The default is "Arial"
#' @param labels.font.size (optional) desired font size in pixels for \code{labels}. The default is 10.
#' @param labels.font.color (optional) a hex value to set the font color for \code{labels}. The default is "#333333".
#' @param labels.min.font.size (optional) the minimum font size in pixels for labels. The default is 8.
#' @param labels.padding.inner (optional) Exact Padding between rows in a multi line label. Default is 1.
#' @param labels.padding.outer (optional) Padding between different labels. Default is 1.
#' @param labels.inner (optional) boolean. if \code{TRUE} then add inner labels to the pie only if both of these conditions are satisfied: (1) no \code{groups} and (2) \code{values.order} is "descending". The default is \code{FALSE}.
#' @param labels.max.width (optional) the maximum label width as a proportion of total width. The default is 0.3.
#' @param labels.max.lines (optional) the maximum number of vertical lines to allow when wrapping labels. The default is 6.
#' @param labels.offset (optional) the initial distance between outer radius and label placement, before adjustments, expressed as a proportion of the outer radius. The default is 0.1.
#' @param labels.advanced.offset.yaxis.max (optional) At top and bottom of donut, labels begin to lift off (based on labels.advanced.liftoff.angle). labels.advanced.offset.yaxis.max controls the max offset (measured at 90 degrees) from the outerRadius. Default value is 100 (pixels).
#' @param labels.advanced.liftoff.angle (optional) labels begin to pull away from the donut at this label, to alleviate crowding in the lower and upper regions of the pie. This setting controls the threshold where this occurs. The angle is computed between the radial line through the segment midpoint and the yaxis origin line. The default is 30.
#' @param labels.advanced.line.max.angle (optional) Labels are hidden if the angle between the labelLine and the radial line through the segment midpoint is greater than labels.advanced.line.max.angle. The default is 60.
#' @param labels.advanced.removal.tiebreak (optional) Control behavior in unordered sets, when removing labels during placement, and the two smallest labels have equal value. If set to "last" the last one in data set will be removed. If set to "best" the algorithm will remove the one most likely to improve label placement. The default is "best".
#' @param labels.advanced.strategy.increaseMaxLineAngleInDenseOrderedSets.enabled (optional) If enabled, add a strategy to the increases the max allowed line angle when labelling a dense ordered set. The default is true.
#' @param tooltips.max.width (optional) the maximum tooltip width as a proportion of total width. The default is 0.3.
#' @param tooltips.max.height (optional) the maximum tooltip height as a proportion of total height. The default is 0.3.
#' @param tooltips.font.family (optional) font family for tooltips. The default is "Arial".
#' @param tooltips.font.size (optional) font size for tooltips. The default is 10.
#' @param tooltips.font.color (optional) font hex color for tooltips. The default is NULL. If set to NULL, the color will be set to black or white automatically based on the background color.
#' @param tooltips.bg.color (optional) hex color code. The default is NULL. If set to NULL, the background color is the same as the segment.
#' @param tooltips.bg.opacity (optional) tooltip background opacity. A value between 0 and 1. Default is 0.8.
#' @param groups (optional) character vector that specifies the group of \code{values}. Length must be the same as \code{values}. If this is set, the inner region of the pie will be filled to indicate groups.
#' @param groups.font.family (optional) font family for \code{groups}. The default is "Arial".
#' @param groups.font.size (optional) desired font size in pixels for \code{groups}. The default is 10.
#' @param groups.font.color (optional) a hex value to set the font color for \code{groups}. The default is "#333333".
#' @param groups.min.font.size (optional) the minimum font size in pixcels for \code{groups}. The default is 8.
#' @param groups.color (optional) colors for \code{groups}. If not provided then D3 colors are generated.
#' @param groups.order (optional) ordering of \code{groups} = c("descending", "initial", "alphabetical"). The default is "descending".
#' @param groups.labels.enabled (optional) enable / disable group labels. The default is TRUE.
#' @param title (optional) specifies the title text.
#' @param title.font.family (optional) specifies the font family of the title. The default is "arial".
#' @param title.font.size (optional) specifies the font size of the title in pixels. The default is 16.
#' @param title.font.color (optional) a hex value to specify the color of the title. The default is "#333333".
#' @param title.top.padding (optional) integer to set padding for the title. Defults to 0.
#' @param subtitle is the subtitle text given to the plot
#' @param subtitle.font.family is the font of the subtitle text
#' @param subtitle.font.color is the font color of the subtitle text
#' @param subtitle.font.size is the font size of the subtitle text
#' @param footer is the footer text given at the bottom at the plot
#' @param footer.font.family is the font of the footer text
#' @param footer.font.color is the font color of the footer text
#' @param footer.font.size is the font size of the footer text
#' @param prefix (optional) character, prefix for \code{labels}
#' @param suffix (optional) character, suffix for \code{labels}
#' @param border.color (optional) hex value, or "none"
#' @param gradient (optional) if \code{groups} is not provided, set this parameter to \code{TRUE} will generate gradient colors for \code{values} if \code{values.color} is not provided.
#' @param inner.radius (optional) specifies the pie inner radius as a proportion of the outer radius. Range is [0,1). Default is 0.8.
#' @param log.level (optional) specifies logging verbosity. Default is "info". Options as ["debug", "info", "warn", "error"].



#' @examples
#' # load example data
#' data("browser", package = "rhtmlDonut")
#' # select a smaller subset
#' out = sort(values, decreasing = T, index.return = T)
#' values1 = out[[1]][1:30]
#' labels1 = labels[out[[2]]][1:30]
#' groups1 = groups[out[[2]]][1:30]
#' # a donut plot
#' rhtmlDonut::Donut(values = values1,
#'                  labels = labels1,
#'                  values.order = "descending",
#'                  prefix = "", suffix = "%")
#' rhtmlDonut::Donut(values = values1,
#'                  labels = labels1,
#'                  values.order = "descending",
#'                  gradient = T,
#'                  border.color = "none",
#'                  prefix = "", suffix = "%")
#' # a donut plot with groups
#' rhtmlDonut::Donut(values = values1,
#'                  labels = labels1,
#'                  groups = groups1,
#'                  prefix = "", suffix = "%")

#' @return a donut plot
#' @export
#'
Donut <- function(
    values,
    labels,
    values.color = NULL,
    values.order = "descending",
    values.font.family = "arial",
    values.font.size = 10,
    values.decimal.places = 1,
    values.display.as = "percentage",
    values.display.thres = 0.003,
    labels.enabled = TRUE,
    labels.font.family = "arial",
    labels.font.color = "#333333",
    labels.font.size = 10,
    labels.min.font.size = 8,
    labels.padding.inner = 1,
    labels.padding.outer = 1,
    labels.max.width = 0.3,
    labels.max.lines = 6,
    labels.offset = 0.1,
    labels.advanced.offset.yaxis.max = NULL,
    labels.advanced.liftoff.angle = 30,
    labels.advanced.line.max.angle = 60,
    labels.advanced.removal.tiebreak = "best",
    labels.advanced.strategy.increaseMaxLineAngleInDenseOrderedSets.enabled = TRUE,
    tooltips.max.width = 0.3,
    tooltips.max.height = 0.3,
    tooltips.font.family = "Arial",
    tooltips.font.size = 10,
    tooltips.font.color = NULL,
    tooltips.bg.color = NULL,
    tooltips.bg.opacity = 0.8,
    groups = NULL,
    groups.color = NULL,
    groups.order = "initial",
    groups.font.family = "arial",
    groups.font.color = "#333333",
    groups.font.size = 10,
    groups.min.font.size = 8,
    groups.labels.enabled = TRUE,
    labels.inner = FALSE,
    footer = "",
    footer.font.family = "Arial",
    footer.font.size = 8,
    footer.font.color = rgb(44, 44, 44, maxColorValue = 255),
    title = NULL,
    title.font.family = "arial",
    title.font.size = 16,
    title.font.color = "#333333",
    title.top.padding = 0,
    subtitle = "",
    subtitle.font.family = "Arial",
    subtitle.font.size = 12,
    subtitle.font.color = rgb(44, 44, 44, maxColorValue = 255),
    prefix = NULL,
    suffix = NULL,
    border.color = "#ffffff",
    gradient = FALSE, # not used by pieChart.R
    inner.radius = 0.8,
    log.level = "info") {

    # What does the logic between here and rhtmlDonut do ?
    #  * validate and enforce format of values and labels
    #  * compute group sums
    #  * ensure there are enough group colors
    #  * compute group counts
    #  * reorder values and groups depending on order "descending" v "alphabetical" v "initial"

    if (is.null(values)) { stop("values must not be empty") }
    if (is.null(labels)) { stop("labels must not be empty") }
    if (is.character(inner.radius) && grepl("^\\d+(\\.\\d+)?%$", inner.radius))
        inner.radius <- as.numeric(sub("%", "", inner.radius)) / 100
    if (inner.radius >= 1 || inner.radius < 0) { stop("inner.radius must be 0 or greater and less than 1") }

    if (!is.vector(values)) {
        if (is.matrix(values) || is.data.frame(values))
            stop("values must be a vector-like object")
        if (is.list(values))
            values <- unlist(values)
        else
            stop("Data type of values is not recognized")
    }

    if (!is.vector(labels)) {
        if (is.matrix(labels) || is.data.frame(labels))
            stop("labels must be a vector-like object")
        if (is.list(labels))
            labels <- unlist(labels)
        else if (is.factor(labels))
            labels <- as.character(labels)
        else
            stop("Data type of labels is not recognized")
    }

    if (length(labels) != length(values))
        stop("length of labels and values must be equal")

    if (!is.null(values.color)) {
        if (length(values.color) != length(values))
            stop("length of values.color and values must be equal")
        values.color = as.array(values.color)
        checkColor(values.color)
    }
    if (!is.null(groups))
        groups = as.array(groups)
    if (!is.null(groups.color)) {
        groups.color = as.array(groups.color)
        checkColor(groups.color, "outer ring")
    }
    if (!is.null(labels.font.color))
        checkColor(labels.font.color, "labels")
    if (!is.null(tooltips.font.color))
        checkColor(tooltips.font.color, "hovertext")
    if (!is.null(tooltips.bg.color))
        checkColor(tooltips.bg.color, "hovertext background")
    if (!is.null(groups.font.color))
        checkColor(groups.font.color, "group labels")
    if (!is.null(title.font.color))
        checkColor(title.font.color, "title")
    if (!is.null(subtitle.font.color))
        checkColor(subtitle.font.color, "subtitle")
    if (!is.null(footer.font.color))
        checkColor(footer.font.color, "footer")
    if (!is.null(border.color) && border.color != "None")
        checkColor(border.color, "border")

    val.perc = values/sum(values)
    vmax = max(val.perc)
    n = length(values)

    if (!is.null(groups)) {
        if (is.factor(groups))
            groups <- as.character(groups)
        groups.names = unique(groups)
        groups.sums = rep(0, length(groups.names))
        ng = length(groups.names)
        g.order = 1:ng

        # order the group variable
        if (groups.order == "initial") {
            # a linear scan search, might be slow if data is too large
            for (i in 1:ng) {
                groups.sums[i] = sum(values[groups == groups.names[i]])
            }

        } else if (groups.order == "descending"){
            # a linear scan search, might be slow if data is too large
            for (i in 1:ng) {
                groups.sums[i] = sum(values[groups == groups.names[i]])
            }
            out = sort(groups.sums, decreasing = T, index.return = T)
            groups.sums = out[[1]]
            g.order = out[[2]]
            groups.names = groups.names[out[[2]]]

        } else if (groups.order == "alphabetical") {
            out = sort(groups.names, index.return = T)
            groups.names = out[[1]]
            g.order = out[[2]]
            # a linear scan search, might be slow if data is too large
            for (i in 1:ng) {
                groups.sums[i] = sum(values[groups == groups.names[i]])
            }
        }

        if (!is.null(groups.color)) {
            if (length(groups.color) < ng) {
                for (i in 1:(ng-length(groups.color))) {
                    groups.color = c(groups.color, groups.color[i])
                }
            }
            groups.color = groups.color[g.order]
        }

        hash = new.env(hash=TRUE, parent=emptyenv(), size=ng)
        for (i in 1:ng) {
            assign(groups.names[i], i, hash)
        }

        groups.counts.temp = table(groups)
        groups.lab = names(groups.counts.temp)
        groups.counts = rep(0, ng)
        for (i in 1:ng) {
            idx = get(groups.lab[i], hash)
            groups.counts[idx] = groups.counts.temp[i]
        }

        groups.perc = groups.sums/sum(values)

        groups.sums.each = rep(0, length(groups))
        groups.size.each = rep(0, length(groups))

        if (values.order == "descending"){
            for (i in 1:n) {
                idx = get(groups[i], hash)
                groups.sums.each[i] = idx * (vmax+1) * 10 - val.perc[i]
                # groups.size.each[i] = groups.bins[idx]
            }
            v.order = sort(groups.sums.each, decreasing = F, index.return = T)
            values = values[v.order[[2]]]
            labels = labels[v.order[[2]]]
            groups = groups[v.order[[2]]]
            if (!is.null(values.color)) {
                values.color = values.color[v.order[[2]]]
            }
        } else if (values.order == "alphabetical") {
            values.group.idx = rep(0, n)
            labels.group.mat = matrix(rep("", n*ng), nrow = ng)
            values.group.mat = matrix(rep(-1, n*ng), nrow = ng)
            if (!is.null(values.color)) {
                values.col.group.mat = matrix(rep("", n*ng), nrow = ng)
            }

            groups.mat = matrix(rep("", n*ng), nrow = ng)
            c = rep(1, ng)

            for (i in 1:n) {
                values.group.idx[i] = get(groups[i], hash)
                labels.group.mat[values.group.idx[i], c[values.group.idx[i]]] = labels[i]
                values.group.mat[values.group.idx[i], c[values.group.idx[i]]] = values[i]
                if (!is.null(values.color)) {
                    values.col.group.mat[values.group.idx[i], c[values.group.idx[i]]] = values.color[i]
                }
                groups.mat[values.group.idx[i], c[values.group.idx[i]]] = groups[i]
                c[values.group.idx[i]] = c[values.group.idx[i]] + 1
            }


            values = c()
            labels = c()
            groups = c()
            if (!is.null(values.color)) {
                values.color = c()
                vc.not.null = TRUE
            } else {
                vc.not.null = FALSE
            }

            for (i in 1:ng) {
                labels.group.v = labels.group.mat[i, labels.group.mat[i,] != ""]
                values.group.v = values.group.mat[i, values.group.mat[i,] != -1]
                groups.v = groups.mat[i, groups.mat[i,] != ""]

                out = sort(labels.group.v, index.return = T)
                labels.group.v = out[[1]]
                values.group.v = values.group.v[out[[2]]]
                groups.v = groups.v[out[[2]]]
                values = c(values, values.group.v)
                labels = c(labels, labels.group.v)
                groups = c(groups, groups.v)
                if (vc.not.null) {
                    values.col.group.v = values.col.group.mat[i, values.col.group.mat[i,] != ""]
                    values.col.group.v = values.col.group.v[out[[2]]]
                    values.color = c(values.color, values.col.group.v)
                }

            }
        } else if (values.order == "initial") {
            values.group.idx = rep(0, n)
            labels.group.mat = matrix(rep("", n*ng), nrow = ng)
            values.group.mat = matrix(rep(-1, n*ng), nrow = ng)
            groups.mat = matrix(rep("", n*ng), nrow = ng)
            if (!is.null(values.color)) {
                values.col.group.mat = matrix(rep("", n*ng), nrow = ng)
            }
            c = rep(1, ng)

            for (i in 1:n) {
                values.group.idx[i] = get(groups[i], hash)
                labels.group.mat[values.group.idx[i], c[values.group.idx[i]]] = labels[i]
                values.group.mat[values.group.idx[i], c[values.group.idx[i]]] = values[i]
                groups.mat[values.group.idx[i], c[values.group.idx[i]]] = groups[i]
                if (!is.null(values.color)) {
                    values.col.group.mat[values.group.idx[i], c[values.group.idx[i]]] = values.color[i]
                }
                c[values.group.idx[i]] = c[values.group.idx[i]] + 1
            }

            values = c()
            labels = c()
            groups = c()
            if (!is.null(values.color)) {
                values.color = c()
                vc.not.null = TRUE
            } else {
                vc.not.null = FALSE
            }

            for (i in 1:ng) {
                labels.group.v = labels.group.mat[i, labels.group.mat[i,] != ""]
                values.group.v = values.group.mat[i, values.group.mat[i,] != -1]
                groups.v = groups.mat[i, groups.mat[i,] != ""]
                values = c(values, values.group.v)
                labels = c(labels, labels.group.v)
                groups = c(groups, groups.v)
                if (vc.not.null) {
                    values.col.group.v = values.col.group.mat[i, values.col.group.mat[i,] != ""]
                    values.color = c(values.color, values.col.group.v)
                }
            }
        }

    } else {

        if (values.order == "initial") {
            # do nothing
            order.index = 1:length(values)
        } else if (values.order == "descending"){
            v.order = sort(values, decreasing = T, index.return = T)
            values = v.order[[1]]
            order.index = v.order[[2]]
            labels = labels[v.order[[2]]]
        } else if (values.order == "alphabetical") {
            v.order = sort(labels, decreasing = F, index.return = T)
            labels = v.order[[1]]
            order.index = v.order[[2]]
            values = values[v.order[[2]]]
        }

        if (!is.null(values.color)) {
            values.color = values.color[order.index]
        }

        groups.names = NULL
        groups.counts = NULL
        groups.sums = NULL
    }

    if (!is.null(values))
        values = as.array(values)
    if (!is.null(labels))
        labels = as.array(labels)
    if (!is.null(values.color))
        values.color = as.array(values.color)
    if (!is.null(groups))
        groups = as.array(groups)
    if (!is.null(groups.color))
        groups.color = as.array(groups.color)
    if (!is.null(groups.sums))
        groups.sums = as.array(groups.sums)
    if (!is.null(groups.counts))
        groups.counts = as.array(groups.counts)
    if (!is.null(groups.names))
        groups.names = as.array(groups.names)


    # create a list that contains the settings
    settings <- list(
        valuesColor = values.color,
        valuesDisplay = values.display.as,
        valuesOrder = values.order,
        valuesDec = values.decimal.places,
        labelsEnabled = labels.enabled,
        labelsFont = labels.font.family,
        labelsSize = labels.font.size,
        labelsColor = labels.font.color,
        labelsMinFontSize = labels.min.font.size,
        labelsInner = labels.inner,
        labelsInnerPadding = labels.padding.inner,
        labelsOuterPadding = labels.padding.outer,
        labelsMaxWidth = labels.max.width,
        labelsMaxLines = labels.max.lines,
        labelOffset = labels.offset,
        labelMaxVerticalOffset = labels.advanced.offset.yaxis.max,
        labelLiftOffAngle = labels.advanced.liftoff.angle,
        labelMaxLineAngle = labels.advanced.line.max.angle,
        labelUnorderedRemovalTiebreak = labels.advanced.removal.tiebreak,
        labelStrategyIncreaseMaxLineAngleInDenseOrderedSets = labels.advanced.strategy.increaseMaxLineAngleInDenseOrderedSets.enabled,
        tooltipMaxWidth = tooltips.max.width,
        tooltipMaxHeight = tooltips.max.height,
        tooltipFontFamily = tooltips.font.family,
        tooltipFontSize = tooltips.font.size,
        tooltipFontColor = tooltips.font.color,
        tooltipBackgroundColor = tooltips.bg.color,
        tooltipBackgroundOpacity = tooltips.bg.opacity,
        groups = groups, # length = n
        groupsFont = groups.font.family, # string
        groupsFontColor = groups.font.color,
        groupsSize = groups.font.size, # scalar
        groupsColor = groups.color, # length = length(unique(groups))
        groupsNames = groups.names,
        groupsSums = groups.sums, # length = length(unique(groups))
        groupsCounts = groups.counts, # number of items in each group
        groupLabelsEnabled = groups.labels.enabled,
        groupLabelsMinFontSize = groups.min.font.size,
        footer = footer,
        footerFontFamily = footer.font.family,
        footerFontSize = footer.font.size,
        footerFontColor = footer.font.color,
        title = title,
        titleFontFamily = title.font.family,
        titleFontSize = title.font.size,
        titleFontColor = title.font.color,
        titleTopPadding = title.top.padding,
        subtitle = subtitle,
        subtitleFontFamily = subtitle.font.family,
        subtitleFontSize = subtitle.font.size,
        subtitleFontColor = subtitle.font.color,
        prefix = prefix,
        suffix = suffix,
        gradient = gradient,
        innerRadius = inner.radius,
        minAngle = values.display.thres,
        borderColor = border.color,
        logLevel = log.level
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
        sizingPolicy = htmlwidgets::sizingPolicy(
            padding = 0,
            browser.fill = TRUE, # resizing will not work if FALSE
            viewer.fill = TRUE
        ),
        package = "rhtmlDonut"
    )
}

checkColor <- function(colors, input.name = NULL)
{
    is.invalid <- !(gsub(" ", "", tolower(colors)) %in% .html.colors) &
                  !grepl("^#(?:[0-9a-fA-F]{3}){1,2}$", colors)

    if (any(is.invalid))
    {
        n.invalid <- sum(is.invalid)
        msg.prefix <- paste0("The following input ",
                             ngettext(n.invalid, "color", "colors"))
        if (!is.null(input.name))
            msg.prefix <- paste0(msg.prefix, " for the ", input.name)

        stop(msg.prefix, ngettext(n.invalid, " is", " are"),
             " invalid: ",
             paste0(colors[is.invalid], collapse = ", "),
             ". Colors need to be a valid HTML color ",
             "(https://www.w3schools.com/colors/colors_names.asp) or a valid ",
             "hex color consisting of the character # followed by ",
             "either 3 or 6 characters from 0-9 and A-F, e.g., #ABC123.")
    }
}

.html.colors <- c("aliceblue", "antiquewhite", "aqua", "aquamarine",
                  "azure", "beige", "bisque", "black", "blanchedalmond",
                  "blue", "blueviolet", "brown", "burlywood", "cadetblue",
                  "chartreuse", "chocolate", "coral", "cornflowerblue",
                  "cornsilk", "crimson", "cyan", "darkblue", "darkcyan",
                  "darkgoldenrod", "darkgray", "darkgrey", "darkgreen",
                  "darkkhaki", "darkmagenta", "darkolivegreen", "darkorange",
                  "darkorchid", "darkred", "darksalmon", "darkseagreen",
                  "darkslateblue", "darkslategray", "darkslategrey",
                  "darkturquoise", "darkviolet", "deeppink", "deepskyblue",
                  "dimgray", "dimgrey", "dodgerblue", "firebrick",
                  "floralwhite", "forestgreen", "fuchsia", "gainsboro",
                  "ghostwhite", "gold", "goldenrod", "gray", "grey", "green",
                  "greenyellow", "honeydew", "hotpink", "indianred", "indigo",
                  "ivory", "khaki", "lavender", "lavenderblush", "lawngreen",
                  "lemonchiffon", "lightblue", "lightcoral", "lightcyan",
                  "lightgoldenrodyellow", "lightgray", "lightgrey",
                  "lightgreen", "lightpink", "lightsalmon", "lightseagreen",
                  "lightskyblue", "lightslategray", "lightslategrey",
                  "lightsteelblue", "lightyellow", "lime", "limegreen",
                  "linen", "magenta", "maroon", "mediumaquamarine",
                  "mediumblue", "mediumorchid", "mediumpurple",
                  "mediumseagreen", "mediumslateblue", "mediumspringgreen",
                  "mediumturquoise", "mediumvioletred", "midnightblue",
                  "mintcream", "mistyrose", "moccasin", "navajowhite",
                  "navy", "oldlace", "olive", "olivedrab", "orange",
                  "orangered", "orchid", "palegoldenrod", "palegreen",
                  "paleturquoise", "palevioletred", "papayawhip", "peachpuff",
                  "peru", "pink", "plum", "powderblue", "purple",
                  "rebeccapurple", "red", "rosybrown", "royalblue",
                  "saddlebrown", "salmon", "sandybrown", "seagreen",
                  "seashell", "sienna", "silver", "skyblue", "slateblue",
                  "slategray", "slategrey", "snow", "springgreen", "steelblue",
                  "tan", "teal", "thistle", "tomato", "turquoise", "violet",
                  "wheat", "white", "whitesmoke", "yellow", "yellowgreen")
