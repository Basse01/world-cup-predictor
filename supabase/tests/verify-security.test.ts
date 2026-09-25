// @vitest-environment node
// The live-database check script must pass on a fresh install of the
// migrations; otherwise either the migrations or the script are wrong.
import { readFileSync } from 'fs'
import { join } from 'path'
import { expect, it } from 'vitest'
import { createTestDb } from './harness'

it('verify_security.sql reports every check as ok on a fresh install', async () => {
  const db = await createTestDb()
  const sql = readFileSync(join(__dirname, '..', 'checks', 'verify_security.sql'), 'utf8')
  const { rows } = await db.query<{ check_name: string; ok: boolean }>(sql)
  expect(rows.length).toBeGreaterThan(15)
  expect(rows.filter(r => !r.ok).map(r => r.check_name)).toEqual([])
}, 60_000)
