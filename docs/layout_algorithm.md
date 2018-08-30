# Donut Sizing and Label Alyout Algorithm

# Overview 
The label layout algorithm goes through 4 phases and relies on several config settings. The donut sizing is based on consuming the max space while leaving enough room for label placement. Thus they are discussed together.

*Note:* On _canvasHeight_ and _canvasWidth_. The donut code now deals with a reduced canvas that does not include title, subtitle, and footer. This makes its job easier as it does not have to consider sizing concerns for those elements. So for the rest of the description below, canvasHeight and canvasWidth should be interpreted as "the remaining space" _after_ placing the title, subtitle, and footer.

## Config settings

*Summary Table:*
 
  | variable | default | R setting | JS setting |
  | -------- | ------- | --------- | ---------- |
  | donut inner radius                | 0.8     | `inner.radius`                       | `settings.innerRadius`                     |
  | label offset                      | 0.1     | `labels.offset`                      | `settings.labelOffset`                     |
  | max label width                   | 0.3     | `labels.max.width`                   | `settings.labelsMaxWidth`                  |
  | label font size                   | 10      | `labels.font.size`                   | `settings.labelsSize`                      |
  | label _minimum_ font size         | 8       | `labels.min.font.size`               | `settings.labelsMinFontSize`               | 
  | use inner labels                  | false   | `labels.inner`                       | `settings.labelsInner`                     |
  | label inner padding               | 1       | `labels.padding.inner`               | `settings.labelInnerPadding`               |
  | label outer padding               | 1       | `labels.padding.outer`               | `settings.labelOuterPadding`               |
  | minumum label display threshold   | 0.003   | `values.display.thres`               | `settings.minAngle`                        |
  | max label line angle              | 60      | `labels.line.max.angle`              | `settings.labelMaxLineAngle`               |
  | (advanced) lift off angle         | 30      | `labels.advanced.liftoff.angle`      | `settings.liftOffAngle`                    |
  | (advanced) max vertical offset    | unset , i.e., use all space | `labels.advanced.offset.yaxis.max`   | `settings.labelMaxVerticalOffset` |
  | (advanced) unordered tiebreak removal strategy | 'last' | `labels.advanced.removal.tiebreak`   | `settings.labelUnorderedRemovalTiebreak` |
  // Doc the tieBreak settings
 
*Config Descriptions*

* *donut inner radius*: The radius of the inside of the donut, expressed as a proportion of the donut outer radius. Set to 0 to make a traditional pie graph.
* *label offset*: The distance the labels should be placed "beyond" the outer donut radius, expressed as a proportion of the donut outer radius.
* *max label width*: maximum label width as a proportion of total canvas width
* *label font size*: initial font size used for labels before adjustments
* *label _minimum_ font size*: the minimum font size to be used. Adjustments will not shrink font beyond this value
* *use inner labels*: if true, then labels will be moved inside the donut during collision resolution phase  
* *labels.padding.inner*: Exact Padding between rows in a multi line label 
* *labels.padding.outer*: Padding between different labels   
* *minumum label display threshold*: Any segment with a fractional value of total lower than minAngle will not have a label. Note some segments with higher values will still not be displayed based on adjustments made
* *max label line angle*: Hide any label where the angle between the radial line and the label line (line from outerRadius to label) is greater than the "max label line angle"
* *(advanced) lift off angle*: Controls point where initial label placement algorithm begins to place the labels farther away from the outer radius. See doc here (TODO link doc)
* *(advanced) max vertical offset*: At the 90 and 270 degree mark, what is the maximum distance between labels and the donut plot. Defaults to use all available space.
* *(advanced) unordered tiebreak removal strategy*: For unordered data sets, when removing the minumum label during placement, if there are multiple minimum labels, what do we do? setting to 'last' will remove the last minimum label in the set, 'best' will remove the minimum label that is most likely causing a collision.
  
## Label layout Algorithm overview

