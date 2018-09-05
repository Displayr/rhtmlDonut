# Donut Sizing and Label Alyout Algorithm

# Overview 
The label layout algorithm goes through 4 phases and relies on several config settings. The donut sizing is based on consuming the max space while leaving enough room for label placement. Thus they are discussed together.

*Note:* On _canvasHeight_ and _canvasWidth_. The donut code now deals with a reduced canvas that does not include title, subtitle, and footer. This makes its job easier as it does not have to consider sizing concerns for those elements. So for the rest of the description below, canvasHeight and canvasWidth should be interpreted as "the remaining space" _after_ placing the title, subtitle, and footer.

## Config settings

*Summary Table:*
 
  | variable | default | R setting | JS setting |
  | -------- | ------- | --------- | ---------- |
  | donut inner radius - proportion of outer radius | 0.8     | `inner.radius`                       | `settings.innerRadius`                     |
  | label offset - - distance from donut - proportion of outer radius | 0.1     | `labels.offset`                      | `settings.labelOffset`                     |
  | max label width - proportion of total canvas width | 0.3     | `labels.max.width`                   | `settings.labelsMaxWidth`                  |
  | label font size                   | 10      | `labels.font.size`                   | `settings.labelsSize`                      |
  | label _minimum_ font size         | 8       | `labels.min.font.size`               | `settings.labelsMinFontSize`               | 
  | use inner labels                  | false   | `labels.inner`                       | `settings.labelsInner`                     |
  | label inner padding               | 1       | `labels.padding.inner`               | `settings.labelInnerPadding`               |
  | label outer padding               | 1       | `labels.padding.outer`               | `settings.labelOuterPadding`               |
  | minumum label value - proportion of total value  | 0.003 (i.e., 0.3% of total)  | `values.display.thres`               | `settings.minAngle`                        |
  | max label line angle              | 60      | `labels.line.max.angle`              | `settings.labelMaxLineAngle`               |
  | (advanced) lift off angle         | 30      | `labels.advanced.liftoff.angle`      | `settings.liftOffAngle`                    |
  | (advanced) max vertical offset    | unset , i.e., use all space | `labels.advanced.offset.yaxis.max`   | `settings.labelMaxVerticalOffset` |
  | (advanced) unordered tiebreak removal strategy | 'best' | `labels.advanced.removal.tiebreak`   | `settings.labelUnorderedRemovalTiebreak` |
 
*Descriptions of Config Parameters*

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
    * Prewrap any label greater than "max label width percentage"
    * record height and width of each label based on current font size setting
    * If `sum(height(left_labels))` or `sum(height(right_labels))` is greater than the canvas height, take increasingly aggressive measures to shrink `sum(height)` to be less than canvasHeight 
        * first start applying smaller fontSize scales based on the combos available. For example if font size is 10, and min font is 5, first we try [5,9] then [5,8] ... [5,5]. For the scale [5,8] there are 4 values, so we distribute the font sizes in equal 25% chunks to the labels, based on specified ordering.
        * if font size shrinkage does not work we start increasing the minimim angle display threshold for label display, starting at the specified value (displayr defaults to 0.3%) in intervals of 0.05% until `sum(height(left_labels)) <= canvasHeight` and `sum(height(right_labels)) <= canvasHeight` . Note all height summation calculations account for the minimum vertical padding between labels.

1. **Compute outer pie radius**

    From above we know the largest label width. Choose the largest outer donut radius that will:
     * fit the canvas height
     * fit the canvas width
     * leave enough horizontal space at 0 and 180 degrees to fit the largest label (i.e., left and right sides of donut)
     * leave at least enough vertical space for a single label to be drawn at _label offset_ (see config settings above) pixels at the 90 and 270 degrees (i.e., top and bottom sides of donut)
 
