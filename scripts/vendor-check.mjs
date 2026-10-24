#!/usr/bin/env node
/**
 * vendor-check.mjs — compare vendored @agentscript/* versions against
 * a local checkout of salesforce/agentscript.
 *
 * Usage:
 *   node scripts/vendor-check.mjs
 *   AGENTSCRIPT_CHECKOUT=/path/to/agentscript node scripts/vendor-check.mjs
 *
 * Always exits 0. Stale vendor prints a warning; missing checkout prints
 * a notice. Called automatically by `prepack`.
 */
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = fileURLToPath(new URL('.', import.meta.url))
const root = resolve(here, '..')

const UPSTREAM_PACKAGES = [
  { name: '@agentscript/parser-javascript', upstreamPath: 'packages/parser-javascript', vendorDir: 'agentscript-parser-javascript' },
  { name: '@agentscript/types',             upstreamPath: 'packages/types',              vendorDir: 'agentscript-types'              },
]

function readVersion(pkgJsonPath) {
  if (!existsSync(pkgJsonPath)) {
    return null
  }

  try {
    return JSON.parse(readFileSync(pkgJsonPath, 'utf8')).version
  } catch {
    return null
  }
}

function resolveCheckout() {
  const env = process.env.AGENTSCRIPT_CHECKOUT
  if (env) return resolve(env.replace(/^~/, homedir()))
  return join(homedir(), 'projects', 'agentscript')
}

const checkoutDir = resolveCheckout()

console.log('\n── Vendored AgentScript parser check ───────────────────────')

if (existsSync(checkoutDir)) {
  let allCurrent = true

  for (const pkg of UPSTREAM_PACKAGES) {
    const vendorPkg   = join(root, 'vendor', pkg.vendorDir, 'package.json')
    const upstreamPkg = join(checkoutDir, pkg.upstreamPath, 'package.json')

    const vendored = readVersion(vendorPkg)
    const upstream = readVersion(upstreamPkg)

    if (!vendored) {
      console.log(`  ✗  ${pkg.name}: vendor package.json missing`)
      allCurrent = false
    } else if (!upstream) {
      console.log(`  ?  ${pkg.name}: upstream package.json not found at ${upstreamPkg}`)
    } else if (vendored === upstream) {
      console.log(`  ✓  ${pkg.name}: ${vendored} (current)`)
    } else {
      console.log(`  ⚠️  ${pkg.name}: vendored ${vendored} → upstream ${upstream}  ← UPDATE AVAILABLE`)
      allCurrent = false
    }
  }

  if (allCurrent) {
    console.log('  Vendor is up to date.\n')
  } else {
    console.log(`
  ┌─────────────────────────────────────────────────────────────┐
  │  VENDOR IS STALE — run \`npm run vendor:refresh\` before       │
  │  publishing. New parser versions may fix grammar bugs or      │
  │  add syntax that affects CC counting.                         │
  └─────────────────────────────────────────────────────────────┘
`)
  }
} else {
  console.log(`\n  ⚠️  Upstream checkout not found at: ${checkoutDir}`)
  console.log('  Cannot verify vendor is current.')
  console.log('  To enable this check:')
  console.log(`    git clone <salesforce/agentscript> ${checkoutDir}`)
  console.log('  or set AGENTSCRIPT_CHECKOUT=/path/to/your/checkout\n')
}
