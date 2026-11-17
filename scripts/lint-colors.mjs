#!/usr/bin/env node
/**
 * Raw-colour lint. Raw hex/rgb/hsl/oklch literals are allowed only in the
 * token definition file. `rgb(var(--token))` is token-based and allowed.
 *
 * Usage: node scripts/lint-colors.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const allowedTokenFiles = new Set(['packages/ui/src/styles.css'])
const roots = ['apps/web/src', 'packages/ui/src', 'packages/i18n/src', 'packages/api-client/src', 'packages/shared/src', 'packages/platform/src']
const extensions = /\.(ts|tsx|js|jsx|css)$/

const patterns = [
  { name: 'hex colour', re: /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g },
  { name: 'rgb/rgba literal', re: /rgba?\(\s*(?!var\()\d/g },
  { name: 'hsl/hsla literal', re: /hsla?\(\s*(?!var\()\d/g },
  { name: 'oklch literal', re: /oklch\(\s*(?!var\()\d/g },
  { name: 'named colour', re: /\b(?:white|black|transparent)\b/g },
]

function filesIn(directory) {
  const result = []
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry)
    if (statSync(path).isDirectory()) result.push(...filesIn(path))
    else if (extensions.test(entry)) result.push(path)
  }
  return result
}

const violations = []
for (const directory of roots) {
  for (const file of filesIn(resolve(root, directory))) {
    const relativePath = relative(root, file)
    if (allowedTokenFiles.has(relativePath)) continue
    const source = readFileSync(file, 'utf8')
    const lines = source.split('\n')
    for (const { name, re } of patterns) {
      lines.forEach((line, index) => {
        re.lastIndex = 0
        if (re.test(line)) violations.push(`${relativePath}:${index + 1} ${name}: ${line.trim()}`)
      })
    }
  }
}

if (violations.length) {
  console.error(`Raw colour lint failed (${violations.length}):`)
  for (const violation of violations) console.error(`  ${violation}`)
  process.exit(1)
}
console.log('Raw colour lint passed: no raw colour literals outside token files.')
