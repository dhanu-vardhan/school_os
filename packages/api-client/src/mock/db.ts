import { makeDemoData, type DemoData } from '@schoolos/shared'

let db: DemoData = makeDemoData()

export function getDb(): DemoData { return db }
export function resetDb() { db = makeDemoData() }
export function mutateDb(fn: (draft: DemoData) => void): DemoData {
  const draft = structuredClone(db)
  fn(draft)
  db = draft
  return db
}

export function matchId(path: string, prefix: string): string | null {
  if (!path.startsWith(prefix)) return null
  const rest = path.slice(prefix.length).replace(/^\//, '')
  return rest && !rest.includes('/') ? rest : null
}

export function bodyOf(init: RequestInit): Record<string, any> {
  try { return typeof init.body === 'string' ? JSON.parse(init.body) : {} } catch { return {} }
}
