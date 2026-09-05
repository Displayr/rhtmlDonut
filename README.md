# rhtmlDonut

R htmlwidget package for creating a detailed donut plot

## Installation

To install from GitHub:
```
require(devtools)
install_github("Displayr/rhtmlDonut", dependencies = NA)
```

If you have not set up a GitHub Personal Access Token, you will likely need to do so to avoid 
GitHub rate limits, which will manifest as 403 errors when downloading packages via
`install_github`. Please see the documentation in the `usethis` package or see the 
instructions [here](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token) and [here](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token).

If you are using Windows, you will need to have a version of Rtools installed that matches your
version of R in order to build packages from source. Rtools can be downloaded from
[here](https://cran.r-project.org/bin/windows/Rtools/).

Specifying `dependencies = NA` in `install_github` will not install packages listed
in `Suggests` in the `DESCRIPTION` file (some of which may be proprietary and unavailable for download).

## Development

The JS toolchain comes from [rhtmlBuildUtils](https://github.com/Displayr/rhtmlBuildUtils), invoked
through the `rhtml` binary it installs. There is no gulpfile.

```sh
npm install
npm start          # internal dev server, browse the test plans and examples
npm run lint
npm run build      # compiles browser/, inst/ and R/

npm test           # unit tests, then the full visual suite against local baselines
npm run localTest  # same thing
```

`npm test` runs two distinct suites:

* **Unit tests** — `rhtml testSpecs`, which runs the `*.jest.test.js` files under `theSrc/scripts`.
  Plain jest, no browser.
* **Visual regression tests** — `rhtml testVisual`, which builds the widget, serves it, drives
  puppeteer over the yaml test plans in `theSrc/test/snapshotTestDefinitions` plus the interaction
  tests in `theSrc/test/bin`, and compares each screenshot against a committed baseline.

Two helper scripts feed `theSrc/internal_www/test/computeLabelLineMaxAngleCoords.html`, which is a
manual debugging page for label line geometry rather than part of either suite:

```sh
npm run compileTestFixtures    # bundles the test fixtures into browser/js/
npm run copyTestDependencies   # copies d3 and lodash into browser/external/
```

## Updating visual test baselines

The `JS tests` workflow runs automatically on every push. Its `Visual regression tests` job compares
rendered output against the committed baselines in `theSrc/test/snapshots/ci/master` (CI always
compares against `master`'s baselines, whatever branch it is running on). The pixel threshold is
0.0001%, so any intended change to rendering, layout or label placement will turn the job red and the
baselines have to be regenerated. A missing baseline also fails, rather than being silently accepted.

Baselines are environment specific — locally generated snapshots (`npm run localTest`, which writes
to `theSrc/test/snapshots/local/<branch>`) will not match CI's fonts and Chromium build, so do not
copy them into `theSrc/test/snapshots/ci`. Regenerate through CI instead:

1. **Inspect the failure first.** Download the `snapshot-diffs` artifact from the failed run and check
   the `__diff_output__` images. Only regenerate once you are satisfied every diff is intended.
2. **Dispatch a regeneration run.** Actions → `JS tests` → *Run workflow*, select your branch, and
   tick `update_snapshots`. Optionally set `test_filter` (passed to `jest -t`) to regenerate only the
   tests matching a name pattern; leave it blank to regenerate all of them.
3. **Download the `regenerated-baselines` artifact** from that run. Its contents are rooted at
   `master/`, so extract it into `theSrc/test/snapshots/ci/` — not over the repository root.
4. **Review, commit and push the changed snapshots yourself.** Use `git status` / `git diff --stat` to
   confirm only the snapshots you expected have changed.

Steps 2 and 3 can be done from the command line with the [GitHub CLI](https://cli.github.com/)
instead of the Actions UI:

```sh
# Dispatch a regeneration run on the current branch (add -f test_filter=<pattern> to narrow it)
gh workflow run "JS tests" --ref "$(git rev-parse --abbrev-ref HEAD)" -f update_snapshots=true

# Get the run id, then follow it to completion
gh run list --workflow "JS tests" --event workflow_dispatch --limit 1
gh run watch <run-id>

# Extract the baselines straight into place -- the artifact is rooted at master/
gh run download <run-id> -n regenerated-baselines -D theSrc/test/snapshots/ci

# And the diffs from a failed comparison run, if you want them on disk
gh run download <run-id> -n snapshot-diffs -D .tmp/diffs
```

### The load animation and `rhtmlwidget-status=ready`

Worth knowing before you read a diff in the interaction tests, because it produced two different
symptoms that looked unrelated.

`PieWrapper.draw()` used to set `rhtmlwidget-status=ready` synchronously, immediately after `_draw()`
had *scheduled* the load transition. The segments grow from zero over `effects.load.speed` (1000ms by
default) and the labels then fade in over a further 400ms, so ready was announced about 1.4 seconds
before the widget stopped moving. Measured per animation frame: ready at t+1089ms, geometry still
changing until t+2101ms.

Everything that waits on that attribute was therefore looking at a donut mid-animation — the visual
suite's `waitForWidgetToLoad`, and any consumer that screenshots on ready, which includes Displayr's
export path. Two consequences showed up in the baselines:

* **Snapshots caught the segments part-grown.** Measuring the 49.3% group wedge in
  `a1_hover_over_segment_10`, which should subtend 177.5 degrees: 176.1 with the animation settled,
  but 171.3 in the CI baseline and 166.0 in the December 2021 travis one. Both CI runs screenshotted
  early, just by different amounts.
* **The first hover of each test could miss.** `hover()` picks its target from geometry that is still
  growing, and the browser does not re-fire mouseover for a stationary cursor when elements move
  underneath it. Every snapshot that was unstable — `a1`, `b1`, `c1a`, `c1b`, `c1c`, `d1` — is the
  first hover after a page load; every second-or-later hover was stable.

`draw()` now defers the ready attribute until the whole load animation has finished, and
`theSrc/test/bin/readyAfterAnimation.jest.test.js` asserts that nothing is still moving when ready is
announced. `totalLoadAnimationDuration()` in the segment labeller's `draw.js` is the single definition
of how long that takes; a redraw does not animate and clears the previous elements first, so resize
still becomes ready immediately.

### Known issue: b1 hovers the label, not the segment

`b1_hover_over_group_segment_0_no_tooltip` is NOT fixed by the above, and its baseline shows the
segment unhighlighted where the 2021 one shows it highlighted.

`page.hover()` aims at the centre of the element's box. For `donut-0gsegment0` at 190x190 that point
is covered by its own group label — `elementFromPoint` there returns the `tspan` reading `0 - 5:`,
whose `pointer-events` is `auto`, so the text swallows the event and the segment never sees it. The
nearest point that does hit the segment is 7px away, which is well inside the margin that changing
font metrics move a label by, so the 2021 run landing on bare segment and the current one landing on
a glyph is the expected outcome of the same test on two different font stacks.

That is arguably a widget bug rather than a test one: a user hovering the middle of a segment, over
its own label, gets no highlight either. Giving the segment labels `pointer-events: none` would fix
both, but it changes widget behaviour and rebaselines snapshots, so it is deliberately left alone
here.

CI deliberately does not commit the baselines for you. A push made with the default `GITHUB_TOKEN`
does not trigger any workflow, and `workflow_dispatch` check runs are excluded from a pull request's
status rollup — so a bot-authored head commit would leave the PR reporting no checks. Pushing the
snapshots yourself produces the full set of checks on the PR.

## Submitting a bug report

If you encounter a problem using the package, please open an [issue](https://github.com/Displayr/rhtmlDonut/issues). To achieve a resolution as quickly as possible, please include a minimal, reproducible example of the bug, along with the exact error message or output you receive and the behavior you expect. Including the output of `sessionInfo()` in R can be helpful to reproduce the issue. Please see this [FAQ](https://community.rstudio.com/t/faq-whats-a-reproducible-example-reprex-and-how-do-i-create-one/5219), which has a number of useful tips on creating great reproducible examples. 

[![Displayr logo](https://mwmclean.github.io/img/logo-header.png)](https://www.displayr.com)
