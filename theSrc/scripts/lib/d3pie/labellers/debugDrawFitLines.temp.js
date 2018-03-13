// // NB this is a debug and WIP testing function
// debugDrawFitLines: function (pie) {
//
//   const canvasHeight = parseFloat(pie.options.size.canvasHeight)
//
//   _(_.range(0, 360, 5)).each((angle) => {
//
//     const maxFontSize = _(pie.outerLabelData).map('fontSize').max()
//     console.log(`maxFontSize: ${maxFontSize}`)
//
//     const labelDatum = {
//       angle: { midpoint: angle },
//       label: '',
//       width: 0,
//       hemisphere: (angle < 90 || angle >= 270) ? 'left' : 'right'
//     }
//
//     const {labelTextCoord, labelLineCoord} = labels.placeLabelAlongLabelRadiusWithLiftOffAngle({
//       labelDatum,
//       labelOffset: pie.labelOffset,
//       maxVerticalOffset: parseFloat(pie.options.labels.outer.maxVerticalOffset),
//       labelLiftOffAngle: parseFloat(pie.options.labels.outer.liftOffAngle),
//       outerRadius: pie.outerRadius,
//       pieCenter: pie.pieCenter,
//       canvasHeight: parseFloat(pie.options.size.canvasHeight),
//       horizontalPadding: parseFloat(pie.options.labels.mainLabel.horizontalPadding),
//       maxFontSize
//     })
//
//     helpers.showPoint(pie.svg, labelTextCoord.x, labelTextCoord.y, 'green')
//     helpers.showPoint(pie.svg, labelLineCoord.x, labelLineCoord.y, 'red')
//   })
//
//   // computeXGivenY
//   _(['left', 'right']).each(hemisphere => {
//     _(_.range(0, canvasHeight, 5)).each((yCoord) => {
//       console.log(yCoord)
//
//       const labelDatum = {
//         y: yCoord,
//         width: 0,
//         hemisphere: hemisphere
//       }
//
//       const x = labels.moveLabelToNewY({
//         newY: yCoord,
//         labelDatum,
//         labelRadius: pie.outerRadius + pie.labelOffset,
//         labelLiftOffAngle: parseFloat(pie.options.labels.outer.liftOffAngle),
//         horizontalPadding: parseFloat(pie.options.labels.mainLabel.horizontalPadding),
//         pieCenter: pie.pieCenter,
//         yRange: canvasHeight / 2,
//       })
//
//       helpers.showPoint(pie.svg, x, yCoord, 'blue')
//     })
//   })
// },
