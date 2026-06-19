import * as esbuild from 'esbuild'

// We vendor the upstream @agentscript/* packages (not published to npm) under
// vendor/ and consume them as file: devDependencies. Shipping file: deps in a
// published package creates npm "link" nodes that crash `sf update`'s
// multi-package rebuild (npm arborist: "Cannot destructure property 'package'
// of 'node.target'"). To avoid that, we INLINE the vendored code (and its only
// runtime dep, tiny-invariant) into the emitted bundles, so the published
// package.json carries zero file: dependencies. Everything else stays a normal
// registry dependency and is left external.
const external = [
  '@oclif/core',
  '@oclif/plugin-help',
  '@salesforce/sf-plugins-core',
  '@apexdevtools/apex-parser',
  'antlr4',
  'picocolors',
]

await esbuild.build({
  bundle: true,
  entryPoints: [
    'src/index.ts',
    'src/commands/agentpmd/analyze.ts',
    'src/commands/agentpmd/install-skill.ts',
  ],
  // @agentscript/* and tiny-invariant are intentionally NOT external — they
  // get inlined. node: builtins are external automatically on platform:node.
  external,
  format: 'esm',
  outbase: 'src',
  outdir: 'dist',
  platform: 'node',
  sourcemap: true,
  target: 'node18',
})
