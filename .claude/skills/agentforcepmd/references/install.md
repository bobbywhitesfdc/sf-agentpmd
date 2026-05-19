# Install

There are two install paths depending on the plugin's distribution
state. As of the date this skill was last updated (2026-05-19), the
plugin is **not yet published to npm**, so the from-source path is the
only one that works today.

## Path A — From source (today, pre-publication)

The plugin lives at `~/projects/AgentForcePMD/` (or wherever the user
cloned it). To install it into the `sf` CLI:

```bash
cd ~/projects/AgentForcePMD
npm install
npm run build
sf plugins link "$(pwd)"
```

The link survives across `sf` invocations. You only need to rebuild
(`npm run build`) when source under `src/` changes; the link itself
remains. See [`upgrade.md`](upgrade.md) for the refresh dance.

### Verify the install

```bash
sf plugins                    # should list 'sf-agentpmd  X.Y.Z (link)'
sf agentpmd analyze --help    # should render the flag reference
```

`sf` will emit a one-time warning per process the first time you
invoke a linked ESM plugin:

> Warning: sf-agentpmd is a linked ESM module and cannot be
> auto-transpiled. Existing compiled source will be used instead.

This is benign. It's telling you `sf` is reading `lib/` (the build
output), not running TypeScript directly. Just remember to
`npm run build` after `src/` edits.

### Where the linked plugin lives

`sf plugins link` records the absolute path under
`~/.local/share/sf/client/<version>/`. Inspecting:

```bash
sf plugins --core      # nothing — not a core plugin
sf plugins             # sf-agentpmd appears here under its link path
```

## Path B — From npm (future, post-publication)

When the plugin is published to the npm registry, the standard SF CLI
install path applies:

```bash
sf plugins install sf-agentpmd
# or, if published under a scope:
sf plugins install @bobbywhitesfdc/sf-agentpmd
```

Verify the same way:

```bash
sf plugins                    # should list 'sf-agentpmd  X.Y.Z'
sf agentpmd analyze --help
```

No build step, no link. Plain npm install under the hood.

## Prerequisites

- **Node.js ≥ 20** (the plugin declares `"engines": { "node": ">=20" }`).
- **`sf` CLI v2.131+** (older versions don't load linked ESM plugins
  reliably).
- **`@apexdevtools/apex-parser` runtime deps** — auto-installed by `npm
  install`. Includes `antlr4` as a peer.

## Uninstall

```bash
sf plugins unlink sf-agentpmd       # Path A — removes the link, source repo untouched
sf plugins uninstall sf-agentpmd    # Path B — removes the npm-installed copy
```

## Common install issues

| Symptom | Cause | Fix |
| --- | --- | --- |
| `Command sf agentpmd not found` after link | `npm run build` not run, so `lib/` is empty / stale | `cd ~/projects/AgentForcePMD && npm run build` |
| `Cannot find module '@agentscript/parser-javascript'` | Vendored deps missing — `vendor/` wasn't installed | `cd ~/projects/AgentForcePMD && npm install` (the `file:./vendor/...` deps re-symlink) |
| `sf plugins link` reports "linked" but command absent | sf CLI cache | `rm -rf ~/.local/share/sf/client/*/node_modules/.cache 2>/dev/null && sf plugins link "$(pwd)"` |
| Warning about ESM transpilation | Expected — see above | Ignore. |
