# Test Plan:

## Title/Subtitle/Footer

| To Test | Tested In File |
| --- | --- |
| **Combinations** |
| Title | title_subtitle_footer_combinations.html |
| Subtitle | title_subtitle_footer_combinations.html |
| Footer | title_subtitle_footer_combinations.html |
| Title, Subtitle, | title_subtitle_footer_combinations.html |
| Title, Footer | title_subtitle_footer_combinations.html |
| Subtitle, Footer | title_subtitle_footer_combinations.html |
| Title, Subtitle, Footer | title_subtitle_footer_combinations.html |
| **Title Tests** |
| fontsize | title_variations.html |
| fontcolor | title_variations.html |
| fontFamily | title_variations.html |
| topPadding | title_variations.html |
| **Subtitle Tests** |
| multiline support | subtitle_variations.html |
| fontsize | subtitle_variations.html |
| fontcolor | subtitle_variations.html |
| fontFamily | subtitle_variations.html |
| **Footer Tests** |
| multiline support | footer_variations.html |
| fontsize | footer_variations.html |
| fontcolor | footer_variations.html |
| fontFamily | footer_variations.html |

## Colors

| To Test | Tested In File |
| --- | --- |
| Can configure colors | color_variations.html |
| Can rely on default colors | color_variations.html |
| Gradient works | done in R ? |
| Group colors are used to build segment colors if valuesColor not provided | TODO |


## Labels

| To Test | Tested In File |
| --- | --- |
| Can vary labelsFont, labelsSize, labelsColor | label_variations.html |
| Can vary range of labelsSize | label_variations.html |
| Can vary max label width via labelsMaxWidthProportion | label_variations.html |
| (prefix) can prefix the label value | label_variations.html |
| (suffix) can suffix the label value | label_variations.html |
| can display percentage or absolute value via `valuesDisplay` (NOT WORKING) | | label_variations.html | 
| minPercentage cuts off label display | 450_companies.html |
| minFontSize allows font sizes to shrink | label_variations_fontsizing.html |
| vary the minAngle via minAngle | label_variations_minLabel.html |
| (valuesDec) can vary the number decimals displayed via `valuesDec` | label_variations.html |
| labels wrap at 25% of width via `labelsMaxWidthProportion` | label_variations.html |
| labels are positioned at radialLineOffset via radialLineOffset | label_variations.html |
| labels are positioned at labelRadius % | (not implemented) |

## Segments / Donut Plot Building

| To Test | Tested In File |
| --- | --- |
| Small segments are rolled into a group | not exposed, so not tested |  
| Can vary the inner radius %, | segment_variations.html |
| can make the donut a pie | segment_variations.html |
| Can change the segment border color | segment_variations.html |
| Start to fade out as values get smaller | 450_companies.html |

## Group Support
| To Test | Tested In File |
| --- | --- |
| test fontsize, fontcolor, fontFamily, minFontSize | group_variations.html |
| test default colors and specified colors | group_variations.html (NOT WORKING) |
| show labels getting omitted when there is no space | group_variations.html |
| Note: cannot test R logic unless ported to JS | TODO |

## Data Shape / Size Cases

| To Test | Tested In File |
| --- | --- |
| single value | one_val.html |
| single value single group | one_val.html |
| All equal, so min must apply only partially | segment_variations_all_too_small.html |
| Too many labels * 5 to catch edge cases | TODO |
| Too many labels with initial sort order | TODO |
| Too many labels with groups | TODO |

## User Interaction

| To Test | Tested In File |
| --- | --- |
| hovering over segment hilights label | TODO |
| hovering over segment with no label shows tooltip | TODO |
| highlightSegmentOnMouseover works | TODO |
| highlightLaelOnMouseover works | TODO |

## Resizing

| To Test | Tested In File |
| --- | --- |
| Resizing works | TODO |

## Rerender

| To Test | Tested In File |
| --- | --- |
| rerendering works | TODO |

# Radius Variations
10 - 100 outerRadius %