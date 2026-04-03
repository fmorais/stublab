import { z } from 'zod'

export const RULE_SOURCES = ['query', 'header', 'body'] as const
export const RULE_OPERATORS = ['eq', 'neq', 'contains', 'exists', 'not_exists'] as const

// Operadores que NÃO precisam de value
const VALUELESS_OPERATORS = ['exists', 'not_exists'] as const

export const matchingRuleSchema = z.object({
  source: z.enum(RULE_SOURCES, { required_error: 'Origem é obrigatória' }),
  field: z.string().min(1, 'Campo é obrigatório'),
  operator: z.enum(RULE_OPERATORS, { required_error: 'Operador é obrigatório' }),
  value: z.string().nullable().optional(),
}).superRefine((data, ctx) => {
  const needsValue = !VALUELESS_OPERATORS.includes(data.operator as typeof VALUELESS_OPERATORS[number])
  if (needsValue && (!data.value || data.value.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Valor é obrigatório para este operador',
      path: ['value'],
    })
  }
})

export const matchingRulesArraySchema = z.array(matchingRuleSchema).max(20, 'Máximo de 20 regras')

export type MatchingRuleFormValues = z.infer<typeof matchingRuleSchema>
