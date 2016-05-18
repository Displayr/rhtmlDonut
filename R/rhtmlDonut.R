#' Create a Donut plot
#' @param values vector of real numbers
#' @param labels character vector, length must be the same as \code{values}
#' @param values.font (optional) font for \code{values}. Default is "Arial".
#' @param values.size (optional) desired font size in pixels for \code{values}. Default is 10.
#' @param values.color (optional) colors for \code{values}. If not provided then default colors are generated. If \code{group} is provided or \code{gradient} set to \code{FALSE}, then generate colors using D3 library. If \code{group} not provided, then can generate gradient colors when \code{gradient} is \code{TRUE}.
#' @param values.display (optional) choice of c("percentage", "original"). If "percentage" then values are converted to percentages. If "original" display the original data. Default is "percentage".
#' @param values.thres (optional) threshold of the minimum value in percentage that will have a label attached. Range is [0,100] and default is 0.3.
#' @param values.order (optional) ordering of \code{values} = c("descending", "initial", "alphabetical"). Default is "descending".
#' @param labels.font (optional) font for \code{labels}. Default is "Arial"
#' @param labels.size (optional) desired font size in pixels for \code{labels}. Default is 10.
#' @param labels.color (optional) a hex value to set the label color for \code{labels}. Default is "#333333".
#' @param labels.minFontSize (optional) the minimum font size in pixels for labels. Default is 8.
#' @param groups (optional) character vector that specifies the group of \code{values}. Length must be the same as \code{values}. If this is set, the inner region of the pie will be filled to indicate groups.
#' @param groups.font (optional) font for \code{groups}. Default is "Arial".
#' @param groups.size (optional) desired font size in pixels for \code{groups}. Default is 10.
#' @param groups.color (optional) colors for \code{groups}. If not provided then D3 colors are generated.
#' @param groups.order (optional) ordering of \code{groups} = c("descending", "initial", "alphabetical"). Default is "descending".
#' @param prefix (optional) character, prefix for \code{labels}
#' @param suffix (optional) character, suffix for \code{labels}
#' @param border.color (optional) c("white", "none", hex colors)
#' @param gradient (optional) if \code{group} is not provided, set this parameter to \code{TRUE} will generate gradient colors for \code{values} if \code{values.color} is not provided.
#' @param max.label.length (optional) sets custom label length constraint. Usually this does not need to be set and auto wrapping will apply.

#' @examples
#' # load example data
#' data("browser", package = "rhtmlDonut")
#' # select a smaller subset
#' out = sort(values, decreasing = T, index.return = T)
#' values1 = out[[1]][1:30]
#' labels1 = labels[out[[2]]][1:30]
#' groups1 = groups[out[[2]]][1:30]
#' # a donut plot
#' rhtmlDonut::Donut(values = values1, labels = labels1, values.order = "descending", prefix = "", suffix = "%")
#' rhtmlDonut::Donut(values = values1, labels = labels1, values.order = "descending", gradient = T, border.color = "none", prefix = "", suffix = "%")
#' # a donut plot with groups
#' rhtmlDonut::Donut(values = values1, labels = labels1, groups = groups1, prefix = "", suffix = "%")

#' @return a donut plot
#' @export
#'
Donut <- function(
    values,
    values.font = NULL,
    values.size = 10,
    values.color = NULL,
    values.display = "percentage",
    values.thres = NULL,
    values.order = "descending",
    labels,
    labels.font = NULL,
    labels.size = 10,
    labels.color = NULL,
    labels.minFontSize = 8,
    labels.inner = FALSE,
    groups = NULL,
    groups.font = NULL,
    groups.size = 10,
    groups.color = NULL,
    groups.order = "descending",
    prefix = NULL,
    suffix = NULL,
    order.control = TRUE,
    border.color = "white",
    gradient = FALSE,
    max.label.length = NULL,
    width = NULL,
    height = NULL) {

    val.perc = values/sum(values)
    vmax = max(val.perc)
    n = length(values)

    if (is.null(labels)) {
        labels = paste0("label", 1:n)
    }

    if (!is.null(groups)) {
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
        } else if (values.order == "alphabetical") {
            values.group.idx = rep(0, n)
            labels.group.mat = matrix(rep("", n*ng), nrow = ng)
            values.group.mat = matrix(rep(-1, n*ng), nrow = ng)
            groups.mat = matrix(rep("", n*ng), nrow = ng)
            c = rep(1, ng)

            for (i in 1:n) {
                values.group.idx[i] = get(groups[i], hash)
                labels.group.mat[values.group.idx[i], c[values.group.idx[i]]] = labels[i]
                values.group.mat[values.group.idx[i], c[values.group.idx[i]]] = values[i]
                groups.mat[values.group.idx[i], c[values.group.idx[i]]] = groups[i]
                c[values.group.idx[i]] = c[values.group.idx[i]] + 1
            }

            values = c()
            labels = c()
            groups = c()
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
            }
        } else if (values.order == "initial") {

        }

        # order the values in the groups
