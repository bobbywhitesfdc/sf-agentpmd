# Upgrade

## Path A — From source (linked checkout)

When `sf-agentpmd` is installed via `sf plugins link <repo>`, upgrading
means pulling new commits and rebuilding `lib/`. The link itself does
not need to be re-established.

```bash
cd ~/projects/AgentForcePMD
git pull --ff-only
npm install                   # if dependencies changed
npm run build
```

That's it. The next `sf agentpmd analyze` invocation picks up the new
`lib/`. No `sf plugins link` re-run is needed because the link points
at the on-disk directory, not at a specific build.

If `npm install` reports dependency tree changes that don't match
`package-lock.json`, that's fine — it usually means upstream patched a
transitive. To enforce a clean install matching the lockfile:

```bash
npm ci                        # exact install per package-lock.json
npm run build
```

### When to also `npm install`

| Trigger | Action |
| --- | --- |
| Only `src/` changed | `npm run build` |
| `package.json` or `package-lock.json` changed | `npm install && npm run build` |
| `vendor/` changed (e.g. agentscript parser refresh) | `npm install && npm run build` |
| `tsconfig.json` changed | `npm run clean && npm run build` |

## Path B — From npm (published plugin)

```bash
sf plugins update                       # bumps every installed sf plugin
# or, to target this one:
sf plugins install sf-agentpmd@latest   # explicit
sf plugins install sf-agentpmd@0.3.1    # pin to a specific version
```

`sf plugins update` is idempotent and safe to run at any time. It
respects the version range declared at install (defaults to `latest`).

To check whether you're on the latest:

```bash
sf plugins                              # shows installed version
npm view sf-agentpmd version            # shows current published version
```

## Downgrade

```bash
# Path B: pin to an earlier version
sf plugins install sf-agentpmd@0.2.0

# Path A: git checkout the desired tag, then rebuild
cd ~/projects/AgentForcePMD
git checkout v0.2.0
npm install
npm run build
```

## Switching between linked source and published npm

To move from a linked checkout to the published version:

```bash
sf plugins unlink sf-agentpmd
sf plugins install sf-agentpmd
```

To move from the published version back to a linked checkout:

```bash
sf plugins uninstall sf-agentpmd
cd ~/projects/AgentForcePMD
sf plugins link "$(pwd)"
```

## Verifying the upgrade

Always sanity-check after upgrading:

```bash
sf agentpmd analyze --help              # confirm new flags / removed flags
sf agentpmd --version 2>/dev/null \
  || sf plugins | grep sf-agentpmd      # confirm version bump
```

If the plugin gained new commands, they appear under the `agentpmd`
topic. `sf agentpmd` (no subcommand) prompts to pick one.
