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

### Known flake: three tooltip snapshots

`c1a_segment_tooltip_wrapping_default_settings`, `c1c_segment_tooltip_styling` and
`d1_segment_autocolor` fail intermittently on CI, a different subset each run. Two runs of the
identical commit failed on `{c1a, c1c, d1}` and `{c1c, d1}` respectively. The diff is 2-4% of pixels
and the visible symptom is the tooltip's background rect missing behind text that is otherwise
correct and correctly positioned.

It is not a regression from the 9.0.0 migration and it does not reproduce locally (three consecutive
comparison runs on Windows were clean), so it needs instrumenting on a runner rather than on a dev
machine. The tooltip rect gets its width and height from `helpers.getDimensions()`, which is
`getBBox()` on the tooltip group with a silent `{w: 0, h: 0}` fallback, called during `draw()` — so a
group that measures as empty at draw time yields exactly this. That is the suspected mechanism, not a
confirmed one.

The thresholds are deliberately NOT loosened to paper over it: 2-4% is far more than antialiasing, and
a threshold wide enough to swallow it would stop these three tests detecting anything real. So a red
`Visual regression tests` job naming only these three is the known flake; check the failing names
against this list before assuming a regression.

CI deliberately does not commit the baselines for you. A push made with the default `GITHUB_TOKEN`
does not trigger any workflow, and `workflow_dispatch` check runs are excluded from a pull request's
status rollup — so a bot-authored head commit would leave the PR reporting no checks. Pushing the
snapshots yourself produces the full set of checks on the PR.

## Submitting a bug report

If you encounter a problem using the package, please open an [issue](https://github.com/Displayr/rhtmlDonut/issues). To achieve a resolution as quickly as possible, please include a minimal, reproducible example of the bug, along with the exact error message or output you receive and the behavior you expect. Including the output of `sessionInfo()` in R can be helpful to reproduce the issue. Please see this [FAQ](https://community.rstudio.com/t/faq-whats-a-reproducible-example-reprex-and-how-do-i-create-one/5219), which has a number of useful tips on creating great reproducible examples. 

[![Displayr logo](https://mwmclean.github.io/img/logo-header.png)](https://www.displayr.com)
