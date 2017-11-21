import _ from 'lodash'
import d3 from 'd3'

import helpers from './helpers'
import labels from './labels'
import math from './math'
import segments from './segments'
import tt from './tooltip'
import validate from './validate'

/*!
 * This is not the standard d3pie. It's edited by Xiaoting Wang for a DetailedDonutPlot
 * @author Ben Keen, Xiaoting Wang
 * @version 0.1.8
 * @date 22 March, 2016
 * @repo http://github.com/benkeen/d3pie
 */

var _scriptName = 'd3pie'
var _version = '0.1.6'

// this section includes all helper libs on the d3pie object. They're populated via grunt-template. Note: to keep
// the syntax highlighting from getting all messed up, I commented out each line. That REQUIRES each of the files
// to have an empty first line. Crumby, yes, but acceptable.
//// --------- _default-settings.js -----------/**
/**
 * Contains the out-the-box settings for the script. Any of these settings that aren't explicitly overridden for the
 * d3pie instance will inherit from these. This is also included on the main website for use in the generation script.
 */
var defaultSettings = {
  size: {
    canvasHeight: 500,
    canvasWidth: 500,
    pieInnerRadius: '0%',
    pieOuterRadius: null
  },
  data: {
    sortOrder: 'none',
    ignoreSmallSegments: {
      enabled: false,
      valueType: 'percentage',
      value: null
    },
    smallSegmentGrouping: {
      enabled: false,
      value: 1,
      valueType: 'percentage',
      label: 'Other',
      color: '#cccccc'
    },
    content: []
  },
  labels: {
    outer: {
      format: 'label',
      hideWhenLessThanPercentage: null,
      pieDistance: 30
    },
    inner: {
      format: 'percentage',
      hideWhenLessThanPercentage: null
    },
    mainLabel: {
      color: '#333333',
      font: 'arial',
      fontWeight: 'bold',
      fontSize: 10
    },
    percentage: {
      color: '#dddddd',
      font: 'arial',
      fontSize: 10,
      decimalPlaces: 0
    },
    value: {
      color: '#cccc44',
      font: 'arial',
      fontSize: 10
    },
    lines: {
      enabled: true,
      style: 'curved',
      color: 'segment'
    },
    truncation: {
      enabled: false,
      truncateLength: 30
    },
    formatter: null
  },
  effects: {
    load: {
      effect: 'default',
      speed: 1000
    },
    pullOutSegmentOnClick: {
      effect: 'bounce',
      speed: 300,
      size: 10
    },
    highlightSegmentOnMouseover: true,
    highlightLabelOnMouseover: true,
    highlightLuminosity: 40,
    highlightTextLuminosity: 40,
  },
  tooltips: {
    enabled: false,
    type: 'placeholder', // caption|placeholder
    string: '',
    placeholderParser: null,
    styles: {
      fadeInSpeed: 250,
      backgroundColor: '#000000',
      backgroundOpacity: 0.5,
      color: '#efefef',
      borderRadius: 2,
      font: 'arial',
      fontSize: 10,
      padding: 4
    }
  },
  misc: {
    colors: {
      background: null,
      segments: [
        '#2484c1', '#65a620', '#7b6888', '#a05d56', '#961a1a', '#d8d23a', '#e98125', '#d0743c', '#635222', '#6ada6a',
        '#0c6197', '#7d9058', '#207f33', '#44b9b0', '#bca44a', '#e4a14b', '#a3acb2', '#8cc3e9', '#69a6f9', '#5b388f',
        '#546e91', '#8bde95', '#d2ab58', '#273c71', '#98bf6e', '#4daa4b', '#98abc5', '#cc1010', '#31383b', '#006391',
        '#c2643f', '#b0a474', '#a5a39c', '#a9c2bc', '#22af8c', '#7fcecf', '#987ac6', '#3d3b87', '#b77b1c', '#c9c2b6',
        '#807ece', '#8db27c', '#be66a2', '#9ed3c6', '#00644b', '#005064', '#77979f', '#77e079', '#9c73ab', '#1f79a7'
      ],
      segmentStroke: '#ffffff'
    },
    gradient: {
      enabled: false,
      percentage: 95,
      color: '#000000'
    },
    canvasPadding: {
      top: 5,
      right: 5,
      bottom: 5,
      left: 5
    },
    pieCenterOffset: {
      x: 0,
      y: 0
    },
    cssPrefix: null
  },
  callbacks: {
    onload: null,
    onMouseoverSegment: null,
    onMouseoutSegment: null,
    onClickSegment: null
  }
}

