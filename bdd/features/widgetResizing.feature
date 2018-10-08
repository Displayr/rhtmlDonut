@applitools @donut @resize
Feature: Calls to Resize

  Resize functions correctly.

  Scenario: Basic Resizing Test
    Given I am viewing "data.test_plan.abc_rbg" with dimensions 300x200
    Then the "simplest_example_interaction_baseline" snapshot matches the baseline
    When I resize the widget to 275x200
    Then the "simplest_example_interaction_275x200" snapshot matches the baseline
    When I resize the widget to 250x200
    Then the "simplest_example_interaction_250x200" snapshot matches the baseline
    When I resize the widget to 225x200
    Then the "simplest_example_interaction_250x200" snapshot matches the baseline
    When I resize the widget to 225x200
    Then the "simplest_example_interaction_250x200" snapshot matches the baseline
    When I resize the widget to 400x300
    Then the "simplest_example_interaction_400x300" snapshot matches the baseline
    When I resize the widget to 500x400
    Then the "simplest_example_interaction_500x400" snapshot matches the baseline

  Scenario: Resize Widget With Wrapped Titles, Subtitles, and Footer
    Given I am viewing "data.test_plan.long_title_subtitle_footer" with dimensions 600x600
    Then the "long_title_subtitle_footer_600x600" snapshot matches the baseline
    When I resize the widget to 400x600
    Then the "long_title_subtitle_footer_400x600" snapshot matches the baseline
    When I resize the widget to 250x600
    Then the "long_title_subtitle_footer_250x600" snapshot matches the baseline