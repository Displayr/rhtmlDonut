@applitools @donut @hover @tooltip
Feature: Tooltip Interactions

  Hovering over different segments and labels triggers hilighting and tooltips

  Scenario: Scenario: User can hover over the segments and see hilighting and tooltips
    Given I am viewing "data.test_plan.groups_with_some_hidden_labels" with dimensions 650x650
    When I hover over segment 10
    Then the "interaction_hover_segment_with_label_shows_no_tooltip" snapshot matches the baseline
    When I hover over segment 7
    Then the "interaction_hover_segment_no_label_shows_tooltip" snapshot matches the baseline
    When I hover and move within segment 7
    Then the "interaction_hover_segment_tooltip_follows_mouse" snapshot matches the baseline
    Then I move the mouse off the donut
    Then the "interaction_hover_move_off_donut" snapshot matches the baseline
    When I hover over segment 11
    Then the "interaction_hover_segment_hilights_the_label" snapshot matches the baseline
    When I hover over label 12
    Then the "interaction_hover_label_hilights_the_segment" snapshot matches the baseline

  Scenario: Scenario: User can hover over the group segments and see tooltips
    Given I am viewing "data.test_plan.simple_groups" with dimensions 190x190
    When I hover over group segment 0
    Then the "interaction_hover_segment_group_label_shows_no_tooltip" snapshot matches the baseline
    When I hover over group segment 2
    Then the "interaction_hover_segment_group_no_label_shows_tooltip" snapshot matches the baseline

  Scenario: Scenario: Tooltip wrapping works and is configurable
    Given I am viewing "data.test_plan.tooltip_wrapping_default_settings" with dimensions 1000x1000
    When I hover over segment 4
    Then the "interaction_hover_segment_with_default_wrapped_tooltip" snapshot matches the baseline
    When I hover over group segment 2
    Then the "interaction_hover_segment_group_with_default_wrapped_tooltip" snapshot matches the baseline
    Given I am viewing "data.test_plan.tooltip_wrapping_max_10_percent" with dimensions 1000x1000
    When I hover over segment 4
    Then the "interaction_hover_segment_with_short_wrapped_tooltip" snapshot matches the baseline
    When I hover over group segment 2
    Then the "interaction_hover_segment_group_with_short_wrapped_tooltip" snapshot matches the baseline

  Scenario: Scenario: Tooltip styling is configurable
    Given I am viewing "data.test_plan.tooltip_styling" with dimensions 1000x1000
    When I hover over segment 4
    Then the "interaction_hover_segment_with_tooltip_styling" snapshot matches the baseline
    When I hover over group segment 2
    Then the "interaction_hover_segment_group_with_tooltip_styling" snapshot matches the baseline