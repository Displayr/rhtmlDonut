function DetailedDonutPlot() {
    var values,
        labels,
        settings,
        pieData,
        n,
        width = 500,
        height = 500,
        i,
        j;


    function chart(selection) {

        var svg = selection.select("svg"),
            svgEl = svg[0][0];

        var pieData = [];
        for (i = 0; i < n; i++) {
            var d = { label: labels[i], value: values[i] };
            pieData.push(d);
        }

        var groupData = [];
        if (settings.groups) {
            if (!settings.groupsColor) {
                settings.groupsColor = d3.scale.category20().range();
            }
            for (i = 0; i < settings.groupsSums.length; i++) {
                var d1 = { label: settings.groupsLab[i], value: settings.groupsSums[i], color: settings.groupsColor[i]};
                groupData.push(d1);
            }
        }

        var	pie  = new d3pie(svgEl, {
        		size: {
        		    canvasWidth: width,
        		    canvasHeight: height,
        			pieInnerRadius: "80%"
        		},
        		data: {
        			sortOrder: settings.order,
            		font: settings.valuesFont ? settings.valuesFont : "arial",
            		fontSize: settings.valuesSize ? settings.valuesSize : 10,
            		prefix: settings.prefix,
            		suffix: settings.suffix,
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
            		}
            	},
            	labels: {
            		mainLabel: {
            			color: "#333333",
            			font: settings.labelsFont ? settings.labelsFont : "arial",
            			fontSize: settings.labelsSize ? settings.labelsSize : 10,
            			fontWeight: "bold"
            		}
            	},
            	groups: {
            	    content: groupData,
            	    font: settings.groupsFont ? settings.groupsFont : "arial",
            	    fontSize: settings.groupsSize ? settings.groupsSize : 10
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
        resize_chart(el);
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

    name: "DetailedDonutPlot",

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

