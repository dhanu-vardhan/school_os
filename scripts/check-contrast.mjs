#!/usr/bin/env node
/**
 * WCAG contrast check for the SchoolOS semantic/component token layers.
 * Parses CSS custom properties directly from packages/ui/src/styles.css so the
 * check cannot drift from the shipped tokens. No new dependency required.
 *
 * Usage: node scripts/check-contrast.mjs
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const css = readFileSync(resolve(root, 'packages/ui/src/styles.css'), 'utf8')

const blocks = new Map()
for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  const selector = match[1].trim().replace(/\/\*[\s\S]*?\*\//g, '').trim()
  if (!selector) continue
  // Keep the first declaration block; later duplicates are @media overrides.
  if (!blocks.has(selector)) blocks.set(selector, match[2])
}

function declarations(selectors) {
  const map = new Map()
  for (const selector of selectors) {
    const body = blocks.get(selector)?.replace(/\/\*[\s\S]*?\*\//g, '')
    if (!body) continue
    for (const line of body.split(';')) {
      const index = line.indexOf(':')
      if (index === -1) continue
      const key = line.slice(0, index).trim()
      const value = line.slice(index + 1).trim()
      if (key.startsWith('--')) map.set(key, value)
    }
  }
  return map
}

const rootTokens = declarations([':root'])
const darkTokens = declarations([':root', '.dark'])
const hcTokens = declarations([':root', 'html.ui-high-contrast'])
const darkHcTokens = declarations([':root', '.dark', 'html.ui-high-contrast', 'html.dark.ui-high-contrast'])

function resolveToken(map, name, seen = new Set()) {
  if (seen.has(name)) throw new Error(`Cyclic token reference: ${name}`)
  seen.add(name)
  const value = map.get(name)
  if (!value) throw new Error(`Missing token: ${name}`)
  const match = value.match(/^var\((--[\w-]+)\)$/)
  if (match) return resolveToken(map, match[1], seen)
  const triplet = value.match(/^(\d+)\s+(\d+)\s+(\d+)/)
  if (!triplet) throw new Error(`Token ${name} is not an RGB triplet: ${value}`)
  return triplet.slice(1).map(Number)
}

function luminance([r, g, b]) {
  const channel = (value) => {
    const c = value / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function ratio(a, b) {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

const pairs = [
  ['body text', '--text', '--app-bg', 4.5],
  ['muted text', '--text-muted', '--surface', 4.5],
  ['subtle text', '--text-subtle', '--surface', 4.5],
  ['primary action', '--action-primary-fg', '--action-primary-bg', 4.5],
  ['secondary action', '--action-secondary-fg', '--action-secondary-bg', 4.5],
  ['danger action', '--action-danger-fg', '--action-danger-bg', 4.5],
  ['ai action', '--action-ai-fg', '--action-ai-bg', 4.5],
  ['status brand', '--status-brand-fg', '--surface', 4.5],
  ['status success', '--status-success-fg', '--surface', 4.5],
  ['status warning', '--status-warning-fg', '--surface', 4.5],
  ['status danger', '--status-danger-fg', '--surface', 4.5],
  ['status info', '--status-info-fg', '--surface', 4.5],
  ['control boundary', '--control-border', '--surface', 3],
]

const modes = [
  ['light', rootTokens],
  ['dark', darkTokens],
  ['high-contrast', hcTokens],
  ['dark high-contrast', darkHcTokens],
]

let failures = 0
for (const [mode, tokens] of modes) {
  console.log(`\n${mode}`)
  for (const [label, fg, bg, minimum] of pairs) {
    const result = ratio(resolveToken(tokens, fg), resolveToken(tokens, bg))
    const ok = result >= minimum
    if (!ok) failures += 1
    console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label.padEnd(18)} ${result.toFixed(2)}:1 (min ${minimum}:1)`)
  }
}

if (failures) {
  console.error(`\n${failures} contrast pair(s) below target.`)
  process.exit(1)
}
console.log('\nAll token contrast pairs pass WCAG AA targets.')
