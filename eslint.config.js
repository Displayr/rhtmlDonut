// Replaces .eslintrc, which eslint 10 no longer reads at all.
//
// Most of the configuration comes from rhtmlBuildUtils so it stays consistent across the widget repos.
// The block after it carries over the local rules that were in .eslintrc, so this migration changes
// which config FORMAT is used without changing which code passes.
const base = require('rhtmlBuildUtils/eslint.config.base')

module.exports = [
  ...base,

  {
    rules: {
      // NB carried over from the old .eslintrc "rules" block. `indent` and `comma-dangle` are
      // formatting rules that eslint 10 moved into @stylistic, so they need the prefix now --
      // configuring the unprefixed name would silently do nothing.
      //
      // comma-dangle is the one that matters: the shared config says `never` and this repo has always
      // said `always-multiline`, so dropping it reports an error on ~300 otherwise fine lines.
      '@stylistic/indent': 'off',
      '@stylistic/comma-dangle': ['error', 'always-multiline'],
      'prefer-promise-reject-errors': 'off',

      // NB not in the old .eslintrc because it did not exist then: @stylistic split the continuation
      // indent of a wrapped binary expression out of `indent` into its own rule. This repo switched
      // `indent` off, so leaving its offshoot on would check exactly the thing that was deliberately
      // not being checked.
      '@stylistic/indent-binary-ops': 'off',
    },
  },
]