1. **Preprocess labels** 
    * Remove any label where the label value is below the minumum angle display threshold
    * Treat labels as two distinct groups based on angle: left side and right side
    * Prewrap any label greater than "max label width percentage" (default 25%)
    * record height and width of each label based on current font size setting
    * If `sum(height(left_labels))` or `sum(height(right_labels))` is greater than the canvas height, take increasingly aggressive measures to shrink `sum(height)` to be less than canvasHeight 
        * first start applying smaller fontSize scales based on the combos available. For example if font size is 10, and min font is 5, first we try [5,9] then [5,8] ... [5,5]. For the scale [5,8] there are 4 values, so we distribute the font sizes in equal 25% chunks to the labels, based on specified ordering.
        * if font size shrinkage does not work we start increasing the minimim angle display threshold for label display, starting at the specified value (displayr defaults to 0.3%) in intervals of 0.05% until `sum(height(left_labels)) <= canvasHeight` and `sum(height(right_labels)) <= canvasHeight` . Note all height summation calculations account for the minimum vertical padding between labels.

1. **Compute outer pie radius**

    From above we know the largest label width. Choose the largest outer donut radius that will:
     * fit the canvas height
     * fit the canvas width
     * leave enough horizontal space at 0 and 180 degrees to fit the largest label
     * leave at least enough vertical space for a single label to be drawn at _label offset_ (see config settings above) pixels from 90 and 270 degrees.
 
1.  **Niavely place labels**

    This simple phase we simply place labels at _label offset_ pixels past the outer radius along the radial line that intersects the midpoint of the pie segment.
     
     YOU ARE HERE
    Next we look at the labels along the top and bottom of the pie. When labels are placed near the top and bottom, we apply a lift off to increase the spacing. See docs here (TODO add docs)

1. **Apply conflict resolution**

    1. Identify any labels the niave labeler has placed out of bounds (i.e. beyond or overlapping the canvas border). Push the label just barely back in bounds, and leave further placement to the next steps of the algorithm.
    
    1. Repeatedly iterate the following steps - each time increasing the `minumum label display threshold` - until no conflicts or we have removed all the labels. If we remove all the labels, give up and revert to the niave layout
        1. remove all labels where segement value is less than `minumum label display threshold` (on iteration 1 there will no removals)
        1. Treat the left and right labels as two seperate sets to solve independently, for each label set perform the following down then up sweep:
        1. "down phase" : iterate the labels according to vertical placement from top to bottom looking for intersections between the frontier label and its nearest neighbor. 
            * If a collision is detected, then for all remaining labels in set, push the labels down so they do not overlap. 
            * For any adjusted label, also adjust the X coord so that the label is placed on along the [conflict resolution best fit lines](./assets/label_conflict_resolution_best_fit_lines.png) (TODO update doc link).
            * For any adjusted label, if the angle between the radial line and the label line exceeds `labels.line.max.angle`, then abort this entire iteration.
            * While pushing the labels down from the frontier, if the bottom is hit, place all remaining labels at the bottom, terminate the "down" phase, and begin the "up phase". If bottom is not hit, continue "down" phase and advance the frontier by 1.
        1. "up phase" : if the bottom was hit in the down phase, basically perform the same operation but advancing the frontier from the bottom up. Given that the precompute labels phase guarantees there is enough vertical and horizontal space for labels, we can guarantee the "up" phase will succeed in placing all labels without collision.
            * In the up phase, we adjust _every_ single label, as we start with multiple labels at bottom and need to spread these upwards while preserving order. This means that every single label is now placed on the [conflict resolution best fit lines](./assets/label_conflict_resolution_best_fit_lines.png).
            * For any adjusted label, if the angle between the radial line and the label line exceeds `labels.line.max.angle`, then abort this entire iteration.
        1. If the *iteration* succeeds, we are done. If it failed, note the fractional value of the label that failed, then restart the iteration, but increase the `minumum label display threshold` to be slightly higher than the label that failed. The increase is determined by the `previous value`, the value of the failed segment, and the min/max iteration increment values.      