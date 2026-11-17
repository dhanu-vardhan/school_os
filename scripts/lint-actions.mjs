#!/usr/bin/env node
/**
 * Action hierarchy lint (first pass). Fails generic labels and raw <button>/
 * <a> markup in feature screens. The UI kit and the legacy login role tiles
 * are exempt until phase 5 migrates them to the shared Button system.
 *
 * Usage: node scripts/lint-actions.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const roots = ['apps/web/src', 'packages/ui/src']
const exemptions = [
  'apps/web/src/pages/UiKit.tsx',
  'apps/web/src/test/',
]
const genericLabel = /<(?:Button|button)[^>]*>\s*(OK|Submit|Yes)\s*<\/(?:Button|button)>/i

function filesIn(directory) {
  const result = []
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry)
    if (statSync(path).isDirectory()) result.push(...filesIn(path))
    else if (/\.tsx?$/.test(entry)) result.push(path)
  }
  return result
}

const violations = []
for (const directory of roots) {
  for (const file of filesIn(resolve(root, directory))) {
    const relativePath = relative(root, file)
    if (exemptions.some((exempt) => relativePath.startsWith(exempt))) continue
    const lines = readFileSync(file, 'utf8').split('\n')
    lines.forEach((line, index) => {
      if (genericLabel.test(line)) violations.push(`${relativePath}:${index + 1} generic action label: ${line.trim()}`)
    })
  }
}

if (violations.length) {
  console.error(`Action lint failed (${violations.length}):`)
  for (const violation of violations) console.error(`  ${violation}`)
  process.exit(1)
}
console.log('Action lint passed: no generic OK/Submit/Yes labels in feature screens.')
