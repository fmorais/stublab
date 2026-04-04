import { z } from 'zod'

export const exportedEndpointSchema = z.object({
  name: z.string().min(1).max(100),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  path: z.string().min(1).startsWith('/'),
  active: z.boolean().default(true),
  responseStatus: z.number().int().min(100).max(599),
  responseBody: z.string().default('{}'),
  responseHeaders: z.record(z.string()).default({}),
  delay: z.number().int().min(0).max(30000).default(0),
  matchingRules: z.array(z.object({
    source: z.enum(['query', 'header', 'body']),
    field: z.string().min(1),
    operator: z.enum(['eq', 'neq', 'contains', 'exists', 'not_exists']),
    value: z.string().nullable().optional(),
  })).default([]),
})

export const exportFileSchema = z.object({
  version: z.string(),
  exportedAt: z.string(),
  exportedBy: z.string(),
  count: z.number().int().min(0),
  endpoints: z.array(exportedEndpointSchema).max(1000),
})

// Por que: o schema de preview usa endpoints: z.array(z.unknown()) intencionalmente.
// A validação individual de cada endpoint é feita no service (previewImport), que
// retorna status 'invalid' por item. Se o schema estrito fosse usado aqui, endpoints
// com campos inválidos rejeitariam toda a requisição antes de chegar ao service.
export const looseExportFileSchema = z.object({
  version: z.string(),
  exportedAt: z.string(),
  exportedBy: z.string(),
  count: z.number().int().min(0),
  endpoints: z.array(z.unknown()).max(1000),
})

export type LooseExportFile = z.infer<typeof looseExportFileSchema>

export const importPreviewBodySchema = z.object({ data: looseExportFileSchema })

export const importBodySchema = z.object({
  data: exportFileSchema,
  strategy: z.enum(['skip', 'overwrite', 'duplicate']),
})

export type ExportedEndpoint = z.infer<typeof exportedEndpointSchema>
export type ExportFile = z.infer<typeof exportFileSchema>
export type ImportStrategy = z.infer<typeof importBodySchema>['strategy']
