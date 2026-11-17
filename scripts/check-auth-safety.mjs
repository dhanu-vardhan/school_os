#!/usr/bin/env node
/**
 * Static auth-safety checks that do not need a running stack.
 * Fails CI on the mistakes that are cheap to make and expensive to ship:
 *  - demo credentials committed or generated into tracked files
 *  - browser storage used for tokens/passwords
 *  - client code sending a tenant header
 *  - obvious hard-coded demo passwords
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = process.cwd()
const failures = []
const checked = []

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.gradle', 'reports', 'coverage',
  'playwright-report', 'test-results', '.demo', '.turbo', 'bin', 'obj',
])
const TEXT_EXT = /\.(?:[cm]?[jt]sx?|java|kt|kts|sql|ya?ml|json|md|sh|py|html|css)$/i

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue
    const path = join(dir, entry)
    const stat = statSync(path)
    if (stat.isDirectory()) walk(path, out)
    else if (TEXT_EXT.test(entry)) out.push(path)
  }
  return out
}

function read(path) {
  return readFileSync(path, 'utf8')
}

function fail(message) {
  failures.push(message)
}

// 1. Generated credentials must never be tracked.
try {
  const tracked = execFileSync('git', ['ls-files', '.demo'], { cwd: root, encoding: 'utf8' }).trim()
  if (tracked) fail(`generated demo credentials are tracked:\n${tracked}`)
  checked.push('git ls-files .demo')
} catch {
  // No git in a packaged build; skip this check.
}

const files = walk(root)
const browserStorage = /(?:localStorage|sessionStorage)\.setItem\s*\(\s*[^,]+,\s*[^)]*(?:token|jwt|access|refresh|password|secret)/i
const tenantHeader = /headers\.set\(\s*['"]X-School-Id['"]/i
const hardcodedDemo = /(?:demoPassword|demo_password)\s*[:=]\s*['"][^'"{]+['"]/i

for (const path of files) {
  const rel = relative(root, path)
  const text = read(path)

  if (browserStorage.test(text)) fail(`${rel}: token/password written to browser storage`)
  if (tenantHeader.test(text)) fail(`${rel}: client sends X-School-Id (tenant must come from the JWT)`)

  // The mock adapter may expose a per-process generated value, never a literal.
  if (hardcodedDemo.test(text) && !rel.includes('mock/adapter.ts')) {
    fail(`${rel}: hard-coded demo password literal`)
  }

  if (/\.env(?:\.|$)/.test(rel) && /^(?!.*example).*$/i.test(rel.split('/').pop() ?? '')) {
    if (/SESSION_SECRET\s*=\s*(?!schoolos-local-session-secret-change-me)/.test(text)) {
      // A non-placeholder secret in a tracked env file is suspicious.
      if (text.match(/SESSION_SECRET\s*=\s*\S{16,}/)) fail(`${rel}: possible real session secret committed`)
    }
  }
}

if (failures.length) {
  console.error('auth-safety: FAIL')
  for (const failure of failures) console.error(`  - ${failure}`)
  process.exit(1)
}

console.log(`auth-safety: PASS (${files.length} files, ${checked.length} repository checks)`)
