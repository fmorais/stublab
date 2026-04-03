import { z } from 'zod'

export const matchingRuleSchema = z
  .object({
    source: z.enum(['query', 'header', 'body']),
    field: z.string().min(1, 'Campo não pode ser vazio'),
    operator: z.enum(['eq', 'neq', 'contains', 'exists', 'not_exists']),
    value: z.string().nullable().optional(),
  })
  .refine(
    (r) => {
      const needsValue = !['exists', 'not_exists'].includes(r.operator)
      return !needsValue || (r.value !== null && r.value !== undefined && r.value.trim() !== '')
    },
    { message: 'Valor é obrigatório para operadores eq, neq e contains', path: ['value'] },
  )
