import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const endpoints = sqliteTable('endpoints', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  method: text('method').notNull(),
  path: text('path').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  responseStatus: integer('response_status').notNull(),
  responseBody: text('response_body').notNull().default('{}'),
  responseHeaders: text('response_headers', { mode: 'json' }).notNull().default('{}'),
  delay: integer('delay').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  // Por que: garante unicidade de method+path apenas entre endpoints ativos,
  // permitindo múltiplos inativos com a mesma combinação.
  uniqueIndex('idx_endpoints_method_path_active')
    .on(table.method, table.path)
    .where(sql`${table.active} = 1`),
])

// Por que: limite de 20 regras por endpoint é aplicado na camada de rota (Zod).
// Não há constraint no banco — a validação de negócio fica centralizada no código,
// facilitando ajuste futuro sem migration.
// Empate de score é resolvido por createdAt DESC (endpoint mais recente "sobrescreve" o antigo),
// permitindo reutilizar stubs sem deletar o original.
export const matchingRules = sqliteTable('matching_rules', {
  id: text('id').primaryKey(),
  endpointId: text('endpoint_id')
    .notNull()
    .references(() => endpoints.id, { onDelete: 'cascade' }),
  source: text('source').notNull(),    // 'query' | 'header' | 'body'
  field: text('field').notNull(),
  operator: text('operator').notNull(), // 'eq' | 'neq' | 'contains' | 'exists' | 'not_exists'
  value: text('value'),                 // null para exists/not_exists
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('idx_matching_rules_endpoint_id').on(table.endpointId),
])
