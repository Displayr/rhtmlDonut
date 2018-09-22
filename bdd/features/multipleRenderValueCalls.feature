@applitools @rerender
Feature: Multiple Calls to Render Value

  Multiple calls to renderValue should leave the widget in a good state. Updates to the config should be rendered, and there should not be multiple widgets created or remnants of the original config left over.

  Scenario: Rerender Test
    Given I am viewing "data.test_plan.abc_rbg" with dimensions 300x300 and rerender controls
    Then the "abc_rbg_300x300" snapshot matches the baseline
    When I rerender with config "data.test_plan.abc_rbg_vertical_flip"
    Then the "abc_rbg_vertical_flip_300x300" snapshot matches the baseline
