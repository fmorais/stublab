import { eq, inArray } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db/index.js'
import { matchingRules } from '../db/schema.js'
import type { MatchingRule, MatchingRuleInput } from '../types/endpoint.js'

function rowToRule(row: typeof matchingRules.$inferSelect): MatchingRule {
  return {
    id: row.id,
    endpointId: row.endpointId,
    source: row.source as MatchingRule['source'],
    field: row.field,
    operator: row.operator as MatchingRule['operator'],
    value: row.value ?? null,
    createdAt: row.createdAt,
  }
}

export const MatchingRuleService = {
  async createMany(endpointId: string, rules: MatchingRuleInput[]): Promise<MatchingRule[]> {
    if (rules.length === 0) return []
    const now = new Date().toISOString()
    const rows = rules.map((r) => ({
      id: uuidv4(),
      endpointId,
      source: r.source,
      field: r.field,
      operator: r.operator,
      value: r.value ?? null,
      createdAt: now,
    }))
    await db.insert(matchingRules).values(rows)
    return rows.map(rowToRule)
  },

  async deleteByEndpointId(endpointId: string): Promise<void> {
    await db.delete(matchingRules).where(eq(matchingRules.endpointId, endpointId))
  },

  async findByEndpointId(endpointId: string): Promise<MatchingRule[]> {
    const rows = await db
      .select()
      .from(matchingRules)
      .where(eq(matchingRules.endpointId, endpointId))
    return rows.map(rowToRule)
  },

  async findByEndpointIds(ids: string[]): Promise<Map<string, MatchingRule[]>> {
    if (ids.length === 0) return new Map()
    const rows = await db
      .select()
      .from(matchingRules)
      .where(inArray(matchingRules.endpointId, ids))
    const map = new Map<string, MatchingRule[]>()
    for (const row of rows) {
      const rule = rowToRule(row)
      const list = map.get(rule.endpointId) ?? []
      list.push(rule)
      map.set(rule.endpointId, list)
    }
    return map
  },
}
