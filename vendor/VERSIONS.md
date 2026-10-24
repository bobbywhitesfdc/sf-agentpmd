# Vendored AgentScript parser — version pins

These packages are not published to npm. They are hand-copied from the
[`salesforce/agentscript`](https://github.com/salesforce/agentscript) monorepo
and inlined into the published bundle by `esbuild.config.mjs`.

| Package | Vendored version | Upstream path |
| --- | --- | --- |
| `@agentscript/parser-javascript` | `3.4.2` | `packages/parser-javascript` |
| `@agentscript/types` | `0.6.0` | `packages/types` |


**Last checked:** 2026-10-24 (upstream commit `ace15eb`)

## Checking for updates

The check script compares vendor versions against a local checkout of the
upstream repo. Point it at your checkout via the `AGENTSCRIPT_CHECKOUT`
env var, or drop the checkout at `~/projects/agentscript`:

```
git clone https://github.com/salesforce/agentscript ~/projects/agentscript  # first time
git -C ~/projects/agentscript pull
npm run vendor:check
```

Running `npm publish` (or `npm pack`) calls `prepublishOnly`, which runs
`vendor:check` automatically. A stale vendor prints a prominent warning
but does not block the publish — the check is advisory, not a hard gate.
If the upstream has a newer version, refresh before publishing:

```
npm run vendor:refresh
```

## Refreshing the vendor

`vendor:refresh` builds the upstream packages and copies their `dist/`
output here. It requires the checkout to be present and built:

```
git -C ~/projects/agentscript pull
npm -C ~/projects/agentscript install
npm -C ~/projects/agentscript run build
npm run vendor:refresh   # copies dist/, updates VERSIONS.md
```

## Why we vendor instead of using a git dependency

Shipping a `file:` or `git:` dependency in the published `package.json`
crashes `sf plugins update` (npm arborist fails reconstructing the link
node during a multi-package install — observed in 0.1.0). The vendor
approach (copy compiled `dist/`, inline via esbuild) avoids the arborist
bug while keeping zero runtime dependency on the upstream source.
