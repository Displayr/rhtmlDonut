function DetailedDonutPlot() {
    var values,
        labels,
        settings,
        pie,
        n,
        width = 500,
        height = 500;

    function resizeChart(el) {

        if (width < 200) {
            return;
        }

        if (height < 200) {
            return;
        }

        d3.select(".menuBox").attr("transform", "translate(" + (width - 33 - 10) + "," + 5 + ")");

        pie.options.size.canvasWidth = width;
        pie.options.size.canvasHeight = height;

        var pieDist = Math.min(width/30, height/25, 15);
        var offsetSize = Math.min(width/25, height/20, 25);
        pie.options.labels.outer.pieDistance = pieDist;
        pie.options.labels.outer.offsetSize = offsetSize;

        var canvasPadding = pie.options.misc.canvasPadding;
		var w = width - canvasPadding.left - canvasPadding.right;
		var h = height - canvasPadding.top - canvasPadding.bottom;

		// for really teeny pies, h may be < 0. Adjust it back
		h = (h < 0) ? 0 : h;

		var outerRadius = ((w * 0.67 < h) ? w * 0.67 : h) / 3;
        var maxLabelLength = (width - outerRadius*2 - pieDist*2 - 60)/2;
        pie.options.labels.mainLabel.maxLabelLength = settings.maxLabelLength ? settings.maxLabelLength : maxLabelLength;
        pie.redrawWithoutLoading();
    }

    function chart(selection) {


        // from http://stackoverflow.com/questions/6443990/javascript-calculate-brighter-colour
        function increaseBrightness(hex, percent){
            // strip the leading # if it's there
            hex = hex.replace(/^\s*#|\s*$/g, '');

            // convert 3 char codes --> 6, e.g. `E0F` --> `EE00FF`
            if(hex.length == 3){
                hex = hex.replace(/(.)/g, '$1$1');
            }

            var r = parseInt(hex.substr(0, 2), 16),
                g = parseInt(hex.substr(2, 2), 16),
                b = parseInt(hex.substr(4, 2), 16);

            return '#' +
               ((0|(1<<8) + r + (256 - r) * percent / 100).toString(16)).substr(1) +
               ((0|(1<<8) + g + (256 - g) * percent / 100).toString(16)).substr(1) +
               ((0|(1<<8) + b + (256 - b) * percent / 100).toString(16)).substr(1);
        }

        // from http://www.sitepoint.com/javascript-generate-lighter-darker-color/
        function colorLuminance(hex, lum) {

        	// validate hex string
        	hex = String(hex).replace(/[^0-9a-f]/gi, '');
        	if (hex.length < 6) {
        		hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
        	}
        	lum = lum || 0;

        	// convert to decimal and change luminosity
        	var rgb = "#", c, i;
        	for (i = 0; i < 3; i++) {
        		c = parseInt(hex.substr(i*2,2), 16);
        		c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
        		rgb += ("00"+c).substr(c.length);
        	}

        	return rgb;
        }

        // select svg element
        var svgEl = selection.select("svg")[0][0];

        var pieData = [],
            pieColor = [],
            groupData,
            groupColor = [],
            i;

        if (settings.groups) {
            groupData = [];
            var hash = {},
                idx,
                deltaLum,
                lum,
                baseColor,
                nInGroups = [];

            if (!settings.groupsColor) {
                settings.groupsColor = d3.scale.category20().range();
            }

            if (settings.groupsSums.length > settings.groupsColor.length) {
                for (i = 0; i < settings.groupsSums.length-settings.groupsColor.length; i++) {
                    settings.groupsColor.push(settings.groupsColor[i]);
                }
            }


            for (i = 0; i < settings.groupsSums.length; i++) {
                groupData.push({ label: settings.groupsNames[i], value: settings.groupsSums[i],
                                 color: settings.groupsColor[i], count: settings.groupsCounts[i]});
            }


            for (i = 0; i < n; i++) {
                pieData.push({ label: labels[i], value: values[i], index: i, group: settings.groups[i]});
            }

    		/*switch (settings.order) {
    		    case "default":
                    // group descending
                    groupData.sort(function(a, b) { return (a.value <= b.value) ?
                                                            ((a.value === b.value) ?
                                                            ((a.label.toLowerCase() > b.label.toLowerCase()) ? 1 : -1) : 1) : -1; });
                    pieData.sort(function(a, b) { return (a.groupSum < b.groupSum) ? 1 : -1; });
    		        break;
    			case "initial":
    				// show non-contiguous groups
    				break;
    			case "descending":
    			    // same as group descending
    			    //pieData.sort(function(a, b) { return (a.groupSum < b.groupSum) ? 1 : -1; });
    				//pieData.sort(function(a, b) { return (a.value < b.value) ? 1 : -1; });
    				break;
    			case "alphabetical":
    			    // group alphabetical
                    // groupData.sort(function(a, b) { return (a.label > b.label) ? 1 : -1; });
    				//pieData.sort(function(a, b) { return (a.groupSum > b.groupSum) ? 1 : -1; });
    				break;
    		}*/

            for (i = 0; i < settings.groupsSums.length; i++) {
                hash[groupData[i].label] = i;
                nInGroups.push(0);
            }

            if (!settings.valuesColor) {
                settings.valuesColor = [];
                for (i = 0; i < n; i++) {
                    idx = hash[pieData[i].group];
                    baseColor = groupData[idx].color;
                    deltaLum = 0.3 / groupData[idx].count;
                    if (deltaLum > 0.2) {
                        deltaLum = 0.2;
                    }
                    lum = deltaLum * (1 + nInGroups[idx]);
                    pieData[i].color = increaseBrightness(baseColor, lum * 100);
                    nInGroups[idx] += 1;
                }
            }

        } else {

            if (!settings.valuesColor) {

                if (settings.gradient) {
                    var colGrad = new Rainbow();
                    colGrad.setSpectrum("444444", "gold");
                    colGrad.setNumberRange(0, n-1);
                    settings.valuesColor = [];

                    for (i = 0; i < n; i++) {
                        settings.valuesColor.push("#"+ colGrad.colourAt(i));
                    }
                } else {
                    settings.valuesColor = d3.scale.category20().range();
                }

            }

            var colors = [];
            if (values.length > settings.valuesColor.length) {
                for (i = 0; i < n; i++) {
                    colors.push(settings.valuesColor[i % settings.valuesColor.length]);
                }
                settings.valuesColor = colors;
            }

            //console.log(settings.valuesColor);
            for (i = 0; i < n; i++) {
                pieData.push({ label: labels[i], value: values[i], index: i, color: settings.valuesColor[i] });
            }

        }

        dataFormatter = d3.format(",.1f");

        var pieDist = Math.min(width/30, height/25, 15);
        var offsetSize = Math.min(width/25, height/20, 25);

        var canvasPadding = {
			top: 5,
			right: 5,
			bottom: 5,
			left: 5
		};
		var w = width - canvasPadding.left - canvasPadding.right;
		var h = height - canvasPadding.top - canvasPadding.bottom;

		// for really teeny pies, h may be < 0. Adjust it back
		h = (h < 0) ? 0 : h;

		var outerRadius = ((w * 0.67 < h) ? w * 0.67 : h) / 3;

        var maxLabelLength = (width - outerRadius*2 - pieDist*2 - 60)/2;

        if (settings.orderControl) {

        var menuBox = selection.select("svg").append("g").attr("class", "menuBox");

        var menuBoxW = 33,
            menuBoxH = 28;

        menuBox.attr("transform", "translate(" + (width - menuBoxW - 10) + "," + 5 + ")");


        var menuRect = menuBox.append("rect")
                                .attr("class", "menuRect")
                                .attr("width", menuBoxW)
                                .attr("height", menuBoxH)
                                .attr("x", 0)
                                .attr("y", 0)
                                .style("fill", "white")
                                .style("stroke-width", "1px")
                                .style("stroke", "#000")
                                .style("opacity", 0.5)
                                .style("cursor", "pointer");

        var linesY = [7, 14, 21];
        var lines = menuBox.selectAll("line")
                            .data(linesY)
                            .enter()
                            .append("line")
                            .attr("x1", "6px")
                            .attr("x2", "27px")
                            .attr("y1", function(d) { return d + "px"})
                            .attr("y2", function(d) { return d + "px"})
                            .style("stroke", "#000")
                            .style("stroke-width", 1)
                            .style("cursor", "pointer")
                            .style("opacity", 0.5);

        var valuesOrder = ["Descending", "Alphabetical", "Initial"];
        var groupOrder = ["Descending", "Alphabetical", "Initial"];

        var menuTextSize = 11;
        var valuesSortHeadingSpace = menuTextSize*1.5;

        var valuesSortHeading = menuBox
                            .append("text")
                            .text("Values order")
                            .attr("x", 0)
                            .attr("y", valuesSortHeadingSpace/2)
                            .attr("dy", "0.35em")
                            .style("cursor", "pointer")
                            .style("font-family", "Arial")
                            .style("font-size", menuTextSize + "px")
                            .style("opacity", 0);

        var valuesSortText = menuBox.selectAll("t")
                            .data(valuesOrder)
                            .enter()
                            .append("text")
                            .text(function(d) { return d})
                            .attr("x", 0)
                            .attr("y", function(d,i) { return linesY[i]})
                            .attr("dy", "0.35em")
                            .style("cursor", "pointer")
                            .style("font-family", "Arial")
                            .style("font-size", menuTextSize + "px")
                            .style("opacity", 0);

        var groupsSortHeading = menuBox
                            .append("text")
                            .text("Groups order")
                            .attr("x", 0)
                            .attr("y", 28)
                            .attr("dy", "0.35em")
                            .style("cursor", "pointer")
                            .style("font-family", "Arial")
                            .style("font-size", menuTextSize + "px")
                            .style("opacity", 0);

        var groupsSortText = menuBox.selectAll("t")
                            .data(groupOrder)
                            .enter()
                            .append("text")
                            .text(function(d) { return d})
                            .attr("x", 0)
                            .attr("y", function(d,i) { return linesY[i]})
                            .attr("dy", "0.35em")
                            .style("cursor", "pointer")
                            .style("font-family", "Arial")
                            .style("font-size", menuTextSize + "px")
                            .style("opacity", 0);

        menuBox.on("mouseover", function(d) {
            menuBox.transition()
                    .duration(200)
                    .attr("transform", "translate(" + (width - menuBoxW - 50 - 10) + "," + 5 + ")");

            menuRect.transition()
                    .duration(200)
                    .attr("width", menuBoxW + 50)
                    .attr("height", 8*menuTextSize*1.5);

            valuesSortHeading.transition()
                    .duration(200)
                    .style("opacity", 1)
                    .attr("x", 2);

            valuesSortText.transition()
                    .duration(200)
                    .style("opacity", 1)
                    .attr("x", 20)
                    .attr("y", function(d,i) { return menuTextSize*1.5*i + valuesSortHeadingSpace + menuTextSize*1.5/2});

            groupsSortHeading.transition()
                    .duration(200)
                    .style("opacity", 1)
                    .attr("y", function(d,i) { return menuTextSize*1.5*3 + valuesSortHeadingSpace*1.5})
                    .attr("x", 2);

            groupsSortText.transition()
                    .duration(200)
                    .style("opacity", 1)
                    .attr("x", 20)
                    .attr("y", function(d,i) { return menuTextSize*1.5*i + valuesSortHeadingSpace*2 + menuTextSize*1.5*3 + menuTextSize*1.5/2});

            lines.transition()
                    .duration(200)
                    .style("opacity", 0);
        })
        .on("mouseout", function(d) {
            menuBox.transition()
                    .duration(200)
                    .attr("transform", "translate(" + (width - menuBoxW - 10) + "," + 5 + ")");

            menuRect.transition()
                    .duration(200)
                    .attr("width", menuBoxW)
                    .attr("height", menuBoxH);

            valuesSortHeading.transition()
                    .duration(200)
                    .style("opacity", 0)
                    .attr("x", 0);

            valuesSortText.transition()
                    .duration(200)
                    .style("opacity", 0)
                    .attr("x", 0)
                    .attr("y", function(d,i) { return linesY[i]});

            groupsSortHeading.transition()
                    .duration(200)
                    .style("opacity", 0)
                    .attr("y", 28)
                    .attr("x", 0);

            groupsSortText.transition()
                    .duration(200)
                    .style("opacity", 0)
                    .attr("x", 0)
                    .attr("y", function(d,i) { return linesY[i]});

            lines.transition()
                    .duration(200)
                    .style("opacity", 0.5);
        });
        }

        // create the pie chart instance
        pie  = new d3pie(svgEl, {
        		size: {
        		    canvasWidth: width,
        		    canvasHeight: height,
        			pieInnerRadius: "80%"
        		},
        		data: {
        			sortOrder: settings.groups ? "none" : settings.order,
            		font: settings.valuesFont ? settings.valuesFont : "arial",
            		fontSize: settings.valuesSize ? settings.valuesSize : 10,
            		prefix: settings.prefix,
            		suffix: settings.suffix,
            		color: settings.valuesColor,
            		dataFormatter: dataFormatter,
            		display: settings.valuesDisplay,
            		minAngle: settings.minAngle,
        			content: pieData
        		},
            	misc: {
            		colors: {
            			background: null,
            			segments: settings.valuesColor ? settings.valuesColor : [
            				"#2484c1", "#65a620", "#7b6888", "#a05d56", "#961a1a", "#d8d23a", "#e98125", "#d0743c", "#635222", "#6ada6a",
            				"#0c6197", "#7d9058", "#207f33", "#44b9b0", "#bca44a", "#e4a14b", "#a3acb2", "#8cc3e9", "#69a6f9", "#5b388f",
            				"#546e91", "#8bde95", "#d2ab58", "#273c71", "#98bf6e", "#4daa4b", "#98abc5", "#cc1010", "#31383b", "#006391",
            				"#c2643f", "#b0a474", "#a5a39c", "#a9c2bc", "#22af8c", "#7fcecf", "#987ac6", "#3d3b87", "#b77b1c", "#c9c2b6",
            				"#807ece", "#8db27c", "#be66a2", "#9ed3c6", "#00644b", "#005064", "#77979f", "#77e079", "#9c73ab", "#1f79a7"
            			],
            			segmentStroke: settings.borderColor ? settings.borderColor : "#ffffff"
            		},
            		gradient: {
            			enabled: false,
            			percentage: 95,
            			color: "#000000"
            		}
            	},
            	labels: {
            	    lines: {
            	        style: "aligned"
            	    },
            		outer: {
            			format: "label",
            			hideWhenLessThanPercentage: null,
            			pieDistance: pieDist,
            			offsetSize: offsetSize
            		},
            		mainLabel: {
            			color: settings.labelsColor ? settings.labelsColor : "#333333",
            			font: settings.labelsFont ? settings.labelsFont : "arial",
            			fontSize: settings.labelsSize ? settings.labelsSize : 10,
            			maxLabelLength: settings.maxLabelLength ? settings.maxLabelLength : maxLabelLength,
            			minFontSize: settings.minFontSize,
            			labelsInner: settings.labelsInner,
            			horizontalPadding: 8,
            			fontWeight: "bold"
            		}

            	},
            	tooltips: {
            		enabled: true,
            		type: "placeholder", // caption|placeholder
                string: "",
                placeholderParser: null,
            	styles: {
                  fadeInSpeed: 1,
            			backgroundColor: "#000000",
                  backgroundOpacity: 0.5,
            			color: "#efefef",
                  borderRadius: 2,
                  font: "arial",
                  fontSize: 10,
                  padding: 4
            		}
            	},
            	groups: {
            	    content: groupData,
            	    font: settings.groupsFont ? settings.groupsFont : "arial",
            	    fontSize: settings.groupsSize ? settings.groupsSize : 10,
            	    fontWeight: "bold"
            	}
            });

    }

    // getter/setter
    chart.values = function(v) {
        if (!arguments.length) return values;
        values = v;
        n = values.length;
        return chart;
    };

    chart.labels = function(v) {
        if (!arguments.length) return labels;
        labels = v;
        return chart;
    };

    chart.settings = function(v) {
        if (!arguments.length) return settings;
        settings = v;
        return chart;
    };

    // resize
    chart.resize = function(el) {
        resizeChart(el);
    };

    chart.width = function(v) {
        // width getter/setter
        if (!arguments.length) return width;
        width = v;
        return chart;
    };

    // height getter/setter
    chart.height = function(v) {
        if (!arguments.length) return height;
        height = v;
        return chart;
    };


    return chart;
}

HTMLWidgets.widget({

    name: "rhtmlDonut",

    type: "output",

    initialize: function(el, width, height) {

        d3.select(el)
            .append("svg")
            .attr("class", "svgContent")
            .attr("width", width)
            .attr("height", height);

        return DetailedDonutPlot().width(width).height(height);
    },

    resize: function(el, width, height, instance) {

        d3.select(el).select("svg")
            .attr("width", width)
            .attr("height", height);

        return instance.width(width).height(height).resize(el);
    },

    renderValue: function(el, x, instance) {

        instance = instance.settings(x.settings);
        instance = instance.values(x.values);
        instance = instance.labels(x.labels);

        d3.select(el).call(instance);

    }
});