1.  **Niavely place labels**

    This simple phase we simply place labels at _label offset_ pixels past the outer radius along the radial line that intersects the midpoint of the pie segment.
     
    Next we look at the labels along the top and bottom of the pie. If there are collisions in the top set, we apply a liftoff, such that the labels are placed further than _label offset_ pixels from the outer radius. The labels are placed along a lines that form a sort of pyramid on top/bottom of the chart. The same logic is applied to the bottom labels. The top and bottom set are determined by any label within _lift off angle_ degrees (configurable) of the prime longitude line.

1. **Correct any out of bounds placement**

    Identify any labels the niave labeler has placed out of bounds (i.e. beyond or overlapping the canvas border). Push the label just barely back in bounds, and leave further placement to the next steps of the algorithm. At this point I don't this this stage does anything, I dont think its possible to get an out of bounds label in the initial phases, but I've left this code in place as a defensive measure.

1. **Apply collision resolution**

    The collision resolution takes an iterative approach, repeatedly calling a core collision resolution algorithm. If the algorithm fails, it reports which label caused the immediate failure, then a strategy is applied, and then the algorithm makes another attempt. If we end up removing all the labels, we give up and revert to the niave layout from before.
    
    **Strategies**
   
    The first available strategy is picked
   
    1. If the top set has not been lifted, lift the top set and run the collision resolution algorithm again 
    1. If the bottom set has not been lifted, lift the bottom set and run the collision resolution algorithm again
    1. Remove the smallest label and try again.
      
      1. If there are two labels that are same value and they are smallest: in an ordered set the last is removed, in an unordered set remove the label closest to the label that caused the failure.
      
    1. Increase the max line angle threshold  
    
    There is a counter of how many times each strategy has been attempted. We perform 10 'remove smallest labels' for each 'increase max line angle'
    
    **Core collision resolution algorithm**
         
    1. Treat the left and right labels as two seperate sets to solve independently
    1. For each label set (left and right) perform the following "initial spacing", "down sweep", then optional "up sweep" approach:
    
    **Initial Cluster Spacing**
    
    Identify each set of labels that is currently colliding, then for each set, check how much space is available above and below the colliding set. 
    
    If there is space in both directions, spread the colliding set in both directions. If there is only space up, push them up, if there is only space down, push them down. This phase of the algorithm treats each set of colliding labels independently; it does not consider whether the adjustments made have created new sets of colliding labels.
    
    **Down Sweep**

    Iterate each label, from top to bottom looking for intersections between the frontier label and its nearest neighbor.
        * If a collision is detected, then for all remaining labels below, push the labels down so they do not overlap. 
        * While pushing labels down, if this plot uses inner labeling, and the label immediately above the current label is not on the inside, then place this label on the inside and continue.
        * For each adjusted label, adjust the X coord to match the Y adjustment such that the label is placed on along the [conflict resolution best fit lines](./assets/label_conflict_resolution_best_fit_lines.png) (TODO update doc link).
            * For any adjusted label, if the angle between the radial line and the label line exceeds `labels.line.max.angle`, then abort this entire iteration.
            * While pushing the labels down from the frontier, if the bottom is hit, place all remaining labels at the bottom, terminate the "down" phase, and begin the "up phase". If bottom is not hit, continue "down" phase and advance the frontier by 1.

    **Up Sweep**
    
    The up sweep will only run if the down sweep hit the bottom, or if the down sweep terminated because a label line angle exceed the max line angle threshold.
    
    In the up sweep we basically perform the same operation but advance the frontier from the bottom up.
    
    We begin the up sweep by moving all inner labels back to the outside, as we will make a new attempt to place labels on the inside if allowed. 

    If any label exceeds the mac line angle threshold after adjustment, the entire collision iteration is terminated with an exception, and the outer collision resolution controller will apply a strategy (as discussed above) and the core collision resolution algorithm will be run again.    
    
    
## Docs TODO

* Visual showing the different lines referenced in doc
* Visual depiction of max line angle threshold
    