// our constructor
var d3pie = function (element, options) {

  // element can be an ID or DOM element
  this.element = element
  if (typeof element === 'string') {
    var el = element.replace(/^#/, '') // replace any jQuery-like ID hash char
    this.element = document.getElementById(el)
  }

  this.options = _.merge({}, defaultSettings, options)

  // if the user specified a custom CSS element prefix (ID, class), use it
  if (this.options.misc.cssPrefix !== null) {
    this.cssPrefix = this.options.misc.cssPrefix
  } else {
    console.log(`warn: need this.options.misc.cssPrefix`)
    this.cssPrefix = 'missing-prefix'
  }

  // now run some validation on the user-defined info
  if (!validate.initialCheck(this)) {
    return
  }

  // add a data-role to the DOM node to let anyone know that it contains a d3pie instance, and the d3pie version
  d3.select(this.element).attr(_scriptName, _version)

  // things that are done once
  if (this.options.data.smallSegmentGrouping.enabled) {
    this.options.data.content = helpers.applySmallSegmentGrouping(this.options.data.content, this.options.data.smallSegmentGrouping)
  }
  this.options.colors = helpers.initSegmentColors(this)
  this.totalSize = math.getTotalPieSize(this.options.data.content)

  _init.call(this)
}

d3pie.prototype.recreate = function () {
  // now run some validation on the user-defined info
  if (!validate.initialCheck(this)) {
    return
  }
  //this.options.data.content = math.sortPieData(this);
  if (this.options.data.smallSegmentGrouping.enabled) {
    this.options.data.content = helpers.applySmallSegmentGrouping(this.options.data.content, this.options.data.smallSegmentGrouping)
  }
  this.options.colors = helpers.initSegmentColors(this)
  this.totalSize = math.getTotalPieSize(this.options.data.content)

  _init.call(this)
}

d3pie.prototype.redraw = function () {
  this.element.innerHTML = ''
  _init.call(this)
}

d3pie.prototype.redrawWithoutLoading = function () {

  _initNoLoading.call(this)
}

d3pie.prototype.destroy = function () {
  this.element.innerHTML = '' // clear out the SVG
  d3.select(this.element).attr(_scriptName, null) // remove the data attr
}

/**
 * Returns all pertinent info about the current open info. Returns null if nothing's open, or if one is, an object of
 * the following form:
 *  {
 * 	  element: DOM NODE,
 * 	  index: N,
 * 	  data: {}
 * 	}
 */
d3pie.prototype.getOpenSegment = function () {
  var segment = this.currentlyOpenSegment
  if (segment !== null && typeof segment !== 'undefined') {
    var index = parseInt(d3.select(segment).attr('data-index'), 10)
    return {
      element: segment,
      index: index,
      data: this.options.data.content[index]
    }
  } else {
    return null
  }
}

d3pie.prototype.openSegment = function (index) {
  index = parseInt(index, 10)
  if (index < 0 || index > this.options.data.content.length - 1) {
    return
  }
  segments.openSegment(this, d3.select('#' + this.cssPrefix + 'segment' + index).node())
}

d3pie.prototype.closeSegment = function () {
  var segment = this.currentlyOpenSegment
  if (segment) {
    segments.closeSegment(this, segment)
  }
}

// this let's the user dynamically update aspects of the pie chart without causing a complete redraw. It
// intelligently re-renders only the part of the pie that the user specifies. Some things cause a repaint, others
// just redraw the single element
d3pie.prototype.updateProp = function (propKey, value) {
  switch (propKey) {
    case 'callbacks.onload':
    case 'callbacks.onMouseoverSegment':
    case 'callbacks.onMouseoutSegment':
    case 'callbacks.onClickSegment':
    case 'effects.pullOutSegmentOnClick.effect':
    case 'effects.pullOutSegmentOnClick.speed':
    case 'effects.pullOutSegmentOnClick.size':
    case 'effects.highlightSegmentOnMouseover':
    case 'effects.highlightLuminosity':
      helpers.processObj(this.options, propKey, value)
      break

    // everything else, attempt to update it & do a repaint
    default:
      helpers.processObj(this.options, propKey, value)

      this.destroy()
      this.recreate()
      break
  }
}

// ------------------------------------------------------------------------------------------------

var _init = function () {

  // prep-work
  this.svgContainer = helpers.addSVGSpace(this)
  this.svg = this.svgContainer.append('g').attr('class', 'mainPlot')
  this.floating = this.svgContainer.append('g').attr('class', 'floating')

  this.outerLabelGroupData = []
  this.groupLabelGroupData = []

  var self = this

  // at this point, all main text component dimensions have been calculated
  math.computePieRadius(self)

  // this value is used all over the place for placing things and calculating locations. We figure it out ONCE
  // and store it as part of the object
  math.calculatePieCenter(self)

  // now create the pie chart segments, and gradients if the user desired
  if (self.options.misc.gradient.enabled) {
    segments.addGradients(self)
  }
  segments.create(self) // also creates this.arc

  labels.add(self, 'outer', self.options.labels.outer.format)
  labels.computeOuterLabelCoords(self)
  labels.calculateLabelGroupPosition(self, 'outer')

  if (self.options.groups.content) {
    labels.positionGroupLabels(self)
  }

  // this is (and should be) dumb. It just places the outer groups at their calculated, collision-free positions
  labels.positionLabelGroups(self, 'outer')

  // 2. now adjust those positions to try to accommodate conflicts
  labels.resolveOuterLabelCollisionsNew(self)
  // we use the label line positions for many other calculations, so ALWAYS compute them
  labels.computeLabelLinePositions(self)

  // only add them if they're actually enabled
  if (self.options.labels.lines.enabled && self.options.labels.outer.format !== 'none') {
    labels.addLabelLines(self)
  }

  labels.fadeInLabelsAndLines(self)

  // add and position the tooltips
  if (self.options.tooltips.enabled) {
    tt.addTooltips(self)
  }

  // position the title and subtitle
  segments.addSegmentEventHandlers(self)
}

var _initNoLoading = function () {
  var self = this

  // at this point, all main text component dimensions have been calculated
  math.computePieRadius(self)

  // this value is used all over the place for placing things and calculating locations. We figure it out ONCE
  // and store it as part of the object
  math.calculatePieCenter(self)

  // now create the pie chart segments, and gradients if the user desired
  if (self.options.misc.gradient.enabled) {
    segments.addGradients(self)
  }
  self.options.effects.load.effect = 'none'
  segments.reshapeSegment(self)

  labels.add(self, 'outer', self.options.labels.outer.format)
  labels.computeOuterLabelCoords(self)
  labels.calculateLabelGroupPosition(self, 'outer')

  if (self.options.groups.content) {
    labels.positionGroupLabels(self)
  }

  // this is (and should be) dumb. It just places the outer groups at their calculated, collision-free positions
  labels.positionLabelGroups(self, 'outer')

  // 2. now adjust those positions to try to accommodate conflicts
  labels.resolveOuterLabelCollisionsNew(self)

  // we use the label line positions for many other calculations, so ALWAYS compute them
  labels.computeLabelLinePositions(self)

  // only add them if they're actually enabled
  if (self.options.labels.lines.enabled && self.options.labels.outer.format !== 'none') {
    labels.addLabelLines(self)
  }
  // add and position the tooltips

  if (self.options.tooltips.enabled) {
    tt.addTooltips(self)
  }

  segments.addSegmentEventHandlers(self)
}

module.exports = d3pie
