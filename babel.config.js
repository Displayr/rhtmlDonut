// Used only by babel-jest when running the spec tests (`rhtml testSpecs`). The production bundle is
// built by esbuild, which does not read this file. Without it jest cannot parse the `import`
// statements that most of theSrc/scripts uses, so the labeller code was untestable in isolation.
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
  ],
}
