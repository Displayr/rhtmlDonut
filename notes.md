# TODO

* link http://wiki.q-researchsoftware.com/wiki/Visualization_-_Donut_Chart in the readme
* try to add more BDD coverage first
** Need coverage for groups, valuesColor,  
* DetailedDonutPlot: to class.
** Can I merge with d3pie ?
* rhtmlParts: change signatures to {} to clean up the factory renderValue call

* Refactor plan
  * remove all unused functionality
  * capture original label placement algorithm so I can make them go head to head, and so I can choose one or other via config in the future
  
  
# Labelling : https://en.wikipedia.org/wiki/Automatic_label_placement. NP-Hard


# What is role of DetailedDonutPlot ?
 
* Invoking d3Pie, applying a lot of default settings if not specified by user
* Doing some settings formatting based on whether groups is set ?
* Adding a menubox control to be able to control ordering ?
** Is this recorded in state ?

# Questions

* Is D3 Pie used in production. 
* Are there any flip / metro / other libraries calling D3Pie
* Is the menu box / order control feature used by Displayr
  * there is a lot of code to build and display a control panel (like the palmtrees control panel), but it doesn't look finished. I am wondering if we actually use the control panel ?
* Can i get configs / R snippets that are representative of prod usage ?
* Can i get all the configs / R snippets used in prod ?
* What is the rough "history" of rhtmlDonut ? I see that it is a heavily modified wrapper for the open source d3pie repo. What were the major additions? Was the labeller completely rewritten?  

# Detailed Code Overview

factory.renderValue creates a title, subtitle, footer, adjusts donut size to leave room for the title, subtitle, footer, then calls DetailedDonutPlot and calls into the main chart function returned by DetailedDonutPlot  

DetailedDonutPlot returns an object with some getters/setters that implements the main `d3.select(element).call(donutPlot)` handoff.
Roles of main chart fn:

  * translate incoming config and data into pieData, pieColor, groupData, and groupColor : line 50 - 176
  * compute some padding and dimensions : line 178 - 196
  * draw the menubox : line 197 -  370
  * instantiate d3Pie : line 370 - 460
  
d3pie.js
  * "constructor"
    * normalize and validate input : line 24 - 46
    * do things that are done once:
      * apply small segment grouping: optionally create the other group based on a threshold
      * init colors : ensure every datapoint has a color
      * get total pie size 
    * call _init
    
  * _init
    * compute pie radius: 
      * outer radius defaults to 1/3 of min(2/3W,H) <-- probably to leave room for title etc ?. outer radius can be set as absolute or percentage but displayr does not use this feature
      * inner radius must be set, displayr charting code defaults to 70%
    * compute pie center: 
      * consider headerOffset, canvas size, and padding
    * create segments:
      * draw arcs, then draw group arcs, save references to arcCalculator and groupArcCalculator  
    * create labels: adds the labels but does not position them
    * computeOuterLabelCoords: for each label and for each quadrant
      * NB width calcs look off (recorded width is less than final observed ...)?
      * compute some parameters (h,w,hemisphere,angle,angleExtent)
      * do intitial placement ignoring collision
      * this fn has no consideration for canvas boundaries
    * calculateLabelGroupPosition:
      * sets labelData[oy,ox] based on offset and total xy domain of initial label positions
    * positionGroupLabels:
      * skipped it
    * positionLabelGroups:
      * sets the transform on each outer label. Uses x and y from labelData
    * resolveOuterLabelCollisionsNew
      * crazy nested logic with likely 30+ distinct cases
      * for every label (I)
        * for every label before (J):
            IF it intersects with previous (trig=1)
              OR it out of order with previous (trig=2, trig=3)
              OR it is the first label in a hemisphere (trig=4)
            THEN 
              A) Adjust the position of label (I) or hide label (I)
              B) for every label before label (I)
                - if the labels intersect hide the smaller
        * check label for wrapping
          * if label is within 5 of canvas boundaries (or over) then wrap and adjust X
        * IF label is in right hemisphere then check collision again
          * for every label before (J):
            IF it intersects with previous (trig=1)
              OR it out of order with previous (trig=2, trig=3)
              OR it is the first label in a hemisphere (trig=4)
            THEN 
              A) Adjust the position of label (I) or hide label (I)
              B) for every label before label (I)
                - if the labels intersect hide the smaller
      * update all the font sizes (not sure how or why it makes little sense)
      * put labels in the middle if allowed and if they were hidden
      * finally apply all the new computed x and y to the actual DOM
    
    * add lines
    * add tooltips
      
  
General / Unsorted Notes:
  
  segement.js : Pie chart layout is a function of pie.pieCenter, and pie.innerRadius, pie.outerRadius.  
    
  
  