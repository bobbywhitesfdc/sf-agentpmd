#!/usr/bin/env node
/**
 * vendor-refresh.mjs — copy freshly-built dist/ from a local
 * salesforce/agentscript checkout into vendor/, then update VERSIONS.md.
 *
 * Prerequisites:
 *   git -C ~/projects/agentscript pull
 *   npm -C ~/projects/agentscript install
 *   npm -C ~/projects/agentscript run build
 *
 * Usage:
 *   node scripts/vendor-refresh.mjs
 *   AGENTSCRIPT_CHECKOUT=/path/to/agentscript node scripts/vendor-refresh.mjs
 */
import { existsSync, readFileSync } from 'node:fs'
import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = fileURLToPath(new URL('.', import.meta.url))
const root = resolve(here, '..')

const UPSTREAM_PACKAGES = [
  { name: '@agentscript/parser-javascript', upstreamPath: 'packages/parser-javascript', vendorDir: 'agentscript-parser-javascript' },
  { name: '@agentscript/types',             upstreamPath: 'packages/types',              vendorDir: 'agentscript-types'              },
]

function resolveCheckout() {
  const env = process.env.AGENTSCRIPT_CHECKOUT
  if (env) return resolve(env.replace(/^~/, homedir()))
  return join(homedir(), 'projects', 'agentscript')
}

function readVersion(pkgJsonPath) {
  if (!existsSync(pkgJsonPath)) return null
  return JSON.parse(readFileSync(pkgJsonPath, 'utf8')).version
}

async function copyDir(src, dest) {
  await mkdir(dest, { recursive: true })
  const entries = await readdir(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = join(src, entry.name)
    const destPath = join(dest, entry.name)
    await (entry.isDirectory() ? copyDir(srcPath, destPath) : copyFile(srcPath, destPath))
  }
}

const checkoutDir = resolveCheckout()

if (!existsSync(checkoutDir)) {
  throw new Error(
    `Upstream checkout not found at ${checkoutDir}.\n` +
    'Clone https://github.com/salesforce/agentscript there (or set AGENTSCRIPT_CHECKOUT) and run:\n' +
    '  npm -C <checkout> install && npm -C <checkout> run build',
  )
}

// Get upstream commit SHA for VERSIONS.md record.
let upstreamSha = '(unknown)'
try {
  const { execSync } = await import('node:child_process')
  upstreamSha = execSync('git rev-parse --short HEAD', { cwd: checkoutDir }).toString().trim()
} catch { /* leave as unknown */ }

const today = new Date().toISOString().slice(0, 10)
const rows = []

for (const pkg of UPSTREAM_PACKAGES) {
  const upstreamDist = join(checkoutDir, pkg.upstreamPath, 'dist')
  const upstreamPkg  = join(checkoutDir, pkg.upstreamPath, 'package.json')
  const vendorDir    = join(root, 'vendor', pkg.vendorDir)
  const vendorPkg    = join(vendorDir, 'package.json')

  if (!existsSync(upstreamDist)) {
    throw new Error(
      `dist not found at ${upstreamDist} — did you run build?\n` +
      `  npm -C ${checkoutDir} install && npm -C ${checkoutDir} run build`,
    )
  }

  const newVersion = JSON.parse(readFileSync(upstreamPkg, 'utf8')).version
  const oldVersion = readVersion(vendorPkg) ?? '(none)'

  await copyDir(upstreamDist, join(vendorDir, 'dist'))
  console.log(`  ✓  ${pkg.name}: ${oldVersion} → ${newVersion}`)
  rows.push(`| \`${pkg.name}\` | \`${newVersion}\` | \`${pkg.upstreamPath}\` |`)
}

// Rewrite VERSIONS.md with updated table + metadata.
const versionsPath = join(root, 'vendor', 'VERSIONS.md')
let content = await readFile(versionsPath, 'utf8')

content = content.replace(
  /(\| Package \| Vendored version \| Upstream path \|\n\| --- \| --- \| --- \|\n)[\s\S]*?(\n\n)/,
  `$1${rows.join('\n')}\n$2`,
)

content = content.replace(
  /\*\*Last checked:\*\* .*/,
  `**Last checked:** ${today} (upstream commit \`${upstreamSha}\`)`,
)

await writeFile(versionsPath, content)
console.log(`\n  vendor/VERSIONS.md updated (upstream @ ${upstreamSha})\n`)
