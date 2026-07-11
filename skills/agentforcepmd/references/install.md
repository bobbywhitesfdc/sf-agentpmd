# Install

## Standard install (npm — recommended)

```bash
sf plugins trust allowlist add -n sf-agentpmd
sf plugins install sf-agentpmd
```

The `trust allowlist` step is a one-time acknowledgement per machine. It tells
the SF CLI that `sf-agentpmd` is a trusted publisher outside the Salesforce-signed
core. Required before the first install; not needed on subsequent upgrades.

### Verify

```bash
sf plugins                    # should list 'sf-agentpmd  X.Y.Z'
sf agentpmd analyze --help    # should render the flag reference
```

### Install the Claude Code skill

```bash
sf agentpmd install-skill
```

Copies the bundled skill tree to `~/.claude/skills/agentforcepmd/`. Restart
Claude Code (or reload skills) to activate. The skill auto-triggers on mentions
of `sf agentpmd`, "AgentScript cyclomatic complexity", "Agent CC", and related
phrases.

## Contributor / local-dev install (from source)

For contributors or anyone who needs to build from source:

```bash
git clone https://github.com/bobbywhitesfdc/sf-agentpmd
cd sf-agentpmd
npm install
npm run build
sf plugins link "$(pwd)"
```

The link survives across `sf` invocations. Rebuild (`npm run build`) whenever
source under `src/` changes; the link itself remains. See
[`upgrade.md`](upgrade.md) for the refresh dance.

For live skill edits, symlink instead of copying:

```bash
ln -sfn "$(pwd)/skill" ~/.claude/skills/agentforcepmd
```

### ESM warning (linked installs only)

`sf` emits a one-time warning per process the first time you invoke a linked
ESM plugin:

> Warning: sf-agentpmd is a linked ESM module and cannot be auto-transpiled.
> Existing compiled source will be used instead.

Benign — `sf` is reading `lib/` (the build output), not running TypeScript
directly. Just remember to `npm run build` after `src/` edits.

## Prerequisites

- **Node.js ≥ 20** (declared in `"engines"` in `package.json`)
- **`sf` CLI v2.131+** (older versions don't load linked ESM plugins reliably)

## Uninstall

```bash
sf plugins uninstall sf-agentpmd    # npm install
sf plugins unlink sf-agentpmd       # linked source checkout (source repo untouched)
```

## Common install issues

| Symptom | Cause | Fix |
| --- | --- | --- |
| `Command sf agentpmd not found` after link | `npm run build` not run, so `lib/` is empty / stale | `npm run build` in the repo directory |
| `Cannot find module '@agentscript/parser-javascript'` | Vendored deps missing | `npm install` in the repo directory |
| `sf plugins link` reports "linked" but command absent | SF CLI cache | `sf plugins link "$(pwd)"` again after clearing `~/.local/share/sf/` cache |
| Warning about ESM transpilation | Expected for linked installs | Ignore |