#         if (groups.order == "initial") {
#             if (values.order == "initial") {
#                 # do nothing
#             } else  else if (values.order == "alphabetical") {
#                 for (i in 1:n) {
#                     idx = get(groups[i], hash)
#                     # groups.size.each[i] = groups.bins[idx];
#                     if (values[i] == 0) {
#                         groups.sums.each[i] = groups.num[i] * vmax * 10
#                     } else {
#                         groups.sums.each[i] = groups.num[i] * vmax * 10 + 1/values[i]
#                     }
#                 }
#             }
#         } else if (groups.order == "descending"){
#
#         } else if (groups.order == "alphabetical") {
#
#         }
#
#         # groups.bins = as.vector(groups.temp)
#         groups.lab = names(groups.temp)



#         if (order == "default" || order == "descending") {
#
#             # group.num[i] * vmax * 10 >> values[i]
#             # groups.sums[idx] * gnmax * vmax * 10000 should be >> group.num[i] * vmax * 10
#             for (i in 1:n) {
#                 idx = get(groups[i], hash)
#                 groups.sums.each[i] = groups.perc[idx] * gnmax * vmax * 10000 + groups.num[i] * vmax * 2 + val.perc[i]
#                 groups.size.each[i] = groups.bins[idx];
#             }
#
#         } else if (order == "alphabetical") {
#             for (i in 1:n) {
#                 idx = get(groups[i], hash)
#                 groups.size.each[i] = groups.bins[idx];
#                 if (values[i] == 0) {
#                     groups.sums.each[i] = groups.num[i] * vmax * 10
#                 } else {
#                     groups.sums.each[i] = groups.num[i] * vmax * 10 + 1/values[i]
#                 }
#                 if (is.null(values.color)) {
#
#                 }
#             }
#         }

    } else {

        if (values.order == "initial") {
            # do nothing
        } else if (values.order == "descending"){
            v.order = sort(values, decreasing = T, index.return = T)
            values = v.order[[1]]
            labels = labels[v.order[[2]]]
        } else if (values.order == "alphabetical") {
            v.order = sort(labels, decreasing = F, index.return = T)
            labels = v.order[[1]]
            values = values[v.order[[2]]]
        }

        groups.names = NULL
        groups.counts = NULL
        groups.sums = NULL
    }

    if (is.null(values.thres)) {
        values.thres = 0.3 / 100
    } else {
        if (values.thres > 100) {
            values.thres = 100
        }
        values.thres = values.thres / 100
    }

#     if (is.null(large.angle)) {
#         large.angle = 2 / 100
#     } else {
#         large.angle = large.angle / 100
#     }
#
#     if (small.angle > large.angle) {
#         small.angle = large.angle
#     }

    # create a list that contains the settings
    settings <- list(
        valuesFont = values.font,
        valuesSize = values.size,
        valuesColor = values.color,
        valuesDisplay = values.display,
        labelsFont = labels.font,
        labelsSize = labels.size,
        labelsColor = labels.color,
        labelsInner = labels.inner,
        groups = groups, # length = n
        groupsFont = groups.font, # string
        groupsSize = groups.size, # scalar
        groupsColor = groups.color, # length = length(unique(groups))
        #groupsLab = groups.lab, # sorted unique labels

        groupsNames = groups.names,
        groupsSums = groups.sums, # length = length(unique(groups))
        groupsCounts = groups.counts, # number of items in each group
        # groupsSumsEach = groups.sums.each, # length = n
        # groupsSizeEach = groups.size.each, # length = n
        prefix = prefix,
        suffix = suffix,
        order = order,
        orderControl = order.control,
        gradient = gradient,
        maxLabelLength = max.label.length,
        minAngle = values.thres,
        minFontSize = labels.minFontSize,
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
            padding = 0,
            browser.fill = TRUE, # resizing will not work if FALSE
            viewer.fill = TRUE
        ),
        package = "rhtmlDonut"
    )
}
