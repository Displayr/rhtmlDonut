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

    	var pie = new d3pie(svgEl, {
    		header: {
    			title: {
    				text: "A Simple Donut Pie"
    			},
    			location: "pie-center"
    		},
    		size: {
    		    canvasWidth: width,
    		    canvasHeight: height,
    			pieInnerRadius: "80%"
    		},
    		data: {
    			sortOrder: "value-desc",
    			content: pieData
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

