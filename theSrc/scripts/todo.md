as at 2020-10-04
 
theSrc/scripts//lib/d3pie/d3pie.js: 
  * linesConfig: this.options.labels.lines, // TODO move this into this.options.labels.segment
  * labelLinePadding = 2 // TODO pull from config
  * // TODO NB: I think the unordered and the descending order labeller make different assumptions about
  * // TODO remove these 5 from this and access exclusive through canvas
  * // TODO this is temp assignment to this.outerLabelData to make it all keep working ...
  * // TODO this is pretty inefficient. will do 2n^2 scans

(DEFER) theSrc/scripts//lib/d3pie/segments.js:
  * TODO collapse these two sections
  * TODO rename
  * TODO rename
  * TODO consolidate with outerLabeller version

(DEFER) performCollisionResolution/CollisionResolver.js:
  * // TODO need to update this.variant.minProportion.
  * // TODO soon we can assume this (as this  collision resolver will be renamed to "unordered"
  * // TODO DOES THIS MAKE SENSE STILL
  * // TODO add stage check for pie.options.labels.stages.initialClusterSpacing
  * // TODO not sure this 'group collisions into sets' works anymore ...
  * // XXX NB TODO strictly speaking we can only throw out our quadrant/hemisphere worth of inner labels
  * innerRadiusLabelCoord.y = previousLabel.topLeftCoord.y + previousLabel.height + 2 // TODO now have a couple hard coded 2's about
  * innerRadiusLabelCoord.y = previousLabel.topLeftCoord.y - 2 // TODO now have a couple hard coded 2's about

(DEFER) performDescendingOrderCollisionResolution/DescendingOrderCollisionResolver.js:
  * TODO this is odd because I am alternating between accessing wrappedLabelSet and labelSet directly ...
  * TODO: this should be a util fn called "is a clockwise of b" .. ?
  * TODO: this should be a util fn called "is a counter clockwise of b" .. ?
  * TODO: not sure why but I cannot make this "symmetric" with labelLineAngleExceededTooFarClockWise

theSrc/scripts//lib/d3pie/labellers/segmentLabeller/SegmentLabeller.js:
  * // TODO: future work. Add inner labels to performDescendingOrderCollisionResolution mutation
  * // TODO this was ported correctly but it looks like the X's should by Y's ?
  * // TODO rename to getOuterLabelStats, or include inner stats
  * svg.selectAll(`.${cssPrefix}labels-extra`).remove() // TODO dont need
  * svg.selectAll(`.${cssPrefix}labels-group`).remove() // TODO shouldn't be done here
  * svg.selectAll(`.${cssPrefix}tooltips`).remove() // TODO shouldn't be done here. Also wont work any more (not in svg)
  * svg.selectAll(`.${cssPrefix}gtooltips`).remove() // TODO shouldn't be done here. Also wont work any more (not in svg)

theSrc/scripts//PieWrapper.js:
  * TODO make title/subtitle/footer handle being instantiated with no text : return zero, play nice. Push all these if concerns into module
  * TODO also currently need to specify all the things
  * TODO add a show/hide attribute controlled by the debug settings
  * TODO remove all defaults here that are covered in defaultSettings. May require a "delete all null/undefined step in the middle"
  * TODO use enums for ascending / descending / unordered
  * TODO to utils

theSrc/scripts//lib/d3pie/tooltip.js:    
  * const dims = helpers.getDimensions(selector) // TODO should only need to do this once

theSrc/scripts//lib/d3pie/defaultSettings.js:
  * fontFamily: 'arial', // pieWrapper: settings.labelsFont, R: labels.font.family // TODO change to setting.fontFamily
  * maxLabelOffset: 100, // TODO use these values and expose as configurable
  * maxWidthProportion: 0.3, // pieWrapper: settings.labelsMaxWidth. R: labels.max.width. wrap label text if label exceeds X% of canvasWidth // TODO change to settings.labelsMaxWidthProportion
  * minLabelOffset: 5, // TODO use these values and expose as configurable
  * preferredMaxFontSize: 8, // pieWrapper: settings.labelsSize, R: labels.font.size // TODO change to labelsMaxFontSize

theSrc/scripts//lib/d3pie/labellers/labelUtils.js:// TODO this is from palmtrees labelUtils module
theSrc/scripts//lib/d3pie/labellers/labelUtils.js:  // TODO test labels have minX maxX minY maxY - else RBush will ignore them

basisInterpolated.js:  let intermediateLineCoord = { type: 'mid' } // TODO do I need type 'mid' ?
bezierCurve.js:// TODO: add doc image
bezierCurve.js:// TODO: test ?

removeLabelsUntilLabelsFitCanvasVertically.js:// TODO this fn does not guarantee the least are removed.
removeLabelsUntilLabelsFitCanvasVertically.js:  // TODO make 0.0005 configurable, or use one of the existing iteration values
initialNaivePlacement.js:  // TODO hard coded ranges


theSrc/scripts//lib/d3pie/labellers/segmentLabeller/innerLabel.js:  // NB TODO dont think this works
theSrc/scripts//lib/d3pie/labellers/segmentLabeller/innerLabel.js:  get segmentAngleMidpoint () { return this._invariant.segmentAngleMidpoint } // TODO try to deprecate this in favour of angle

theSrc/scripts//lib/d3pie/labellers/segmentLabeller/utils/computeLabelLineMaxAngleCoords.js:  TODO: implement this optimisation
theSrc/scripts//lib/d3pie/labellers/segmentLabeller/utils/adjustLabelToNewY.js:  // TODO move to label

theSrc/scripts//lib/d3pie/labellers/segmentLabeller/computeLabelStats.js:    fontSizeDistribution, // TODO this is a lodash wrapped object (but it works ?)
