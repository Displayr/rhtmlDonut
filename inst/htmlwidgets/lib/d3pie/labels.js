
	//// --------- labels.js -----------
var labels = {

	/**
	 * Adds the labels to the pie chart, but doesn't position them. There are two locations for the
	 * labels: inside (center) of the segments, or outside the segments on the edge.
	 * @param section "inner" or "outer"
	 * @param sectionDisplayType "percentage", "value", "label", "label-value1", etc.
	 * @param pie
	 */
	add: function(pie, section, sectionDisplayType) {
		var include = labels.getIncludes(sectionDisplayType);
		var settings = pie.options.labels;

		d3.selectAll("." + pie.cssPrefix + "labels-outer").remove();
		d3.selectAll("." + pie.cssPrefix + "labels-extra").remove();
		d3.selectAll("." + pie.cssPrefix + "labels-group").remove();
		d3.selectAll("." + pie.cssPrefix + "lineGroups").remove();
        d3.selectAll("." + pie.cssPrefix + "tooltips").remove();
        d3.selectAll("." + pie.cssPrefix + "gtooltips").remove();

		// group the label groups (label, percentage, value) into a single element for simpler positioning
		var outerLabel = pie.svg.insert("g", "." + pie.cssPrefix + "labels-" + section)
			.attr("class", pie.cssPrefix + "labels-" + section);

		var labelGroup = outerLabel.selectAll("." + pie.cssPrefix + "labelGroup-" + section)
			.data(pie.options.data.content)
			.enter()
			.append("g")
			.attr("id", function(d, i) { return pie.cssPrefix + "labelGroup" + i + "-" + section; })
			.attr("data-index", function(d, i) { return i; })
			.attr("class", pie.cssPrefix + "labelGroup-" + section)
			.style("opacity", 0);

        var formatterContext = { section: section, sectionDisplayType: sectionDisplayType };

		// 1. Add the main label
		if (include.mainLabel) {
		    var textGroups = labelGroup.append("text")
				.attr("id", function(d, i) { return pie.cssPrefix + "segmentMainLabel" + i + "-" + section; })
				.attr("class", pie.cssPrefix + "segmentMainLabel-" + section)
				.attr("x", 0)
				.attr("y", 0)
				.attr("dy", 0)
			    .style("fill", pie.options.labels.mainLabel.color);

			textGroups.append("tspan")
				.attr("x", 0)
				.attr("y", 0)
				.attr("dy", 0)
				.style("font-size", settings.mainLabel.minFontSize + "px")
				.style("font-family", settings.mainLabel.font)
				.style("font-weight", settings.mainLabel.fontWeight)
				.text(function(d, i) {
					var str = d.label + ":  ";

                  // if a custom formatter has been defined, pass it the raw label string - it can do whatever it wants with it.
                  // we only apply truncation if it's not defined
        		  /*  if (settings.formatter) {
                        formatterContext.index = i;
                        formatterContext.part = 'mainLabel';
                        formatterContext.value = d.value;
                        formatterContext.label = str;
                        str = settings.formatter(formatterContext);
                      } else if (settings.truncation.enabled && d.label.length > settings.truncation.truncateLength) {
                        str = d.label.substring(0, settings.truncation.truncateLength) + "...";
                      }*/
                  return str;
				});
				//.call(labels.wrap, settings.mainLabel.maxLabelLength)
			textGroups.append("tspan")
			    .attr("id", function(d,i) { return "tsValue";})
				.style("font-weight", "normal")
				.style("font-family", pie.options.data.font)
				.style("font-size", settings.mainLabel.minFontSize + "px")
				.text(function(d,i) {
                    var val;
				    if (pie.options.data.display == "percentage") {
				        val = dataFormatter(d.value / pie.totalSize * 100);
				    } else {
				        val = dataFormatter(d.value);
				    }
				    if (pie.options.data.prefix) {
				        val = pie.options.data.prefix + val;
				    }
				    if (pie.options.data.suffix) {
				        val = val + pie.options.data.suffix;
				    }
				    return val;
				})
				.attr("y", 0)
				.attr("dy", 0);
				/*.attr("x", function() {
				    var tspans = d3.select(this.parentNode).selectAll("tspan")[0];
				    var tspanLast = tspans[tspans.length-2];
				    var tspanLastLength = tspanLast.getComputedTextLength();
				    if (tspanLastLength + this.getComputedTextLength() > settings.mainLabel.maxLabelLength) {
				        return 0;
				    } else {
				        return tspanLastLength + 5 + "px";
				    }
				})
				.attr("dy", function() {
				    var tspans = d3.select(this.parentNode).selectAll("tspan")[0];
				    var tspanLast = tspans[tspans.length-2];
				    var tspanLastLength = tspanLast.getComputedTextLength();
				    if (tspanLastLength + this.getComputedTextLength() > settings.mainLabel.maxLabelLength) {
				        return parseFloat(tspanLast.getAttribute("dy")) + 1.1 + "em";
				    } else {
				        return tspanLast.getAttribute("dy");
				    }
				});*/

		}

        var extraLabelGroup;
        // no group and labels.inner == TRUE
        if (!pie.options.groups.content && pie.options.labels.mainLabel.labelsInner && pie.options.data.sortOrder == "descending") {
            extraLabelGroup = pie.svg.append("g")
			    .attr("class", pie.cssPrefix + "labels-extra")
			    .selectAll("." + pie.cssPrefix + "labelGroup-extra")
    			.data(pie.options.data.content)
                .enter()
                .append("g")
                .attr("id", function(d, i) { return pie.cssPrefix + "labelGroup" + i + "-extra"; })
                .attr("data-index", function(d, i) { return i; })
                .attr("class", pie.cssPrefix + "labelGroup-extra")
                //.style("display", "none")
                .style("opacity", 0)
                .append("text")
				.attr("id", function(d, i) { return pie.cssPrefix + "segmentMainLabel" + i + "-extra"; })
				.attr("class", pie.cssPrefix + "segmentMainLabel-extra")
				.text(function(d, i) {
					return d.label + ":  ";
				})
				.attr("x", 0)
				.attr("y", 0)
				.attr("dy", ".35em")
				.style("font-size", settings.mainLabel.minFontSize + "px")
				.style("font-family", settings.mainLabel.font)
				.style("fill", settings.mainLabel.color)
				.style("font-weight", settings.mainLabel.fontWeight)
				.append("tspan")
				.style("font-weight", "normal")
				.style("font-family", pie.options.data.font)
				.style("font-size", settings.mainLabel.minFontSize + "px")
				.text(function(d,i) {
                    var val;
				    if (pie.options.data.display == "percentage") {
				        val = dataFormatter(d.value / pie.totalSize * 100);
				    } else {
				        val = dataFormatter(d.value);
				    }
				    if (pie.options.data.prefix) {
				        val = pie.options.data.prefix + val;
				    }
				    if (pie.options.data.suffix) {
				        val = val + pie.options.data.suffix;
				    }
				    return val;
				});
        }

        // add the group label
        if (pie.options.groups.content) {
            groupLabelGroup = pie.svg.append("g")
			    .attr("class", pie.cssPrefix + "labels-group")
			    .selectAll("." + pie.cssPrefix + "labelGroup-group")
			    .data(pie.options.groups.content)
			    .enter()
			    .append("g")
                .attr("id", function(d, i) { return pie.cssPrefix + "labelGroup" + i + "-group"; })
                .attr("data-index", function(d, i) { return i; })
                .attr("class", pie.cssPrefix + "labelGroup-group")
                .style("opacity", 1)
                .append("text")
				.attr("x", 0)
				.attr("y", 0)
                .attr("text-anchor", "middle")
				.style("font-size", pie.options.groups.minFontSize + "px")
				.style("font-family", pie.options.groups.font)
				.style("fill", pie.options.groups.fontColor)
				.style("font-weight", pie.options.groups.fontWeight)
				.attr("id", function(d, i) { return pie.cssPrefix + "segmentMainLabel" + i + "-group"; })
				.attr("class", pie.cssPrefix + "segmentMainLabel-group")
				.attr("dy", ".35em");

			groupLabelGroup.append("tspan")
				.attr("x", 0)
				.attr("y", 0)
			    .attr("dy", 0)
				.text(function(d) {
				    return d.label + ":  ";
				});

			groupLabelGroup.append("tspan")
			    .attr("dy", 0)
				.text(function(d, i) {
				    var val;
				    if (pie.options.data.display == "percentage") {
				        val = dataFormatter(d.value / pie.totalSize * 100);
				    } else {
				        val = dataFormatter(d.value);
				    }
				    if (pie.options.data.prefix) {
				        val = pie.options.data.prefix + val;
				    }
				    if (pie.options.data.suffix) {
				        val = val + pie.options.data.suffix;
				    }
					return val;
				});
        }
		// 2. Add the percentage label
		/*if (include.percentage) {
			labelGroup.append("text")
				.attr("id", function(d, i) { return pie.cssPrefix + "segmentPercentage" + i + "-" + section; })
				.attr("class", pie.cssPrefix + "segmentPercentage-" + section)
				.text(function(d, i) {
					var percentage = segments.getPercentage(pie, i, pie.options.labels.percentage.decimalPlaces);
                  if (settings.formatter) {
                    formatterContext.index = i;
                    formatterContext.part = "percentage";
                    formatterContext.value = d.value;
                    formatterContext.label = percentage;
                    percentage = settings.formatter(formatterContext);
                  } else {
                    percentage += "%";
                  }
                  return percentage;
				})
				.style("font-size", settings.percentage.fontSize + "px")
				.style("font-family", settings.percentage.font)
				.style("fill", settings.percentage.color);
		}

		// 3. Add the value label
		if (include.value) {
			labelGroup.append("text")
				.attr("id", function(d, i) { return pie.cssPrefix +  "segmentValue" + i + "-" + section; })
				.attr("class", pie.cssPrefix + "segmentValue-" + section)
				.text(function(d, i) {
                  formatterContext.index = i;
                  formatterContext.part = "value";
                  formatterContext.value = d.value;
                  formatterContext.label = d.value;
                  return settings.formatter ? settings.formatter(formatterContext, d.value) : d.value;
                })
				.style("font-size", settings.value.fontSize + "px")
				.style("font-family", settings.value.font)
				.style("fill", settings.value.color);
		}*/
	},

	/**
	 * This does the heavy-lifting to compute the actual coordinates for the outer label groups. It does two things:
	 * 1. Make a first pass and position them in the ideal positions, based on the pie sizes
	 * 2. Do some basic collision avoidance.
	 */
	computeOuterLabelCoords: function(pie) {
	    pie.options.labels.outer.quadCount = [0,0,0,0];
	    pie.options.labels.outer.quadHeight = [0,0,0,0];
		pie.svg.selectAll("." + pie.cssPrefix + "labelGroup-outer")
			.each(function(d, i) {
				return labels.getOuterLabelPara(pie, i);
			});

		// 1. figure out the ideal positions for the outer labels
		pie.svg.selectAll("." + pie.cssPrefix + "labelGroup-outer")
			.each(function(d, i) {
				return labels.getInitialOuterLabelPositions(pie, i);
			});
		//pie.svg.selectAll("." + pie.cssPrefix + "labelGroup-outer")
		//	.each(function(d, i) {
		//		return labels.getIdealOuterLabelPositions(pie, i);
		//	});
        //console.log(pie.outerLabelGroupData);
	},

	getOuterLabelPara: function(pie, i) {
        var labelGroupNode = d3.select("#" + pie.cssPrefix + "labelGroup" + i + "-outer").node();
        if (!labelGroupNode) {
          return;
        }
        var labelGroupDims = labelGroupNode.getBBox();
	    var angle = segments.getSegmentAngle(i, pie.options.data.content, pie.totalSize, { midpoint: true });
		var hemisphere, quadrant; // hemisphere

        if (angle < 90) {
			hemisphere = "left";
			quadrant = 4;
		} else if (90 <= angle && angle < 180) {
			hemisphere = "right";
			quadrant = 1;
		} else if (180 <= angle && angle <= 270) {
			hemisphere = "right";
			quadrant = 2;
		} else {
			hemisphere = "left";
			quadrant = 3;
		}
		pie.options.labels.outer.quadCount[quadrant-1] = pie.options.labels.outer.quadCount[quadrant-1] + 1;
		pie.options.labels.outer.quadHeight[quadrant-1] = pie.options.labels.outer.quadHeight[quadrant-1] + labelGroupDims.height;

	    pie.outerLabelGroupData[i] = {
		    i: i,
			w: labelGroupDims.width,
			h: labelGroupDims.height,
	        hs: hemisphere,
	        quadrant: quadrant,
	        arcFrac: pie.options.data.content[i].value/pie.totalSize,
	        segAngle: angle
	    };
	},

	getInitialOuterLabelPositions: function(pie, i) {
	    // Initialize the x y position of the labels, regardless of whether there is collision or not
	    var curr = pie.outerLabelGroupData[i];
	    var yangle = 0;
		var r = pie.outerRadius + pie.options.labels.outer.pieDistance;
		//var yscale = d3.scale.pow().exponent(0.5).domain([0, 45]).range([r * Math.sqrt(2), r]);

        var originalX, originalY, newCoords;

        if (curr.segAngle > 45 && curr.segAngle <= 90) {
	        yangle = curr.segAngle - 45;
	    } else if (curr.segAngle > 90 && curr.segAngle <= 135) {
	        yangle = 135 - curr.segAngle;
	    } else if (curr.segAngle > 225 && curr.segAngle <= 270) {
	        yangle = curr.segAngle - 225;
	    } else if (curr.segAngle > 270 && curr.segAngle <= 315) {
	        yangle = 315 - curr.segAngle;
	    }
	    // since the pie is centered initially, only have to compare each quadrant with half of the height
	    //if (pie.options.labels.outer.quadHeight[curr.quadrant-1] > pie.options.size.canvasHeight/2 && curr.arcFrac < 0.05) {
	        // place first elements of the 1st, 4th quadrant at the top of the plot
	        // place last elements of the 2nd, 3rd quadrant at the bottom of the plot
	    //} else {
	        // place each element at their designated angular position
	        if (curr.segAngle > 45 && curr.segAngle < 135 ||
	            curr.segAngle > 225 && curr.segAngle < 315) {
	            // angle with vertical axis less than 45 degrees
	            // distance between current element and center of pie changes with its angle
        		originalX = pie.pieCenter.x;
        		//originalY = pie.pieCenter.y - yscale(yangle);
        		originalY = pie.pieCenter.y - r/Math.cos(yangle/180*Math.PI);
        		newCoords = math.rotate(originalX, originalY, pie.pieCenter.x, pie.pieCenter.y, curr.segAngle - 90);

            } else {
        		originalX = pie.pieCenter.x;
        		originalY = pie.pieCenter.y - r;
        		newCoords = math.rotate(originalX, originalY, pie.pieCenter.x, pie.pieCenter.y, curr.segAngle - 90);
            }

            if (curr.hs === "left") {
        		newCoords.x -= (curr.w + pie.options.labels.mainLabel.horizontalPadding);
        	} else {
        		newCoords.x += pie.options.labels.mainLabel.horizontalPadding;
        	}
        	curr.x = newCoords.x;
        	curr.y = newCoords.y;
	    //}
	},

	/**
	 * @param i 0-N where N is the dataset size - 1.
	 */
	getIdealOuterLabelPositions: function(pie, i) {
        var labelGroupNode = d3.select("#" + pie.cssPrefix + "labelGroup" + i + "-outer").node();
        if (!labelGroupNode) {
          return;
        }
        var labelGroupDims = labelGroupNode.getBBox();
		var angle = pie.outerLabelGroupData[i].angle;

		var originalX = pie.pieCenter.x;
		var originalY = pie.pieCenter.y - (pie.outerRadius + pie.options.labels.outer.pieDistance);
		var newCoords = math.rotate(originalX, originalY, pie.pieCenter.x, pie.pieCenter.y, angle - 90);

		// if the label is on the left half of the pie, adjust the values
		var hemisphere = "right"; // hemisphere

        if (angle > 270 || angle < 90) {
			newCoords.x -= (labelGroupDims.width + pie.options.labels.mainLabel.horizontalPadding);
			hemisphere = "left";
		} else {
			newCoords.x += pie.options.labels.mainLabel.horizontalPadding;
		}
		/*if (angle > 180) {
			newCoords.x -= (labelGroupDims.width + 8);
			hemisphere = "left";
		} else {
			newCoords.x += 8;
		}*/

		pie.outerLabelGroupData[i] = {
		    i: i,
			x: newCoords.x,
			y: newCoords.y,
			w: labelGroupDims.width,
			h: labelGroupDims.height,
			hs: hemisphere
		};
	},

	getIdealInnerLabelPositions: function(pie, i) {
        var labelGroupNode = d3.select("#" + pie.cssPrefix + "labelGroup" + i + "-extra").node();
        if (!labelGroupNode) {
          return;
        }
        var labelGroupDims = labelGroupNode.getBBox();
		var angle = segments.getSegmentAngle(i, pie.options.data.content, pie.totalSize, { midpoint: true });

		var originalX = pie.pieCenter.x;
		var originalY = pie.pieCenter.y - (pie.innerRadius - pie.options.labels.inner.pieDistance);
		var newCoords = math.rotate(originalX, originalY, pie.pieCenter.x, pie.pieCenter.y, angle - 90);

		// if the label is on the left half of the pie, adjust the values
		var hemisphere = "left"; // hemisphere

        if (angle > 270 || angle < 90) {
			newCoords.x += pie.options.labels.mainLabel.horizontalPadding;
		} else {
			newCoords.x -= (labelGroupDims.width + pie.options.labels.mainLabel.horizontalPadding);
			hemisphere = "right";
		}
		/*if (angle > 180) {
			newCoords.x -= (labelGroupDims.width + 8);
			hemisphere = "left";
		} else {
			newCoords.x += 8;
		}*/

		pie.outerLabelGroupData[i].innerX = newCoords.x;
		pie.outerLabelGroupData[i].innerY = newCoords.y;
		pie.outerLabelGroupData[i].innerW = labelGroupDims.width;
		pie.outerLabelGroupData[i].innerH = labelGroupDims.height;
		pie.outerLabelGroupData[i].innerhs = hemisphere;
	},



	getGroupLabelPositions: function(pie, i) {
        var labelGroupNode = d3.select("#" + pie.cssPrefix + "labelGroup" + i + "-group").node();
        if (!labelGroupNode) {
          return;
        }
        var labelGroupDims = labelGroupNode.getBBox();

		var angle = segments.getSegmentAngle(i, pie.options.groups.content, pie.totalSize, { midpoint: true });

		var originalX = pie.pieCenter.x;
		var originalY = pie.pieCenter.y - pie.innerRadius*0.6;
		var newCoords = math.rotate(originalX, originalY, pie.pieCenter.x, pie.pieCenter.y, angle - 90);

		pie.groupLabelGroupData[i] = {
		    i: i,
			x: newCoords.x,
			y: newCoords.y,
			w: labelGroupDims.width,
			h: labelGroupDims.height
		};
	},



    wrap: function(text, width) {
        var lineNumbers = [];
        text.each(function() {
            var text = d3.select(this),
                words = text.text().split(/\s+/).reverse(),
                word,
                line = [],
                lineNumber = 0,
                lineHeight = 1.1, // ems
                y = text.attr("y"),
                dy = parseFloat(text.attr("dy")),
                tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
            while (word = words.pop()) {
                line.push(word);
                tspan.text(line.join(" "));
                if (tspan.node().getComputedTextLength() > width) {
                    line.pop();
                    tspan.text(line.join(" "));
                    line = [word];
                    tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
                }
            }
            lineNumbers.push(lineNumber + 1);
        });
        //maxXaxisLines = d3.max(lineNumbers);
    },

	/**
	 * @param section "inner" / "outer"

	positionLabelElements: function(pie, section, sectionDisplayType) {
		labels["dimensions-" + section] = [];

		// get the latest widths, heights
		var labelGroups = d3.selectAll("." + pie.cssPrefix + "labelGroup-" + section);
		labelGroups.each(function(d, i) {
			var mainLabel  = d3.select(this).selectAll("." + pie.cssPrefix + "segmentMainLabel-" + section);
			var percentage = d3.select(this).selectAll("." + pie.cssPrefix + "segmentPercentage-" + section);
			var value      = d3.select(this).selectAll("." + pie.cssPrefix + "segmentValue-" + section);

			labels["dimensions-" + section].push({
				mainLabel:  (mainLabel.node() !== null) ? mainLabel.node().getBBox() : null,
				percentage: (percentage.node() !== null) ? percentage.node().getBBox() : null,
				value:      (value.node() !== null) ? value.node().getBBox() : null
			});
		});

		var singleLinePad = 5;
		var dims = labels["dimensions-" + section];
		switch (sectionDisplayType) {
			case "label-value1":
				d3.selectAll("." + pie.cssPrefix + "segmentValue-" + section)
					.attr("dx", function(d, i) { return dims[i].mainLabel.width + singleLinePad; });
				break;
			case "label-value2":
				d3.selectAll("." + pie.cssPrefix + "segmentValue-" + section)
					.attr("dy", function(d, i) { return dims[i].mainLabel.height; });
				break;
			case "label-percentage1":
				d3.selectAll("." + pie.cssPrefix + "segmentPercentage-" + section)
					.attr("dx", function(d, i) { return dims[i].mainLabel.width + singleLinePad; });
				break;
			case "label-percentage2":
				d3.selectAll("." + pie.cssPrefix + "segmentPercentage-" + section)
					.attr("dx", function(d, i) { return (dims[i].mainLabel.width / 2) - (dims[i].percentage.width / 2); })
					.attr("dy", function(d, i) { return dims[i].mainLabel.height; });
				break;
	 	}
	},*/

	computeLabelLinePositions: function(pie) {
		pie.lineCoordGroups = [];
		d3.selectAll("." + pie.cssPrefix + "labelGroup-outer")
			.each(function(d, i) { return labels.computeLinePosition(pie, i); });

		if (!pie.options.groups.content && pie.options.labels.mainLabel.labelsInner && pie.options.data.sortOrder == "descending") {

    		pie.extraLineCoordGroups = [];
    		d3.selectAll("." + pie.cssPrefix + "labelGroup-extra")
    			.each(function(d, i) { return labels.computeExtraLinePosition(pie, i); });
		}
	},

	computeLinePosition: function(pie, i) {

	    var pieDistance = pie.options.labels.outer.pieDistance + pie.options.labels.outer.offsetSize/2;
		var angle = segments.getSegmentAngle(i, pie.options.data.content, pie.totalSize, { midpoint: true });
		var originCoords = math.rotate(pie.pieCenter.x - pie.outerRadius, pie.pieCenter.y, pie.pieCenter.x, pie.pieCenter.y, angle);
		var heightOffset = pie.outerLabelGroupData[i].fontSize / 5; // TODO check
		var labelXMargin = 6; // the x-distance of the label from the end of the line [TODO configurable]

		var quarter = Math.floor(angle / 90);
		var midPoint = 4;
		var x2, y2, x3, y3, x4, x5, y4, y5;
		var labelData = pie.outerLabelGroupData;

        if (labelData[i].x > pie.pieCenter.x) {
            if (labelData[i].y < pie.pieCenter.y) {
                quarter = 0;
            } else {
                quarter = 1;
            }
        } else {
            if (labelData[i].y > pie.pieCenter.y) {
                quarter = 2;
            } else {
                quarter = 3;
            }
        }

		/*angle = angle - 90;
		if (angle < 0) {
		    quarter = 3;
		} else if (angle < 90) {
		    quarter = 0;
		} else if (angle < 180) {
		    quarter = 1;
		} else {
		    quarter = 2;
		}*/

		switch (quarter) {
			case 0:
				x4 = originCoords.x + (pie.outerLabelGroupData[i].x - originCoords.x) * 0.5;
				y4 = originCoords.y + (pie.outerLabelGroupData[i].y - originCoords.y) * 0.5 - Math.abs(pie.outerLabelGroupData[i].y - originCoords.y) * 0.25;
				x3 = pie.outerLabelGroupData[i].x - labelXMargin;
				y3 = pie.outerLabelGroupData[i].y - heightOffset;
				if (x4 > x3) { x4 = x3; }
				break;
			case 1:
				x4 = originCoords.x + (pie.outerLabelGroupData[i].x - originCoords.x) * 0.5;
				y4 = originCoords.y + (pie.outerLabelGroupData[i].y - originCoords.y) * 0.5 + Math.abs(pie.outerLabelGroupData[i].y - originCoords.y) * 0.25;
				x3 = pie.outerLabelGroupData[i].x - labelXMargin;
				y3 = pie.outerLabelGroupData[i].y - heightOffset;
				if (x4 > x3) { x4 = x3; }
				break;
			case 2:
				var startOfLabelX = pie.outerLabelGroupData[i].x + pie.outerLabelGroupData[i].w + labelXMargin;
				x4 = originCoords.x + (startOfLabelX - originCoords.x) * 0.5;
				y4 = originCoords.y + (pie.outerLabelGroupData[i].y - originCoords.y) * 0.5 + Math.abs(pie.outerLabelGroupData[i].y - originCoords.y) * 0.25;
				x3 = pie.outerLabelGroupData[i].x + pie.outerLabelGroupData[i].w + labelXMargin;
				y3 = pie.outerLabelGroupData[i].y - heightOffset;
				if (x4 < x3) { x4 = x3; }
				break;
			case 3:
				var startOfLabelX = pie.outerLabelGroupData[i].x + pie.outerLabelGroupData[i].w + labelXMargin;
				x4 = originCoords.x + (startOfLabelX - originCoords.x) * 0.5;
				y4 = originCoords.y + (pie.outerLabelGroupData[i].y - originCoords.y) * 0.5 - Math.abs(pie.outerLabelGroupData[i].y - originCoords.y) * 0.25;
				x3 = pie.outerLabelGroupData[i].x + pie.outerLabelGroupData[i].w + labelXMargin;
				y3 = pie.outerLabelGroupData[i].y - heightOffset;
				if (x4 < x3) { x4 = x3; }
				break;
		}
		/*// this resolves an issue when the
		if (quarter === 2 && angle === 180) {
			quarter = 1;
		}

		}*/

		/*
		 * x1 / y1: the x/y coords of the start of the line, at the mid point of the segments arc on the pie circumference
		 * x2 / y2: if "curved" line style is being used, this is the midpoint of the line. Other
		 * x3 / y3: the end of the line; closest point to the label
		 */
		if (pie.options.labels.lines.style === "straight") {
			pie.lineCoordGroups[i] = [
				{ x: originCoords.x, y: originCoords.y },
				{ x: x3, y: y3 }
			];
		} else if (pie.options.labels.lines.style === "aligned") {
		    pie.lineCoordGroups[i] = [
				{ x: originCoords.x, y: originCoords.y },
				//{ x: x2, y: y2 },
				{ x: x4, y: y4 },
				//{ x: x5, y: y5 },
				{ x: x3, y: y3 }
			];
		} else {
			pie.lineCoordGroups[i] = [
				{ x: originCoords.x, y: originCoords.y },
				{ x: x2, y: y2 },
				{ x: x3, y: y3 }
			];
		}
	},


	computeExtraLinePosition: function(pie, i) {

		var angle = segments.getSegmentAngle(i, pie.options.data.content, pie.totalSize, { midpoint: true });
		var originCoords = math.rotate(pie.pieCenter.x - pie.innerRadius, pie.pieCenter.y, pie.pieCenter.x, pie.pieCenter.y, angle);
		var heightOffset = pie.outerLabelGroupData[i].fontSize / 5; // TODO check
		var labelXMargin = 3; // the x-distance of the label from the end of the line [TODO configurable]

		var quarter = Math.floor(angle / 90);
		var midPoint = 4;
		var x3, y3;

		var labelData = pie.outerLabelGroupData;

        if (labelData[i].innerhs === "right") {
            if (labelData[i].y < pie.pieCenter.y) {
                quarter = 0;
            } else {
                quarter = 1;
            }
        } else {
            if (labelData[i].y > pie.pieCenter.y) {
                quarter = 2;
            } else {
                quarter = 3;
            }
        }

		switch (quarter) {
			case 0:
			    var startOfLabelX = pie.outerLabelGroupData[i].innerX + pie.outerLabelGroupData[i].innerW + labelXMargin;
				x3 = pie.outerLabelGroupData[i].innerX + pie.outerLabelGroupData[i].innerW + labelXMargin;
				y3 = pie.outerLabelGroupData[i].innerY - heightOffset;
				break;
			case 1:
			    var startOfLabelX = pie.outerLabelGroupData[i].innerX + pie.outerLabelGroupData[i].innerW + labelXMargin;
				x3 = pie.outerLabelGroupData[i].innerX + pie.outerLabelGroupData[i].innerW + labelXMargin;
				y3 = pie.outerLabelGroupData[i].innerY - heightOffset;
				break;
			case 2:
				var startOfLabelX = pie.outerLabelGroupData[i].innerX - labelXMargin;
				x3 = pie.outerLabelGroupData[i].innerX - labelXMargin;
				y3 = pie.outerLabelGroupData[i].innerY - heightOffset;
				break;
			case 3:
				var startOfLabelX = pie.outerLabelGroupData[i].innerX - labelXMargin;
				x3 = pie.outerLabelGroupData[i].innerX - labelXMargin;
				y3 = pie.outerLabelGroupData[i].innerY - heightOffset;
				break;
		}

			pie.extraLineCoordGroups[i] = [
				{ x: originCoords.x, y: originCoords.y },
				{ x: x3, y: y3 }
			];
	},

	addLabelLines: function(pie) {
		var lineGroups = pie.svg.insert("g", "." + pie.cssPrefix + "pieChart") // meaning, BEFORE .pieChart
			.attr("class", pie.cssPrefix + "lineGroups")
			.style("opacity", 1);

		var lineGroup = lineGroups.selectAll("." + pie.cssPrefix + "lineGroup")
			.data(pie.lineCoordGroups)
			.enter()
			.append("g")
			.attr("class", pie.cssPrefix + "lineGroup");

		var lineFunction = d3.svg.line()
			.x(function(d) { return d.x; })
			.y(function(d) { return d.y; });

		if (pie.options.labels.lines.style === "aligned") {
			lineFunction.interpolate("basis");
		} else {
		    lineFunction.interpolate("basis");
		}

		lineGroup.append("path")
			.attr("d", lineFunction)
			.attr("stroke", function(d, i) {
			    return pie.options.data.content[i].color;
				//return (pie.options.labels.lines.color === "segment") ? pie.options.colors[i] : pie.options.labels.lines.color;
			})
			.attr("stroke-width", 1)
			.attr("fill", "none")
			.style("opacity", function(d, i) {
			    if (pie.outerLabelGroupData[i].hide === 1) {
			        return 0;
			    } else {
    				var percentage = pie.options.labels.outer.hideWhenLessThanPercentage;
    				var segmentPercentage = segments.getPercentage(pie, i, pie.options.labels.percentage.decimalPlaces);
    				var isHidden = (percentage !== null && segmentPercentage < percentage) || pie.options.data.content[i].label === "";
    				return isHidden ? 0 : 1;
			    }
			})
			.style("display", function(d,i) {
			    if (pie.outerLabelGroupData[i].hide === 1) {
			        return "none";
			    } else {
			        return "inline";
			    }
			});

		if (!pie.options.groups.content && pie.options.labels.mainLabel.labelsInner && pie.options.data.sortOrder == "descending") {
    		var extralineGroups = pie.svg.insert("g", "." + pie.cssPrefix + "pieChart") // meaning, BEFORE .pieChart
    			.attr("class", pie.cssPrefix + "extraLineGroups")
    			.style("opacity", 1);

    		var extralineGroup = lineGroups.selectAll("." + pie.cssPrefix + "extraLineGroup")
    			.data(pie.extraLineCoordGroups)
    			.enter()
    			.append("g")
    			.attr("class", pie.cssPrefix + "extraLineGroup");

    		extralineGroup.append("path")
    			.attr("d", lineFunction)
    			.attr("stroke", function(d, i) {
    			    return pie.options.data.content[i].color;
    				//return (pie.options.labels.lines.color === "segment") ? pie.options.colors[i] : pie.options.labels.lines.color;
    			})
    			.attr("stroke-width", 1)
    			.attr("fill", "none")
    			.style("opacity", function(d, i) {
    			    if (pie.outerLabelGroupData[i].hideMiddle === 1) {
    			        return 0;
    			    } else {
        				var percentage = pie.options.labels.outer.hideWhenLessThanPercentage;
        				var segmentPercentage = segments.getPercentage(pie, i, pie.options.labels.percentage.decimalPlaces);
        				var isHidden = (percentage !== null && segmentPercentage < percentage) || pie.options.data.content[i].label === "";
        				return isHidden ? 0 : 1;
    			    }
    			});

		}
	},

	calculateLabelGroupPosition: function(pie, section) {

        if (pie.options.labels[section].format === "none") {
          return;
        }
        var labelData = pie.outerLabelGroupData;
        /*var maxY = 0,
            minY = pie.svg.node().getBoundingClientRect().height;

        for (var i = 0; i < labelData.length; i++) {
            if (labelData[i].y > maxY) {
                maxY = labelData[i].y;
            }
            if (labelData[i].y < minY) {
                minY = labelData[i].y;
            }
        }*/
        var offsetSize = pie.options.labels.outer.offsetSize;
        var verticalSpace = (pie.options.size.canvasHeight - pie.outerRadius * 2 - pie.options.labels.outer.pieDistance * 2 - pie.options.labels.mainLabel.fontSize*3) / 2;

        //var xOffsetScale = d3.scale.pow().exponent(3).domain([0, pie.pieCenter.x]).range([offsetSize, 0]);
        //var yOffset1 = d3.scale.linear().domain([0, pie.pieCenter.y/2]).range([verticalSpace, 0]);

        var sortedYval = [];
        for (var i = 0; i < labelData.length; i++) {
            sortedYval.push(labelData[i].y);
        }
        labels.sortWithIndices(sortedYval);

        var sortedXval = [];
        for (var i = 0; i < labelData.length; i++) {
            sortedXval.push(labelData[i].x);
        }
        labels.sortWithIndices(sortedXval);
        var maxYDiff = Math.max(Math.abs(sortedYval[0] - pie.pieCenter.y), Math.abs(sortedYval[labelData.length-1] - pie.pieCenter.y));
		var maxXDiff = Math.max(Math.abs(sortedXval[0] - pie.pieCenter.x), Math.abs(sortedXval[labelData.length-1] - pie.pieCenter.x));

		var yOffsetScale = d3.scale.pow().exponent(5).domain([0, maxYDiff]).range([0, offsetSize*1.5]);
		var xOffsetScale = d3.scale.pow().exponent(3).domain([0, maxXDiff]).range([offsetSize, 0]);

        for (var i = 0; i < labelData.length; i++) {
            if (labelData[i].y > pie.pieCenter.y) {
                labelData[i].oy = yOffsetScale(labelData[i].y - pie.pieCenter.y);
            } else {
                labelData[i].oy = -yOffsetScale(pie.pieCenter.y - labelData[i].y);
            }

            if (labelData[i].x > pie.pieCenter.x) {
                labelData[i].ox = offsetSize/2;
            } else {
                labelData[i].ox = -offsetSize/2;
            }

            //labelData[i].x += labelData[i].ox;
            //labelData[i].y += labelData[i].oy;
        }


	},

	positionLabelGroups: function(pie, section) {
        var labelGroups = d3.selectAll("." + this.cssPrefix + "labels-outer");

        if (labelGroups.length > 1) {

        }

		d3.selectAll("." + pie.cssPrefix + "labelGroup-" + section)
			.style("opacity", 1)
			.attr("transform", function(d, i) {
				var x, y;
				if (section === "outer") {
    				x = pie.outerLabelGroupData[i].x;
    				y = pie.outerLabelGroupData[i].y;
				} else {
					var pieCenterCopy = extend(true, {}, pie.pieCenter);

					// now recompute the "center" based on the current _innerRadius
					if (pie.innerRadius > 0) {
						var angle = segments.getSegmentAngle(i, pie.options.data.content, pie.totalSize, { midpoint: true });
						//console.log(angle);
						var newCoords = math.translate9(pie.pieCenter.x, pie.pieCenter.y, pie.innerRadius, angle);
						//console.log(newCoords);
						pieCenterCopy.x = newCoords.x;
						pieCenterCopy.y = newCoords.y;
					}

					var dims = helpers.getDimensions(pie.cssPrefix + "labelGroup" + i + "-inner");
					var xOffset = dims.w / 2;
					var yOffset = dims.h / 4; // confusing! Why 4? should be 2, but it doesn't look right

					x = pieCenterCopy.x;
					y = pieCenterCopy.y;

					//x = pieCenterCopy.x + (pie.lineCoordGroups[i][0].x - pieCenterCopy.x) / 1.8;
					//y = pieCenterCopy.y + (pie.lineCoordGroups[i][0].y - pieCenterCopy.y) / 1.8;

					//x = x - xOffset;
					//y = y + yOffset;
			    }
			    return "translate(" + x + "," + y + ")";
		    });
	},

    // http://stackoverflow.com/questions/19792552/d3-put-arc-labels-in-a-pie-chart-if-there-is-enough-space/19801529#19801529
    ptInArc: function(pt, innerR, outerR, stAngle, edAngle) {
      // Center of the arc is assumed to be 0,0
      // (pt.x, pt.y) are assumed to be relative to the center

        var dist = pt.x * pt.x + pt.y * pt.y,
            angle = Math.atan2(-pt.y, -pt.x)/Math.PI*180; // Note: different coordinate system.

        // angle = angle;
        angle = (angle < 0) ? (angle + 360) : angle;
        //console.log("angle = " + angle + " st = " + stAngle + " ed = " + edAngle);

      return (innerR * innerR <= dist) && (dist <= outerR * outerR) &&
             (stAngle <= angle) && (angle <= edAngle);
    },

    ptInCircle: function(pt, r) {
        var dist = pt.x * pt.x + pt.y * pt.y;
        return dist <= r * r;
    },

    checkInnerLabelWithEdges: function(pie, node, i) {

        var bb = node.getBBox();
        var center = {},
            pts = [];
        var r = pie.innerRadius - 1;

        center.x = pie.outerLabelGroupData[i].innerX - pie.pieCenter.x;
        center.y = pie.outerLabelGroupData[i].innerY - pie.pieCenter.y;

        pts.push({ x : center.x + bb.x,     y : center.y + bb.y});       // top left point
        pts.push({ x : pts[0].x + bb.width, y : pts[0].y});              // top right point
        pts.push({ x : pts[0].x,            y : pts[0].y + bb.height});  // bottom left point
        pts.push({ x : pts[0].x + bb.width, y : pts[0].y + bb.height});  // bottom right point

        return labels.ptInCircle(pts[0], r) &&
                labels.ptInCircle(pts[1], r) &&
                labels.ptInCircle(pts[2], r) &&
                labels.ptInCircle(pts[3], r);
    },


    // puts the group labels
	positionGroupLabels: function(pie) {

	    var checkBounds = function(bb, stAngle, edAngle, i) {
            var center = {},
                pts = [];
            center.x = pie.groupLabelGroupData[i].x - pie.pieCenter.x;
            center.y = pie.groupLabelGroupData[i].y - pie.pieCenter.y;

            pts.push({ x : center.x + bb.x,     y : center.y + bb.y});       // top left point
            pts.push({ x : pts[0].x + bb.width, y : pts[0].y});              // top right point
            pts.push({ x : pts[0].x,            y : pts[0].y + bb.height});  // bottom left point
            pts.push({ x : pts[0].x + bb.width, y : pts[0].y + bb.height});  // bottom right point

            var r1 = 0;
            var r2 = pie.innerRadius;

            pie.groupLabelGroupData[i].hide = !(
                labels.ptInArc(pts[0], r1, r2, stAngle, edAngle) &&
                labels.ptInArc(pts[1], r1, r2, stAngle, edAngle) &&
                labels.ptInArc(pts[2], r1, r2, stAngle, edAngle) &&
                labels.ptInArc(pts[3], r1, r2, stAngle, edAngle));

	    };

		pie.svg.selectAll("." + pie.cssPrefix + "labelGroup-group")
			.each(function(d, i) {
				return labels.getGroupLabelPositions(pie, i);
			});

        var stAngle = 0;
        var groupSize = pie.options.groups.fontSize;
		d3.selectAll("." + pie.cssPrefix + "labelGroup-group")
			.attr("transform", function(d, i) {
				var x, y;
				x = pie.groupLabelGroupData[i].x;
				y = pie.groupLabelGroupData[i].y;
			    return "translate(" + x + "," + y + ")";
		    })
		    .each(function(d,i) {
		        var bb = this.getBBox();

		        pie.groupLabelGroupData[i].stAngle = stAngle;
		        pie.groupLabelGroupData[i].edAngle = stAngle + pie.groupArc.endAngle()(d)/Math.PI*180;
                pie.groupLabelGroupData[i].wrapped = false;
                checkBounds(bb, pie.groupLabelGroupData[i].stAngle, pie.groupLabelGroupData[i].edAngle, i);

                if (pie.groupLabelGroupData[i].hide) {

                    var thisText = d3.select("#" + pie.cssPrefix + "segmentMainLabel" + i + "-group");

                    thisText.selectAll("tspan")
                        .attr("x", 0)
                        .attr("dy", function(d,i) {
                            var tspans = d3.select(this.parentNode).selectAll("tspan")[0];
                            if (i == tspans.length - 1) {
                                var tspanLast = tspans[tspans.length-2];
                                return parseFloat(tspanLast.getAttribute("dy")) + 1.1 + "em";
                            } else {
                                return this.getAttribute("dy");
                            }
                        });

                    pie.groupLabelGroupData[i].wrapped = true;

    		        bb = this.getBBox();
    		        checkBounds(bb, pie.groupLabelGroupData[i].stAngle, pie.groupLabelGroupData[i].edAngle, i);
                }

                stAngle = pie.groupLabelGroupData[i].edAngle;
		    })
		    .style("display", function(d,i) {
		        return pie.groupLabelGroupData[i].hide ? "none" : "inline";
		    })
		    .each(function(d,i) {

		        var thisText = d3.select("#" + pie.cssPrefix + "segmentMainLabel" + i + "-group");
		        var currSize = parseFloat(thisText.style("font-size"));

		            while (currSize < groupSize && !pie.groupLabelGroupData[i].hide) {
		                currSize += 1;
		                thisText.style("font-size", currSize + "px");
		                var bb = this.getBBox();
                        checkBounds(bb, pie.groupLabelGroupData[i].stAngle, pie.groupLabelGroupData[i].edAngle, i);

		                if (pie.groupLabelGroupData[i].hide){

                            // if already wrapped, undo text size increase
		                    if (pie.groupLabelGroupData[i].wrapped) {
    		                    currSize -= 1;
        		                thisText.style("font-size", currSize + "px");
        		                bb = this.getBBox();
                                checkBounds(bb, pie.groupLabelGroupData[i].stAngle, pie.groupLabelGroupData[i].edAngle, i);
                                break;
		                    } else {
		                        // try wrapping
                                thisText.selectAll("tspan")
                                    .attr("x", 0)
                                    .attr("dy", function(d,i) {
                                        var tspans = d3.select(this.parentNode).selectAll("tspan")[0];
                                        if (i == tspans.length - 1) {
                                            var tspanLast = tspans[tspans.length-2];
                                            return parseFloat(tspanLast.getAttribute("dy")) + 1.1 + "em";
                                        } else {
                                            return this.getAttribute("dy");
                                        }
                                    });

                		        bb = this.getBBox();
                		        checkBounds(bb, pie.groupLabelGroupData[i].stAngle, pie.groupLabelGroupData[i].edAngle, i);

                                if (pie.groupLabelGroupData[i].hide){
        		                    currSize -= 1;
            		                thisText.style("font-size", currSize + "px");
                                    thisText.selectAll("tspan")[0][1].removeAttribute("x");
                                    thisText.selectAll("tspan")[0][1].removeAttribute("dy");
            		                bb = this.getBBox();
                                    checkBounds(bb, pie.groupLabelGroupData[i].stAngle, pie.groupLabelGroupData[i].edAngle, i);

                                }
                                break;
		                    }
		                }
		            }

		    })
		    .style("display", function(d,i) {
		        return pie.groupLabelGroupData[i].hide ? "none" : "inline";
		    });

		    //console.log(pie.groupLabelGroupData);
	},

	fadeInLabelsAndLines: function(pie) {

		// fade in the labels when the load effect is complete - or immediately if there's no load effect
		var loadSpeed = (pie.options.effects.load.effect === "default") ? pie.options.effects.load.speed : 1;
		setTimeout(function() {
			var labelFadeInTime = (pie.options.effects.load.effect === "default") ? 400 : 1; // 400 is hardcoded for the present

			d3.selectAll("." + pie.cssPrefix + "labelGroup-outer")
				.transition()
				.duration(labelFadeInTime)
				.style("opacity", function(d, i) {
					var percentage = pie.options.labels.outer.hideWhenLessThanPercentage;
					var segmentPercentage = segments.getPercentage(pie, i, pie.options.labels.percentage.decimalPlaces);
					return (percentage !== null && segmentPercentage < percentage) ? 0 : 1;
				});

			/*d3.selectAll("." + pie.cssPrefix + "labelGroup-inner")
				.transition()
				.duration(labelFadeInTime)
				.style("opacity", function(d, i) {
					var percentage = pie.options.labels.inner.hideWhenLessThanPercentage;
					var segmentPercentage = segments.getPercentage(pie, i, pie.options.labels.percentage.decimalPlaces);
					return (percentage !== null && segmentPercentage < percentage) ? 0 : 1;
				});*/

			d3.selectAll("g." + pie.cssPrefix + "lineGroups")
				.transition()
				.duration(labelFadeInTime)
				.style("opacity", 1);

			// once everything's done loading, trigger the onload callback if defined
			if (helpers.isFunction(pie.options.callbacks.onload)) {
				setTimeout(function() {
					try {
						pie.options.callbacks.onload();
					} catch (e) { }
				}, labelFadeInTime);
			}
		}, loadSpeed);
	},

	getIncludes: function(val) {
		var addMainLabel  = false;
		var addValue      = false;
		var addPercentage = false;

		switch (val) {
			case "label":
				addMainLabel = true;
				break;
			case "value":
				addValue = true;
				break;
			case "percentage":
				addPercentage = true;
				break;
			case "label-value1":
			case "label-value2":
				addMainLabel = true;
				addValue = true;
				break;
			case "label-percentage1":
			case "label-percentage2":
				addMainLabel = true;
				addPercentage = true;
				break;
		}
		return {
			mainLabel: addMainLabel,
			value: addValue,
			percentage: addPercentage
		};
	},


	/**
	 * This attempts to resolve label positioning collisions.
	 */
	resolveOuterLabelCollisions: function(pie) {
        if (pie.options.labels.outer.format === "none") {
          return;
        }

		var size = pie.options.data.content.length;
		labels.checkConflict(pie, 0, "clockwise", size);
		labels.checkConflict(pie, size-1, "anticlockwise", size);
	},

	resolveOuterLabelCollisionsNew: function(pie) {
        var objArray = pie.svg.selectAll("." + pie.cssPrefix + "labelGroup-outer")[0];
        var center = pie.pieCenter;
        var radius = pie.outerRadius + pie.options.labels.outer.pieDistance;

        labels.placeObj(pie, objArray, center);
	},

	/*rotate: function(x, y, xm, ym, a) {

        a = a * Math.PI / 180; // convert to radians

        var cos = Math.cos,
			sin = Math.sin,
		// subtract reference point, so that reference point is translated to origin and add it in the end again
		xr = (x - xm) * cos(a) - (y - ym) * sin(a) + xm,
		yr = (x - xm) * sin(a) + (y - ym) * cos(a) + ym;

		return { x: xr, y: yr };
	},*/

	getDist: function(ax, ay, bx, by) {
	    return Math.sqrt((ax-bx)*(ax-bx) + (ay-by)*(ay-by));
	},

    // calculate angle with respect to vertical axis
    // angles are clockwise
	getAngle: function (point, center) {
	    var angle,
	        startAngle;

        if (point.x === center.x) {
            if (point.y < center.y) {
                angle = 0;
            } else {
                angle = 180;
            }
        } else if (point.y === center.y) {
            if (point.x < center.x) {
                angle = 270;
            } else {
                angle = 90;
            }
        } else {


        }

        return angle;
    },

	rectIntersect: function(r1, r2) {
		var returnVal = (
			// r2.left > r1.right
			(r2.x > (r1.x + r1.w)) ||

			// r2.right < r1.left
			((r2.x + r2.w) < r1.x) ||

			// r2.bottom < r1.top
			((r2.y + r2.h) < r1.y) ||

			// r2.top > r1.bottom
			(r2.y > (r1.y + r1.h))
		);

		return !returnVal;
	},

	rectIntersectInner: function(r1, r2) {
		var returnVal = (
			// r2.left > r1.right
			(r2.innerX > (r1.innerX + r1.innerW)) ||

			// r2.right < r1.left
			((r2.innerX + r2.innerW) < r1.innerX) ||

			// r2.bottom < r1.top
			((r2.innerY + r2.innerH) < r1.innerY) ||

			// r2.top > r1.bottom
			(r2.innerY > (r1.innerY + r1.innerH))
		);

		return !returnVal;
	},

    // sort and return with indices
    sortWithIndices: function(toSort, mode) {
            for (var i = 0; i < toSort.length; i++) {
                toSort[i] = [toSort[i], i];
            }
            if (mode === 0) {
                toSort.sort(function(left, right) {
                    return left[0] < right[0] ? -1 : 1; // ascending sort
                });
            } else {
                toSort.sort(function(left, right) {
                    return left[0] < right[0] ? 1 : -1; // descending sort
                });
            }
            toSort.sortIndices = [];
            for (var j = 0; j < toSort.length; j++) {
                toSort.sortIndices.push(toSort[j][1]);
                toSort[j] = toSort[j][0];
            }
    },

    shiftNextLabel: function(curr, next) {

    },

    // @param objs, an array of DOM objects
    // @param center, {x,y}
    // @param radius, numeric
	placeObj: function(pie, objs, center) {

        var minFontSize = pie.options.labels.mainLabel.minFontSize;

        // starting font size is always small, later increased
        var labelData = pie.outerLabelGroupData;
        for (var i = 0; i < objs.length; i++) {
            labelData[i].label = pie.options.data.content[i].label;
            labelData[i].fontSize = pie.options.labels.mainLabel.minFontSize;
            labelData[i].valueSize = pie.options.labels.mainLabel.minFontSize;
            labelData[i].arcFrac = pie.options.data.content[i].value/pie.totalSize;
            labelData[i].arcLen = labelData[i].arcFrac * 2 * Math.PI * (pie.outerRadius + pie.options.labels.outer.pieDistance);
            labelData[i].collide = 0;
            labelData[i].Xchanged = 0;
            labelData[i].hide = 0;
            labelData[i].stop = 0;
            labelData[i].textLength = d3.select("#" + pie.cssPrefix + "segmentMainLabel" + i + "-outer").node().getComputedTextLength();
            //labelData[i].xlim = {max: labelData[i].x + pie.options.data.fontSize, min: labelData[i].x - pie.options.data.fontSize};
            labelData[i].ylim = {max: labelData[i].y + pie.options.data.fontSize*2, min: labelData[i].y - pie.options.data.fontSize*2};

            /*if (pie.options.groups.content) {
                labelData[i].group = pie.options.data.content[i].group;
                labelData[i].groupSize = pie.options.data.content[i].groupSize;
            }*/

            if (labelData[i].x > center.x) {
                labelData[i].anchorPt = {x: labelData[i].x, y: labelData[i].y};
            } else {
                labelData[i].anchorPt = {x: labelData[i].x + labelData[i].w, y: labelData[i].y};
            }
            labelData[i].r = labels.getDist(labelData[i].anchorPt.x, labelData[i].anchorPt.y, center.x, center.y)

        }

        var sortedValues = [];
        for (var i = 0; i < objs.length; i++) {
            sortedValues.push(pie.options.data.content[i].value);
        }
        labels.sortWithIndices(sortedValues);

        if (labelData[0].arcFrac < pie.options.data.minAngle) {
            // turn off
            labels.hideLabel(pie, labelData[0]);
        }

        if (objs.length <= 1) {
            return;
        }

        var curr, prev, next, currIdx;
        for (var i = 0; i < objs.length; i++) {

            curr = labelData[i];

            if (curr.arcFrac < pie.options.data.minAngle) {
                // turn off
                labels.hideLabel(pie, curr);
                continue;

            }

            if (i === objs.length-1) {
                next = labelData[0];
            } else {
                next = labelData[i+1];
            }

            // hide this label if the next is bigger than this, and if this is colliding with previous ones
            /*if (labels.rectIntersect(curr, next)) {
                if (next.arcFrac > curr.arcFrac) {
                    var flag = 0;
                    for (var j = i-1; j >= 0; j--) {
                        prev = labelData[j];
                        if (prev.hide === 0) {
                            if (labels.rectIntersect(curr, prev)) {
                                flag = 1;
                                break;
                            }
                        }
                    }
                    if (flag === 1) {
                        labels.hideLabel(pie, curr);
                    }
                }
            }*/
			var boundary = true;
            if (curr.hide === 0) {
                for (var j = i-1; j >= 0; j--) {
                    prev = labelData[j];
                    if (prev.hide === 0){
                    	var triggered = 0;
                    	// check position shift of the current element if
                    	// 1) it intersects with previously placed element
                    	// 2) it is crossed by previously placed element
                    	// 		- if angle smaller than threshold
                    	// 			- if it is the last element in the semi-sphere
                    	//			- if it is not the last in the semi-sphere
                    	// 		- if angle bigger than threshold
                    	// 3) it is the first elemtn in the semi-sphere
                    	if (labels.rectIntersect(curr, prev)) {
                    		triggered = 1;
                    	} else if (curr.hs === "left" && curr.y >= prev.y && curr.quadrant === prev.quadrant) {
							triggered = 2;
                    	} else if (curr.hs === "right" && curr.y <= prev.y && curr.hs === prev.hs) {
							triggered = 3;
                    	} else if (curr.hs != prev.hs && boundary) {
                    		// boundary makes sure it is the boundary
                        	for (var k = i+1; k < objs.length; k++) {
                        	    if (labelData[k].hide === 0 && curr.hide === 0 && labels.rectIntersect(curr, labelData[k])) {
                        	        curr.Xchanged = 1;
                        	        break;
                        	    }
                        	}
							triggered = 4;
                    	}
                    	boundary = false;

                    	/*if (curr.hs != prev.hs) {
                    		adj = true;
                    		curr.y = prev.y;
                    		curr.anchorPt.y = curr.y;
							curr.r = labels.getDist(curr.anchorPt.x, curr.anchorPt.y, pie.pieCenter.x, pie.pieCenter.y);
                    	}*/
                    	if (triggered === 0) {
                    		continue;
                    	}
                 		labels.adjustOuterLabelPosNew(pie, curr, prev, next, pie.pieCenter, triggered);

                        for (var k = i-1; k >= 0; k--) {
                            if (labelData[k].hide === 0 && curr.hide === 0 && labels.rectIntersect(curr, labelData[k])) {
                                if (curr.arcFrac < labelData[k].arcFrac) {
                                    labels.hideLabel(pie, curr);
                                } else {
                                    labels.hideLabel(pie, labelData[k]);
                                }
                                break;
                            }
                        }

                        if (curr.hide === 1) {
         	               break;
                        }
                    }
                }
            }

            if (curr.hide === 0 && curr.Xchanged === 0) {
                // check if this element needs wrapping
                if (curr.hs === "left") {
                    if (curr.x < 5) {
    				    var space = curr.x + curr.w - 5;
    					var selection = pie.svg.select("#" + pie.cssPrefix + "segmentMainLabel" + curr.i + "-outer");
    					labels.wrapSelectedLabel(selection, space);

            			var newDims = selection.node().getBBox();
            			curr.x = curr.x + curr.w - newDims.width;
            			curr.w = newDims.width;
            			curr.h = newDims.height;
                    }
                } else {
					if (curr.x + curr.w > pie.options.size.canvasWidth - 5) {
					    // wrap label
					    var space = pie.options.size.canvasWidth - curr.x - 5;
					    var selection = pie.svg.select("#" + pie.cssPrefix + "segmentMainLabel" + curr.i + "-outer");
					    labels.wrapSelectedLabel(selection, space);

        				var newDims = selection.node().getBBox();
        				curr.w = newDims.width;
        				curr.h = newDims.height;
					}
                }


                // check collision again only if it's on the right hand side
                if (curr.hs === "right") {
                    for (var j = i-1; j >= 0; j--) {
                        prev = labelData[j];
                        if (prev.hide === 0){
                        	var triggered = 0;
                        	// check position shift of the current element if
                        	// 1) it intersects with previously placed element
                        	// 2) it is crossed by previously placed element
                        	// 		- if angle smaller than threshold
                        	// 			- if it is the last element in the semi-sphere
                        	//			- if it is not the last in the semi-sphere
                        	// 		- if angle bigger than threshold
                        	// 3) it is the first elemtn in the semi-sphere
                        	if (labels.rectIntersect(curr, prev)) {
                        		triggered = 1;
                        	} else if (curr.hs === "left" && curr.y >= prev.y && curr.quadrant === prev.quadrant) {
    							triggered = 2;
                        	} else if (curr.hs === "right" && curr.y <= prev.y && curr.hs === prev.hs) {
    							triggered = 3;
                        	} else if (curr.hs != prev.hs && boundary) {
                        		// boundary makes sure it is the boundary
                        		for (var k = i+1; k < objs.length; k++) {
                        		    if (labelData[k].hide === 0 && curr.hide === 0 && labels.rectIntersect(curr, labelData[k])) {
                        		        curr.Xchanged = 1;
                        		        break;
                        		    }
                        		}
    							triggered = 4;
                        	}
                        	boundary = false;

                        	/*if (curr.hs != prev.hs) {
                        		adj = true;
                        		curr.y = prev.y;
                        		curr.anchorPt.y = curr.y;
    							curr.r = labels.getDist(curr.anchorPt.x, curr.anchorPt.y, pie.pieCenter.x, pie.pieCenter.y);
                        	}*/
                        	if (triggered === 0) {
                        		continue;
                        	}
                     		labels.adjustOuterLabelPosNew(pie, curr, prev, next, pie.pieCenter, triggered);

                            for (var k = i-1; k >= 0; k--) {
                                if (labelData[k].hide === 0 && curr.hide === 0 && labels.rectIntersect(curr, labelData[k])) {
                                    if (curr.arcFrac < labelData[k].arcFrac) {
                                        labels.hideLabel(pie, curr);
                                    } else {
                                        labels.hideLabel(pie, labelData[k]);
                                    }
                                    break;
                                }
                            }

                            if (curr.hide === 1) {
             	               break;
                            }
                        }
                    }
                }

            }

        }

        // for elements near the top/bottom of the pie, try a different approach

        /*var sortedYval = [];
        for (var i = 0; i < objs.length; i++) {
            sortedYval.push(labelData[i].y);
        }
        labels.sortWithIndices(sortedYval);

        for (var i = 0; i < objs.length; i++) {

            currIdx = sortedYval.sortIndices[i];
            curr = labelData[currIdx];

            if (curr.hide === 1) {
                // for the labels with the highest or lowest 10 y values
                if (i <= 10 || i >= objs.length - 10) {

                }
            }

        }*/

        var itr = minFontSize;
        var maxValueSize = pie.options.data.fontSize;
        var maxLabelSize = pie.options.labels.mainLabel.fontSize;
        var itrMaxLabelSize = maxLabelSize;
        var itrMaxValueSize = maxValueSize;
        var stoppedLabels = 0;
        while (itr < Math.max(maxLabelSize, maxValueSize) && stoppedLabels < objs.length) {
            itr++;
            stoppedLabels = 0;
            for (var i = 0; i < objs.length; i++) {
                currIdx = sortedValues.sortIndices[i];
                curr = labelData[currIdx];
                if (curr.hide === 0 && curr.Xchanged === 0) {
                    curr.fontSize = itr > maxLabelSize ? maxLabelSize : itr;
                    curr.valueSize = itr > maxValueSize ? maxValueSize : itr;   // TODO update this to the font setting

                    labels.updateLabelText(pie, curr); // update both font size and wrapping

                    for (var j = 0; j < objs.length; j++) {
                        next = labelData[j];
                        if (next.hide === 0 && j != currIdx) {
                            if (labels.rectIntersect(curr, next)) {
                            	var _currFontSize = curr.fontSize;
                                curr.fontSize -= _currFontSize >= curr.valueSize ? 1 : 0;
                                curr.valueSize -= curr.valueSize >= _currFontSize ? 1 : 0;
                                curr.Xchanged = 1;
                                labels.updateLabelText(pie, curr);
                                break;
                            }
                        }
                    }

                } else {
                    curr.Xchanged = 1;
                }
                stoppedLabels += curr.Xchanged;
            }
        }
        // increase font size
        /*
        var itr = minFontSize;
        var maxValueSize = pie.options.data.fontSize;
        var maxLabelSize = pie.options.labels.mainLabel.fontSize;
        var itrMaxLabelSize = maxLabelSize;
        var itrMaxValueSize = maxValueSize;
        var stoppedLabels = 0;
        while (itr < Math.max(maxLabelSize, maxValueSize) && stoppedLabels < objs.length) {

            itr++;
            stoppedLabels = 0;
            itrMaxLabelSize = maxLabelSize;
            itrMaxValueSize = maxValueSize;
            for (var i = 0; i < objs.length; i++) {
                currIdx = sortedValues.sortIndices[i];
                curr = labelData[currIdx];
                if (curr.hide === 0 && curr.stop === 0) {
                    curr.fontSize = itr > itrMaxLabelSize ? itrMaxLabelSize : itr;
                    curr.valueSize = itr > itrMaxValueSize ? itrMaxValueSize : itr;   // TODO update this to the font setting
                    labels.updateLabelText(pie, curr);

                    for (var j = currIdx+1; j < objs.length; j++) {
                        next = labelData[j];
                        if (next.hide === 0) {
                            if (labels.rectIntersect(curr, next)) {
                            	var _currFontSize = curr.fontSize;
                                curr.fontSize -= _currFontSize >= curr.valueSize ? 1 : 0;
                                curr.valueSize -= curr.valueSize >= _currFontSize ? 1 : 0;
                                curr.stop = 1;
                                labels.updateLabelText(pie, curr);
                            }
                        }
                    }

                    if (curr.stop === 0) {
                        for (var j = currIdx-1; j >= 0; j--) {
                            next = labelData[j];
                            if (next.hide === 0) {
                                if (labels.rectIntersect(curr, next)) {
									var _currFontSize = curr.fontSize;
									curr.fontSize -= _currFontSize >= curr.valueSize ? 1 : 0;
									curr.valueSize -= curr.valueSize >= _currFontSize ? 1 : 0;
                                    curr.stop = 1;
                                    labels.updateLabelText(pie, curr);
                                }
                            }
                        }
                    }
                } else {
                    curr.stop = 1;
                }
                stoppedLabels += curr.stop;
            }
        }*/

        // if some labels have exceeded viewer width, wrap them
        /*for (var i = 0; i < labelData.length; i++) {
            var text = d3.select("#" + pie.cssPrefix + "segmentMainLabel" + i + "-outer");
            if (labelData[i].hs === "left") {

            } else {
                if (labelData[i].x + text.node().getComputedTextLength() > pie.options.size.canvasWidth) {

                }
            }

        }*/

        // put stuff in the middle
        if (!pie.options.groups.content && pie.options.labels.mainLabel.labelsInner && pie.options.data.sortOrder == "descending") {


    		pie.svg.selectAll("." + pie.cssPrefix + "labelGroup-extra")
    			.each(function(d, i) {
    				return labels.getIdealInnerLabelPositions(pie, i);
    			})
                .attr("transform", function(d,i) {
                    return "translate(" + labelData[i].innerX + "," + labelData[i].innerY + ")";
                })
                .style("opacity", function(d,i) {
                    return labelData[i].hide === 0 ? 0 : 1;
                });


            for (var i = 0; i < objs.length; i++) {

                labelData[i].hideMiddle = labelData[i].hide === 0 ? 1 : 0;
                labelData[i].innerYlim = {max: labelData[i].innerY + pie.options.data.fontSize*2, min: labelData[i].innerY - pie.options.data.fontSize*2};
                if (labelData[i].innerhs === "left") {
                    labelData[i].innerAnchorPt = {x: labelData[i].innerX, y: labelData[i].innerY};
                } else {
                    labelData[i].innerAnchorPt = {x: labelData[i].innerX + labelData[i].innerW, y: labelData[i].innerY};
                }
                labelData[i].innerR = labels.getDist(labelData[i].innerAnchorPt.x, labelData[i].innerAnchorPt.y, pie.pieCenter.x, pie.pieCenter.y)

            }


            for (var i = 0; i < objs.length; i++) {
                currIdx = i;
                curr = labelData[currIdx];

                if (curr.hide === 0) {
                    labels.hideExtraLabel(pie, curr);
                    continue;
                }

                var currEl = d3.select("#" + pie.cssPrefix + "labelGroup" + curr.i + "-extra")[0][0];
                if (labels.checkInnerLabelWithEdges(pie, currEl, curr.i)) {
                    for (var j = currIdx-1; j >= 0; j--) {
                        prev = labelData[j];
                        if (prev.hideMiddle === 0) {
                            if (labels.rectIntersectInner(curr, prev)) {
                        		if (currIdx === objs.length-1) {
                        		    next = labelData[0];
                        		} else {
                        		    next = labelData[currIdx+1];
                        		}
                        		labels.adjustInnerLabelPosNew(pie, curr, prev, next, pie.pieCenter);

                        		if (labels.checkInnerLabelWithEdges(pie, currEl, curr.i)) {
                                    for (var k = currIdx-1; k >= 0; k--) {
                                        if (labelData[k].hideMiddle === 0 && curr.hideMiddle === 0 && labels.rectIntersectInner(curr, labelData[k])) {
                                            if (curr.arcFrac < labelData[k].arcFrac) {
                                                labels.hideExtraLabel(pie, curr);
                                            } else {
                                                labels.hideExtraLabel(pie, labelData[k]);
                                            }
                                            break;
                                        }
                                    }

                                    if (curr.hideMiddle === 1) {
                                        break;
                                    }
                        		} else {
                        		    labels.hideExtraLabel(pie, curr);
                        		}
                            }
                        }
                    }
                } else {
                    labels.hideExtraLabel(pie, curr);
                }
            }

            d3.selectAll("." + pie.cssPrefix + "labelGroup-extra")
                .attr("transform", function(d,i) {
                    return "translate(" + labelData[i].innerX + "," + labelData[i].innerY + ")";
                });
        }



        // TODO
/*        for (var i = 0; i < objs.length; i++) {
            currIdx = sortedValues.sortIndices[i];
            curr = labelData[currIdx];
            if (curr.arcFrac < pie.options.data.minAngle) {
                break;
            }

            if (curr.hide === 1 && curr.collide === 1) {
                labels.showLabel(pie, curr);

                if (curr.arcFrac >= pie.options.data.maxAngle) {



                } else {

                    //labels.showLabel(pie, curr);

                }
            }
        }*/

        d3.selectAll("." + pie.cssPrefix + "labelGroup-outer")
            .attr("transform", function(d,i) {
                return "translate(" + labelData[i].x + "," + labelData[i].y + ")";
            });

/*


        d3.selectAll("." + pie.cssPrefix + "segmentMainLabel-outer")
                    .style("display", function(d,i) {
                        if (labelData[i].hide === 1) {
                            return "none";
                        } else {
                            return "inline";
                        }
                    });

        // step 2: resolve collisions by translation
        var angDelta = 1;
        var nItr = 1;
        var curr, currIdx, currSel,currSelGroup,currSelNode, next, nextIdx,nextSel, nextSelGroup, nextSelNode, collisions;
        for (var i = 0; i < objs.length; i++) {
            currIdx = sortedValues.sortIndices[i];
            curr = labelData[currIdx];
            currSel = d3.select("#" + pie.cssPrefix + "segmentMainLabel" + currIdx + "-outer");
            currSelGroup = d3.select("#" + pie.cssPrefix + "labelGroup" + currIdx + "-outer");
            currSelNode = currSelGroup.node();

            if (curr.arcFrac < pie.options.data.maxAngle && curr.arcFrac >= pie.options.data.minAngle) {
                curr.hide = 0;
                curr.fontSize = minFontSize;
                updateTextDims(curr, currSel, currSelGroup, currSelNode, minFontSize);
            }

            // check if there is any collisions
            for (nextIdx = 0; nextIdx < objs.length; nextIdx++) {
                if (nextIdx != currIdx) {
                    next = labelData[nextIdx];
                    if (next.hide === 0 && labels.rectIntersect(curr, next)) {
                        curr.collide = 1;
                        break;
                    }
                }
            }

            nItr = 1;
            while (curr.collide == 1 && nItr < 10) {
                curr.collide = 0;
                for (var nextIdx = currIdx+1; nextIdx < objs.length; nextIdx++) {
                    next = labelData[nextIdx];
                    if (next.hide === 0 && labels.rectIntersect(curr, next)) {
                        curr.collide = 1;

                    }
                }

                for (var nextIdx = currIdx-1; nextIdx > -1; nextIdx--) {
                    next = labelData[nextIdx];
                    if (next.hide === 0 && labels.rectIntersect(curr, next)) {
                        curr.collide = 1;

                    }
                }
                nItr += 1;
            }
        }*/


        /*var collisions = 1,
            nItr = 1;

        labelData[0].collide = 0;
        // while (collisions > 0 && nItr < 10) {
            for (var i = 0; i < objs.length; i++) {
                currIdx = sortedValues.sortIndices[i];
                curr = labelData[currIdx];
                currSel = d3.select("#" + pie.cssPrefix + "segmentMainLabel" + currIdx + "-outer");
                currSelGroup = d3.select("#" + pie.cssPrefix + "labelGroup" + currIdx + "-outer");
                currSelNode = currSelGroup.node();
                if (curr.hide == 1) {
                    currSel.style("font-size", 0).style("display", "none");
                    continue;
                }
                curr.collide = 0;
                for (nextIdx = 0; nextIdx < objs.length; nextIdx++) {
                    if (nextIdx != currIdx) {
                        next = labelData[nextIdx];
                        if (labels.rectIntersect(curr, next)) {
                            curr.collide = 1;
                            if (curr.arcFrac >= next.arcFrac) {
                                next.fontSize = next.fontSize - 1;
                                nextSel = d3.select("#" + pie.cssPrefix + "segmentMainLabel" + nextIdx + "-outer");
                                nextSelGroup = d3.select("#" + pie.cssPrefix + "labelGroup" + nextIdx + "-outer");
                                nextSelNode = nextSelGroup.node();
                                updateTextDims(next, nextSel, nextSelGroup, nextSelNode, minFontSize);
                            } else {
                                curr.fontSize = curr.fontSize - 1;
                                updateTextDims(curr, currSel, currSelGroup, currSelNode, minFontSize);
                            }
                        } else if (curr.arcFrac >= next.arcFrac && curr.fontSize < next.fontSize) {
                            if (curr.hide != 1) {
                                next.fontSize = curr.fontSize;
                                nextSel = d3.select("#" + pie.cssPrefix + "segmentMainLabel" + nextIdx + "-outer");
                                nextSelGroup = d3.select("#" + pie.cssPrefix + "labelGroup" + nextIdx + "-outer");
                                nextSelNode = nextSelGroup.node();
                                updateTextDims(next, nextSel, nextSelGroup, nextSelNode, minFontSize);

                            }
                        }
                    }
                }
            }

            collisions = 0;
            for (var i = 0; i < objs.length; i++) {
                collisions = collisions + labelData[i].collide;
            }
            nItr++;
        }

        var angDelta = 1;
        // displace slices to maximize number of labels displayed
        // priority 1: large slices, must display
        for (var i = 0; i < objs.length; i++) {
            currIdx = sortedValues.sortIndices[i];
            curr = labelData[currIdx];
            var lastShownIdx = 0;
            if (curr.hide === 0) {
                lastShownIdx = currIdx;
            } else {
                if (curr.arcFrac >= pie.options.data.maxAngle) {
                    curr.hide = 0;
                    curr.fontSize = minFontSize;
                    currSel = d3.select("#" + pie.cssPrefix + "segmentMainLabel" + currIdx + "-outer");
                    currSelGroup = d3.select("#" + pie.cssPrefix + "labelGroup" + currIdx + "-outer");
                    currSelNode = currSelGroup.node();

                    currSel.style("display", "inline").style("font-size", minFontSize + "px");
                    wrapTspan(currSel);

                    nItr = 1;

                    while (curr.collide == 1 && nItr < 10) {

                        nItr += 1;
                    }


                }
            }

        }

        // priority 2: medium slices, try to fit
        for (var i = 0; i < objs.length; i++) {
            currIdx = sortedValues.sortIndices[i];
            curr = labelData[currIdx];
            if (curr.arcFrac >= pie.options.data.maxAngle) {
                // do something


            }
        }*/

        // turn off anything that has been set to hidden or still colliding
        /*d3.selectAll("." + pie.cssPrefix + "segmentMainLabel-outer")
            .style("display", function(d,i) {
                if (labelData[i].hide === 1 || labelData[i].collide === 1 || labelData[i].fontSize < minFontSize) {
                    labelData[i].hide = 1;
                    return "none";
                } else {
                    return "inline";
                }
            });*/
        //console.log(labelData);
        //console.log(nItr);
        //console.log(collisions);
	},

    /*wrapTspan: function(pie, sel, fontSize, maxSize) {
        sel.selectAll("tspan")
            .style("font-size", function(d,i) {
                var tspans = d3.select(this.parentNode).selectAll("tspan")[0];
                if (i == tspans.length - 1) {
                    if (fontSize <= maxSize) {
                        return fontSize + "px";
                    } else {
                        return maxSize + "px";
                    }
                } else {
                    return fontSize + "px";
                }
            })
            .attr("x", function(d,i) {
                var tspans = d3.select(this.parentNode).selectAll("tspan")[0];
                if (i == tspans.length - 1) {
                    var tspanLast = tspans[tspans.length-2];
                    var tspanLastLength = tspanLast.getComputedTextLength();
                    if (tspanLastLength + this.getComputedTextLength() > pie.options.labels.mainLabel.maxLabelLength) {
                        return 0
                    } else {
                        return tspanLastLength + 5 + "px";
                    }
                } else {
                    return 0;
                }
            })
            .attr("dy", function(d,i) {
                var tspans = d3.select(this.parentNode).selectAll("tspan")[0];
                if (i == tspans.length - 1) {
                    var tspanLast = tspans[tspans.length-2];
                    var tspanLastLength = tspanLast.getComputedTextLength();
                    if (tspanLastLength + this.getComputedTextLength() > pie.options.labels.mainLabel.maxLabelLength) {
                        return parseFloat(tspanLast.getAttribute("dy")) + 1.1 + "em";
                    } else {
                        return tspanLast.getAttribute("dy");
                    }
                } else {
                    return this.getAttribute("dy");
                }
            });
        },*/

    unwrapSelectedLabel: function(pie, text) {
            // combine all tspans except the last to one tspan
        text.selectAll("tspan").remove();
		text.append("tspan")
			.attr("x", 0)
			.attr("y", 0)
			.attr("dy", 0)
            .style("font-size", pie.options.labels.mainLabel.minFontSize + "px")
			.style("font-family", pie.options.labels.mainLabel.font)
			.style("font-weight", pie.options.labels.mainLabel.fontWeight)
			.text(function(d, i) {
				var str = d.label + ":  ";
              return str;
			});
			//.call(labels.wrap, settings.mainLabel.maxLabelLength)
		text.append("tspan")
		    .attr("id", function(d,i) { return "tsValue";})
			.style("font-weight", "normal")
			.style("font-family", pie.options.data.font)
			.style("font-size", pie.options.labels.mainLabel.minFontSize + "px")
			.text(function(d,i) {
                var val;
			    if (pie.options.data.display == "percentage") {
			        val = dataFormatter(d.value / pie.totalSize * 100);
			    } else {
			        val = dataFormatter(d.value);
			    }
			    if (pie.options.data.prefix) {
			        val = pie.options.data.prefix + val;
			    }
			    if (pie.options.data.suffix) {
			        val = val + pie.options.data.suffix;
			    }
			    return val;
			})
			.attr("y", 0)
			.attr("dy", 0);

            /*var _label = "";
            var _value;
            for (var i = 0;i < count - 1; i++) {
                if (i === 0) {
                    _label = d3.select(text.selectAll("tspan")[0][i]).text();
                } else {
                    _label = _label + " " + d3.select(text.selectAll("tspan")[0][i]).text();
                }
            }
            _value = d3.select(text.selectAll("tspan")[0][count - 1]).text();*/

    },

	updateLabelText: function(pie, curr) {

        var textEl = d3.select("#" + pie.cssPrefix + "segmentMainLabel" + curr.i + "-outer"); // text element
        //var nodeSel = d3.select("#" + pie.cssPrefix + "labelGroup" + curr.i + "-outer");
        //var node = nodeSel.node();

        var space;
        if (curr.hs === "left") {
    		space = curr.x + curr.w - 5;
        } else {
			space = pie.options.size.canvasWidth - curr.x - 5;
        }

        labels.unwrapSelectedLabel(pie, textEl);

        textEl.select("tspan").style("font-size", curr.fontSize);
        textEl.select("#tsValue").style("font-size", curr.valueSize);

	    labels.wrapSelectedLabel(textEl, space);
        var nodeDim = textEl.node().getBBox();
        var originalW = curr.w;
        curr.w = nodeDim.width;
        curr.h = nodeDim.height;
        if (curr.hs === "left") {
            curr.x = curr.x + originalW - curr.w;
        }

        pie.svg.select("#" + pie.cssPrefix + "labelGroup" + curr.i + "-outer")
        .attr("transform", function(d) {
            return "translate(" + curr.x + "," + curr.y + ")";
        });
	},

	checkConflict: function(pie, currIndex, direction, size) {
    var i, curr;

		if (size <= 1) {
			return;
		}

		var currIndexHemisphere = pie.outerLabelGroupData[currIndex].hs;
		if (direction === "clockwise" && currIndexHemisphere !== "right") {
			return;
		}
		if (direction === "anticlockwise" && currIndexHemisphere !== "left") {
			return;
		}
		var nextIndex = (direction === "clockwise") ? currIndex+1 : currIndex-1;

		// this is the current label group being looked at. We KNOW it's positioned properly (the first item
		// is always correct)
		var currLabelGroup = pie.outerLabelGroupData[currIndex];

		// this one we don't know about. That's the one we're going to look at and move if necessary
		var examinedLabelGroup = pie.outerLabelGroupData[nextIndex];

		var info = {
			labelHeights: pie.outerLabelGroupData[0].h,
			center: pie.pieCenter,
			lineLength: (pie.outerRadius + pie.options.labels.outer.pieDistance),
			heightChange: pie.outerLabelGroupData[0].h + 1 // 1 = padding
		};

		// loop through *ALL* label groups examined so far to check for conflicts. This is because when they're
		// very tightly fitted, a later label group may still appear high up on the page
		if (direction === "clockwise") {
            i = 0;
			for (; i<=currIndex; i++) {
				curr = pie.outerLabelGroupData[i];

				// if there's a conflict with this label group, shift the label to be AFTER the last known
				// one that's been properly placed
				if (helpers.rectIntersect(curr, examinedLabelGroup)) {
					labels.adjustLabelPos(pie, nextIndex, currLabelGroup, info);
					break;
				}
			}
		} else {
            i = size - 1;
			for (; i >= currIndex; i--) {
				curr = pie.outerLabelGroupData[i];

				// if there's a conflict with this label group, shift the label to be AFTER the last known
				// one that's been properly placed
				if (helpers.rectIntersect(curr, examinedLabelGroup)) {
					labels.adjustLabelPos(pie, nextIndex, currLabelGroup, info);
					break;
				}
			}
		}
		labels.checkConflict(pie, nextIndex, direction, size);
	},

	showLabel: function(pie, curr) {
	    curr.collide = 1;
	    curr.hide = 0;

        d3.select("#" + pie.cssPrefix + "segmentMainLabel" + curr.i + "-outer")
            .style("display", "inline");
	},

	hideLabel: function(pie, curr) {
	    curr.collide = 1;
	    curr.hide = 1;

        d3.select("#" + pie.cssPrefix + "segmentMainLabel" + curr.i + "-outer")
            .style("display", "none");
	},

	hideExtraLabel: function(pie, curr) {
	    curr.hideMiddle = 1;

        d3.select("#" + pie.cssPrefix + "segmentMainLabel" + curr.i + "-extra")
            .style("display", "none");
	},

	wrapSelectedLabel: function(selection, space) {

		selection.select("tspan").call(labels.wrap, space);

        // wrapping value
        selection.select("#tsValue")
        .attr("x", function() {
            var tspans = d3.select(this.parentNode).selectAll("tspan")[0];
            var tspanLast = tspans[tspans.length-2];
            var tspanLastLength = tspanLast.getComputedTextLength();
            if (tspanLastLength + this.getComputedTextLength() > space) {
                return 0;
            } else {
                return tspanLastLength + 5 + "px";
            }
        })
        .attr("dy", function() {
            var tspans = d3.select(this.parentNode).selectAll("tspan")[0];
            var tspanLast = tspans[tspans.length-2];
            var tspanLastLength = tspanLast.getComputedTextLength();
            if (tspanLastLength + this.getComputedTextLength() > space) {
                return parseFloat(tspanLast.getAttribute("dy")) + 1.1 + "em";
            } else {
                return tspanLast.getAttribute("dy");
            }
        });

	},

	// does a little math to shift a label into a new position based on the last properly placed one
	adjustOuterLabelPosNew: function(pie, colliding, correct, next, center, triggered) {
		var labelData = pie.outerLabelGroupData;
		var last = labelData[correct.i - 1];
		var xDiff, yDiff, newXPos, newYPos, newXAnchor, heightChange, pieDist;
        heightChange = colliding.h + 1;
        pieDist = pie.options.labels.outer.pieDistance;
        var angThres = 45;
    	var angle = Math.acos(Math.abs(center.y - colliding.y)/Math.abs(colliding.r))*180/Math.PI;

    	//console.log("correct.y = " + correct.y + "angle = " + angle + "label = " + colliding.label);

		var compareAndHide = function (pie, colliding, correct) {
			if (colliding.arcFrac > correct.arcFrac) {
				labels.hideLabel(pie, correct);
			} else {
				labels.hideLabel(pie, colliding);
			}
		};

		if (triggered <= 3) {

			if (angle <= angThres) {
				// small angle elements

				if (pie.options.data.sortOrder === "descending") {
				    // when order is descending, the 4th quadrant are the first elements and contain largest slices
				    // always display these slices
    				if (colliding.quadrant === 4) {
    				    newYPos = correct.y - heightChange;
    				    /*if (center.x < correct.x) {

    				    } else {
                            labels.hideLabel(pie, colliding);
        					return;
    				    }*/
    				} else if (colliding.quadrant === 2) {
    				    newYPos = correct.y + heightChange;
    				    if (newYPos > pie.options.size.canvasWidth - 20) {
                            labels.hideLabel(pie, colliding);
        					return;
    				    }
    				} else {
        				if (colliding.hs != next.hs) {
        					// last element in the hemisphere
        					if (colliding.hs === "left") {
        						newYPos = correct.y - heightChange;
        					} else {
        						newYPos = correct.y + heightChange;
        					}
        				} else {
        					// not the last element
        					if (correct.y < heightChange ||
        						correct.y > pie.options.size.canvasHeight - 2 * heightChange) {
        						labels.hideLabel(pie, colliding);
        						return;
        					} else {
        						// enough vertical space
        						if (triggered === 1) {
        							if (colliding.hs === "left") {
        								if (correct.y - heightChange >= colliding.ylim.min) {
        									newYPos = correct.y - heightChange;
        								} else {
        									compareAndHide(pie, colliding, correct);
        									return;
        								}
        							} else {
        								if (correct.y + heightChange <= colliding.ylim.max) {
        									newYPos = correct.y + heightChange;
        								} else {
        									compareAndHide(pie, colliding, correct);
        									return;
        								}
        							}
        						} else if (triggered === 2) {
        							compareAndHide(pie, colliding, correct);
        							return;
        						} else {
        							compareAndHide(pie, colliding, correct);
        							return;
        						}
        					}
        				}
    				}
				} else {
    				if (colliding.hs != next.hs) {
    					// last element in the hemisphere
    					if (colliding.hs === "left") {
    						newYPos = correct.y - heightChange;
    					} else {
    						newYPos = correct.y + heightChange;
    					}
    				} else {
    					// not the last element
    					if (correct.y < heightChange ||
    						correct.y > pie.options.size.canvasHeight - 2 * heightChange) {
    						labels.hideLabel(pie, colliding);
    						return;
    					} else {
    						// enough vertical space
    						if (triggered === 1) {
    							if (colliding.hs === "left") {
    								if (correct.y - heightChange >= colliding.ylim.min) {
    									newYPos = correct.y - heightChange;
    								} else {
    									compareAndHide(pie, colliding, correct);
    									return;
    								}
    							} else {
    								if (correct.y + heightChange <= colliding.ylim.max) {
    									newYPos = correct.y + heightChange;
    								} else {
    									compareAndHide(pie, colliding, correct);
    									return;
    								}
    							}
    						} else if (triggered === 2) {
    							compareAndHide(pie, colliding, correct);
    							return;
    						} else {
    							compareAndHide(pie, colliding, correct);
    							return;
    						}
    					}
    				}
				}
			} else {
				// large angle elements
				if (triggered === 1) {
					if (colliding.hs === "left") {
						if (correct.y - heightChange >= colliding.ylim.min) {
							newYPos = correct.y - heightChange;
						} else {
							compareAndHide(pie, colliding, correct);
							return;
						}
					} else {
						if (correct.y + heightChange <= colliding.ylim.max) {
							newYPos = correct.y + heightChange;
						} else {
							compareAndHide(pie, colliding, correct);
							return;
						}
					}
				} else if (triggered === 2) {
					// always at the left hemisphere
					// when large angle, just hide
					compareAndHide(pie, colliding, correct);
					return;
				} else {
					// always at the right hemisphere
					// when large angle, just hide
					compareAndHide(pie, colliding, correct);
					return;
				}
			}

		} else if (triggered === 4){
			// first element in the hemisphere
			// implies it collides with the next element
			newYPos = colliding.y;
			/*if (pie.options.data.sortOrder === "descending") {

			} else {
			    newYPos = colliding.y;
			}*/

		}

		/*if (colliding.hs === "left") {

		    if (colliding.y >= correct.y && angle > angThres) {
                if (colliding.arcFrac > correct.arcFrac) {
                    labels.hideLabel(pie, correct);
                } else {
                    labels.hideLabel(pie, colliding);
                }
		        return;
		    } else {
				if (angle <= angThres) {
					// if this element is the last elemnt in the quadrant or
					// has not reached its maximum height, shift it
					if (colliding.quadrant != next.quadrant ||
					correct.y - heightChange >= colliding.ylim.min) {
						if (colliding.hs != correct.hs) {
							newYPos = colliding.y;
						} else {
							newYPos = correct.y - heightChange;
						}

					} else {
						labels.hideLabel(pie, colliding);
						return;
					}

				}
    		    else {
					if (correct.y - heightChange >= colliding.ylim.min) {
						newYPos = correct.y - heightChange;
					} else {
						labels.hideLabel(pie, colliding);
						return;
					}
    		    }
		    }

		} else {

    		if (colliding.y <= correct.y && angle > angThres) {
                if (colliding.arcFrac > correct.arcFrac) {
                    labels.hideLabel(pie, correct);
                } else {
                    labels.hideLabel(pie, colliding);
                }
    		    return;
    		} else {
    		    if (angle <= angThres) {
    		    	if (colliding.quadrant != next.quadrant ||
    		    	 correct.y + heightChange <= colliding.ylim.max) {
						if (colliding.hs != correct.hs) {
							newYPos = colliding.y;
						} else {
							newYPos = correct.y + heightChange;
						}
    		    	} else {
						labels.hideLabel(pie, colliding);
						return;
    		    	}

				}
    		    else {
					if (correct.y + heightChange <= colliding.ylim.max) {
						newYPos = correct.y + heightChange;
					} else {
						labels.hideLabel(pie, colliding);
						return;
					}
    		    }

    		}
		}*/

        if (Math.abs(newYPos - center.y) > (pie.outerRadius + pie.options.labels.outer.pieDistance) * 1.5) {
            labels.hideLabel(pie, colliding);
			return;
        }
		yDiff = center.y - newYPos;



        // rotate colliding element with radius equal to its computed radius
        if (triggered != 4) {
            colliding.Xchanged = 1;
			if (Math.abs(colliding.r) > Math.abs(yDiff) && (angle > angThres)) {
				xDiff = Math.sqrt((colliding.r * colliding.r) - (yDiff * yDiff));
				//console.log(xDiff);

				//xDiff = Math.max(xDiff, pie.outerRadius * 0.2);

				//var padding = pie.options.labels.mainLabel.horizontalPadding;
				// possibly need to do some more shifting
				if (correct.hs === "right") {
					newXPos = center.x + xDiff;
					if (newXPos + colliding.w > pie.options.size.canvasWidth - 5) {
					    // wrap label
					    var space = pie.options.size.canvasWidth - newXPos - 5;
					    var selection = pie.svg.select("#" + pie.cssPrefix + "segmentMainLabel" + colliding.i + "-outer");
					    labels.wrapSelectedLabel(selection, space);

        				var newDims = selection.node().getBBox();
        				colliding.w = newDims.width;
        				colliding.h = newDims.height;
					}// else if (newXPos < center.x) {
					//	labels.hideLabel(pie, colliding);
					//	return;
					//}
				} else {
					newXPos = center.x - xDiff - colliding.w;

					if (newXPos < 5) {
					    var space = center.x - xDiff - 5;
					    var selection = pie.svg.select("#" + pie.cssPrefix + "segmentMainLabel" + colliding.i + "-outer");
					    labels.wrapSelectedLabel(selection, space);

        				var newDims = selection.node().getBBox();
        				colliding.w = newDims.width;
        				colliding.h = newDims.height;

        				heightChange = colliding.h + 1;
        				newYPos = correct.y - heightChange;
        				xDiff = Math.sqrt((colliding.r * colliding.r) - (yDiff * yDiff));
        				newXPos = center.x - xDiff - colliding.w;
					}// else if (newXPos + colliding.w > center.x) {
					//	labels.hideLabel(pie, colliding);
					//	return;
					//}
				}

				/*if (next.quadrant === colliding.quadrant) {
					if (colliding.quadrant === 1) {
						if (next.anchorPt.x < newXAnchor) {newXPos = next.anchorPt.x;}
					} else if (colliding.quadrant === 2) {
						if (next.anchorPt.x > newXAnchor) {newXPos = next.anchorPt.x;}
					} else if (colliding.quadrant === 3) {
						if (next.anchorPt.x > newXAnchor) {newXPos = next.anchorPt.x - colliding.w;}
					} else if (colliding.quadrant === 4){
						if (next.anchorPt.x < newXAnchor) {newXPos = next.anchorPt.x - colliding.w;}
					}
				}*/

				colliding.x = newXPos;

			} else {
				//angle = Math.acos(Math.abs(colliding.r) / Math.abs(yDiff))*180/Math.PI;
				/*if (correct.i != 0) {
					if (last.hs === correct.hs) {
						xDiff = Math.abs(last.x - correct.x);
					} else {
						xDiff = 5;
					}
				} else {
					xDiff = 5;
				}*/

				if (correct.hs === "left") {

				    if (newYPos <= center.y) {
						//newXPos = correct.x + correct.w - colliding.w
						//		+ pieDist * 1.1 * Math.cos(angle/180*Math.PI);
						newXPos = correct.x + correct.w - colliding.w + Math.abs(newYPos - correct.y);
				    } else {
						//newXPos = correct.x + correct.w - colliding.w
						//		- pieDist * 1.1 * Math.cos(angle/180*Math.PI);
						newXPos = correct.x + correct.w - colliding.w - Math.abs(newYPos - correct.y);
				    }

					if (newXPos < 5) {
					    var space = newXPos + colliding.w - 5;
					    var selection = pie.svg.select("#" + pie.cssPrefix + "segmentMainLabel" + colliding.i + "-outer");
					    labels.wrapSelectedLabel(selection, space);

        				var newDims = selection.node().getBBox();
        				colliding.w = newDims.width;
        				colliding.h = newDims.height;

        				heightChange = colliding.h + 1;
        				newYPos = correct.y - heightChange;
    				    if (newYPos <= center.y) {
    						//newXPos = correct.x + correct.w - colliding.w
    						//		+ pieDist * 1.1 * Math.cos(angle/180*Math.PI);
    						newXPos = correct.x + correct.w - colliding.w + Math.abs(newYPos - correct.y);
    				    } else {
    						//newXPos = correct.x + correct.w - colliding.w
    						//		- pieDist * 1.1 * Math.cos(angle/180*Math.PI);
    						newXPos = correct.x + correct.w - colliding.w - Math.abs(newYPos - correct.y);
    				    }
					}// else if (newXPos + colliding.w > center.x) {
					//	labels.hideLabel(pie, colliding);
					//	return;
					//}

				} else {

				    if (newYPos <= center.y) {
				        //newXPos = correct.x + pieDist * 1.1 * Math.cos(angle/180*Math.PI);
				        newXPos = correct.x + Math.abs(newYPos - correct.y);
				    } else {
				        //newXPos = correct.x - pieDist * 1.1 * Math.cos(angle/180*Math.PI);
				        newXPos = correct.x - Math.abs(newYPos - correct.y);
				    }

					if (newXPos + colliding.w > pie.options.size.canvasWidth - 5) {
					    // wrap label
					    var space = pie.options.size.canvasWidth - newXPos - 5;
					    var selection = pie.svg.select("#" + pie.cssPrefix + "segmentMainLabel" + colliding.i + "-outer");
					    labels.wrapSelectedLabel(selection, space);

        				var newDims = selection.node().getBBox();
        				colliding.w = newDims.width;
        				colliding.h = newDims.height;
					}// else if (newXPos < center.x) {
					//	labels.hideLabel(pie, colliding);
					//	return;
					//}

				}
				colliding.x = newXPos;

			}
        } else {

        }


    	/*if (correct.hs === "right") {
    		newXPos = center.x + xDiff;
    	} else {
    		newXPos = center.x - xDiff - colliding.w;
    	}
    	colliding.x = newXPos;*/
		colliding.y = newYPos;

		if (colliding.x <= center.x) {
			colliding.hs = "left";
		} else {
			colliding.hs = "right";
		}

		if (colliding.hs === "right") {
		    colliding.anchorPt.x = colliding.x;
		} else {
		    colliding.anchorPt.x = colliding.x + colliding.w;
		}
		colliding.anchorPt.y = colliding.y;
		colliding.r = labels.getDist(colliding.anchorPt.x, colliding.anchorPt.y, center.x, center.y)


	},

	adjustInnerLabelPosNew: function(pie, colliding, correct, next, center) {
		var xDiff, yDiff, newXPos, newYPos, newXAnchor, heightChange;
        heightChange = correct.innerH + 1;
		if (colliding.innerhs === "left") {

		    if (colliding.innerY >= correct.innerY) {
                if (colliding.arcFrac > correct.arcFrac) {
                    labels.hideExtraLabel(pie, correct);
                } else {
                    labels.hideExtraLabel(pie, colliding);
                }
		        return;
		    } else {
    		    if (correct.innerY - heightChange >= colliding.innerYlim.min) {
    		        newYPos = correct.innerY - heightChange;
    		    } else {
    		        newYPos = colliding.innerYlim.min;
    		    }
		    }

		} else {

    		if (colliding.innerY >= correct.innerY) {
    		    if (correct.innerY + heightChange <= colliding.innerYlim.max) {
    		        newYPos = correct.innerY + heightChange;
    		    } else {
    		        newYPos = colliding.innerYlim.max;
    		    }
    		} else {
                if (colliding.arcFrac > correct.arcFrac) {
                    labels.hideExtraLabel(pie, correct);
                } else {
                    labels.hideExtraLabel(pie, colliding);
                }
    		    return;
    		}
		}

		yDiff = center.y - newYPos;

        // rotate colliding element with radius equal to its computed radius
		if (Math.abs(colliding.innerR) > Math.abs(yDiff)) {
			xDiff = Math.sqrt((colliding.innerR * colliding.innerR) - (yDiff * yDiff));

            var padding = pie.options.labels.mainLabel.horizontalPadding;
            // possibly need to do some more shifting
    		if (correct.innerhs === "right") {
    			newXPos = center.x + xDiff - colliding.innerW;
    		} else {
    			newXPos = center.x - xDiff;
    		}


    		colliding.innerX = newXPos;

		}

		colliding.innerY = newYPos;

		if (colliding.innerhs === "right") {
		    colliding.innerAnchorPt.x = colliding.innerX + colliding.innerW;
		} else {
		    colliding.innerAnchorPt.x = colliding.innerX;
		}
		colliding.innerAnchorPt.y = colliding.innerY;
		colliding.innerR = labels.getDist(colliding.innerAnchorPt.x, colliding.innerAnchorPt.y, center.x, center.y)


	},


	// does a little math to shift a label into a new position based on the last properly placed one
	/*adjustLabelPos: function(pie, nextIndex, lastCorrectlyPositionedLabel, info) {
		var xDiff, yDiff, newXPos, newYPos;
		newYPos = lastCorrectlyPositionedLabel.y + info.heightChange;
		yDiff = info.center.y - newYPos;

		if (Math.abs(info.lineLength) > Math.abs(yDiff)) {
			xDiff = Math.sqrt((info.lineLength * info.lineLength) - (yDiff * yDiff));
		} else {
			xDiff = Math.sqrt((yDiff * yDiff) - (info.lineLength * info.lineLength));
		}

		if (lastCorrectlyPositionedLabel.hs === "right") {
			newXPos = info.center.x + xDiff;
		} else {
			newXPos = info.center.x - xDiff - pie.outerLabelGroupData[nextIndex].w;
		}

		pie.outerLabelGroupData[nextIndex].x = newXPos;
		pie.outerLabelGroupData[nextIndex].y = newYPos;
	}*/

};
