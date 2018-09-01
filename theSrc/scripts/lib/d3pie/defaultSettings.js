const defaultSettings = {
  size: {
    canvasHeight: 500,
    canvasWidth: 500,
    pieInnerRadius: 0.8,                    // pieWrapper: settings.innerRadius, R: inner.radius
    labelOffset: 0.1                        // pieWrapper: settings.labelOffset, R: labels.offset
  },
  data: {
    sortOrder: 'descending',                // pieWrapper: settings.valuesOrder, R: values.order
    ignoreSmallSegments: {                  // not used
      enabled: false,                       // not used
      valueType: 'percentage',              // not used
      value: null                           // not used
    },                                      //
    smallSegmentGrouping: {                 // not used
      enabled: false,                       // not used
      value: 1,                             // not used
      valueType: 'percentage',              // not used
      label: 'Other',                       // not used
      color: '#cccccc'                      // not used
    },                                      //
    prefix: null,                           // pieWrapper: settings.prefix, R: prefix
    suffix: null,                           // pieWrapper: settings.suffix, R: suffix
    color: null,                            // pieWrapper: settings.valuesColor, values.color
    dataFormatter: null,                    // pieWrapper: settings.valuesDec, R: values.decimal.places
    display: null,                          // pieWrapper: settings.valuesDisplay, R: values.display.as
    minAngle: 0.003,                        // pieWrapper: settings.minAngle, R: values.display.thres
    content: []                             // pieWrapper: pieData
  },                                        //
  labels: {
    enabled: true,                          // pieWrapper: settings.labelsEnabled, R: labels.enabled
    strategies: {                           //
      unorderedTieBreak: 'best'             // pieWrapper: settings.labelUnorderedRemovalTiebreak, R: labels.advanced.removal.tiebreak
    },                                      //
    stages: {                               //
      outOfBoundsCorrection: true,          //
      initialClusterSpacing: true,          //
      downSweep: true,                      //
      upSweep: true,                        //
      shortenTopAndBottom: true             //
    },                                      //
    outer: {                                //
      innerLabels: false,                   // pieWrapper: settings.labelsInner, R: labels.inner
      displayPercentage: false,             // pieWrapper: settings.valuesDisplay, R: values.display.as
      displayDecimals: 1,                   // pieWrapper: settings.valuesDec, R: values.decimal.places
      linePadding: 2,                       // pieWrapper: settings.linePadding, R: labels.line.padding
      innerPadding: 1,                      // pieWrapper: settings.labelsInnerPadding, R: labels.inner.padding
      outerPadding: 1,                      // pieWrapper: settings.labelsOuterPadding, R: labels.outer.padding
      minLabelOffset: 5,                    // TODO use these values and expose as configurable
      maxLabelOffset: 100,                  // TODO use these values and expose as configurable
      liftOffAngle: 30,                     // pieWrapper: settings.liftOffAngle, R: labels.advanced.liftoff.angle
      labelMaxLineAngle: 60,                // pieWrapper: settings.labelMaxLineAngle, R: labels.line.max.angle
      hideWhenLessThanPercentage: null,     // pieWrapper: null HARD CODE (minAngle is used instead) . TODO investigate this variable
      maxWidth: 0.3,                        // pieWrapper: settings.labelsMaxWidth. R: labels.max.width. wrap label text if label exceeds X% of canvasWidth
      maxVerticalOffset: null                // pieWrapper: settings.labelMaxVerticalOffset. R: labels.advanced.offset.yaxis.max. Max label offset at the 90 degree mark
    },
    mainLabel: {                            //
      color: '#333333',                     // pieWrapper: settings.labelsColor, R: labels.font.color
      font: 'arial',                        // pieWrapper: settings.labelsFont, R: labels.font.family
      fontWeight: 'normal',                 // HARD CODE
      fontSize: 10,                         // pieWrapper: settings.labelsSize, R: labels.font.size
      minFontSize: 8,                       // pieWrapper: settings.labelsMinFontSize, R: labels.min.font.size
      labelsInner: null,                    // not used
      horizontalPadding: 8                  // not used . // TODO delete
    },                                      //
    percentage: {                           // not used
      color: '#dddddd',                     // not used
      font: 'arial',                        // not used
      fontSize: 10,                         // not used
      decimalPlaces: 0                      // not used
    },                                      //
    value: {                                // not used
      color: '#cccc44',                     // not used
      font: 'arial',                        // not used
      fontSize: 10                          // not used
    },                                      //
    lines: {                                //
      enabled: true,                        // not used
      style: 'aligned',                     // not used
      color: 'segment'                      // not used
    },                                      //
    truncation: {                           // not used
      enabled: false,                       // not used
      truncateLength: 30                    // not used
    },                                      // not used
    formatter: null                         // not used
  },                                        //
  effects: {                                // not used
    load: {                                 // not used
      effect: 'default',                    // not used
      speed: 1000                           // not used
    },                                      // not used
    pullOutSegmentOnClick: {                // not used
      effect: 'bounce',                     // not used
      speed: 300,                           // not used
      size: 10                              // not used
    },                                      // not used
    highlightSegmentOnMouseover: true,      // not used
    highlightLabelOnMouseover: true,        // not used
    highlightLuminosity: 40,                // not used
    highlightTextLuminosity: 40             // not used
  },                                        // not used
  tooltips: {                               //
    enabled: true,                          // pieWrapper: HARD CODE
    type: 'placeholder',                    // pieWrapper: HARD CODE
    string: '',                             // pieWrapper: HARD CODE
    placeholderParser: null,                // pieWrapper: HARD CODE
    styles: {                               //
      fadeInSpeed: 1,                       // pieWrapper: HARD CODE
      backgroundColor: '#000000',           // pieWrapper: HARD CODE
      backgroundOpacity: 0.5,               // pieWrapper: HARD CODE
      color: '#efefef',                     // pieWrapper: HARD CODE
      borderRadius: 2,                      // pieWrapper: HARD CODE
      font: 'arial',                        // pieWrapper: HARD CODE
      fontSize: 10,                         // pieWrapper: HARD CODE
      padding: 4                            // pieWrapper: HARD CODE
    }                                       //
  },                                        //
  misc: {                                   //
    colors: {                               //
      background: null,                     // pieWrapper: HARD CODE
      segmentStroke: '#ffffff'              // pieWrapper: settings.borderColor, R: border.color
    },                                      //
    gradient: {                             //
      percentage: 95,                       // pieWrapper: HARD CODE
      color: '#000000'                      // pieWrapper: HARD CODE
    },                                      //
    cssPrefix: null                         // pieWrapper dynamically sets this to a uniqueId
  },                                        //
  groups: {                                 //
    content: null,                          // pieWrapper: groupData,
    font: 'arial',                          // pieWrapper: settings.groupsFont, R: groups.font.family
    fontSize: 10,                           // pieWrapper: settings.groupsSize, R: groups.font.size
    fontColor: '#333333',                   // pieWrapper: settings.groupsFontColor, R: groups.color
    minFontSize: null,                      // pieWrapper: settings.groupLabelsMinFontSize, R: groups.min.font.size
    fontWeight: 'normal',                   // pieWrapper: settings.groupsBold, R: groups.font.bold
    labelsEnabled: true                     // pieWrapper: settings.groupLabelsEnabled, R: groups.labels.enabled
  },                                        //
  callbacks: {                              //
    onload: null,                           // not used
    onMouseoverSegment: null,               // not used
    onMouseoutSegment: null,                // not used
    onClickSegment: null                    // not used
  },
  debug: {
    draw_placement_lines: false
  }
}

module.exports = defaultSettings
