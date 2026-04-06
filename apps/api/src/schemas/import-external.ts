import { z } from 'zod'

export const importSourceSchema = z.enum(['stublab', 'postman', 'openapi'])
export type ImportSource = z.infer<typeof importSourceSchema>

export const externalImportPreviewBodySchema = z.object({
  source: importSourceSchema,
  data: z.unknown(),
})

export const fetchOpenApiBodySchema = z.object({
  url: z.string().url(),
})
