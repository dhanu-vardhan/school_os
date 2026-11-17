#!/usr/bin/env node
/**
 * Action system lint. Fails generic labels and ad-hoc action markup in feature
 * screens and shared UI components: every action must go through the shared
 * Button / IconButton primitive. Anchors rendered as children of
 * `<Button asChild>` are allowed, but a styled raw anchor is not.
 *
 * Usage: node scripts/lint-actions.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const roots = ['apps/web/src', 'packages/ui/src']
const exemptions = [
  'apps/web/src/pages/UiKit',
  'apps/web/src/test/',
]
const genericLabel = /<(?:Button|button)[^>]*>\s*(OK|Submit|Yes)\s*<\/(?:Button|button)>/i
/** Raw buttons are never allowed; raw anchors are allowed only as unstyled asChild children. */
const rawButton = /<button\b/
const styledAnchor = /<a\b[^>]*\bclassName\s*=/

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
    if (exemptions.some(exempt => relativePath.startsWith(exempt))) continue
    readFileSync(file, 'utf8').split('\n').forEach((line, index) => {
      const at = `${relativePath}:${index + 1}`
      if (genericLabel.test(line)) violations.push(`${at} generic action label: ${line.trim()}`)
      if (rawButton.test(line)) violations.push(`${at} raw <button>; use Button/IconButton: ${line.trim()}`)
      if (styledAnchor.test(line)) violations.push(`${at} styled <a>; wrap in Button asChild: ${line.trim()}`)
    })
  }
}

if (violations.length) {
  console.error(`Action lint failed (${violations.length}):`)
  for (const violation of violations) console.error(`  ${violation}`)
  process.exit(1)
}
console.log('Action lint passed: all actions use the shared Button system; no generic labels.')
