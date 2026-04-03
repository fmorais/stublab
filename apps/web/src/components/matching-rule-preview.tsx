import type { MatchingRuleFormValues } from '@web/schemas/matching-rule'

type RuleOperator = MatchingRuleFormValues['operator']

interface MatchingRulePreviewProps {
  method: string
  path: string
  rules: MatchingRuleFormValues[]
}

function formatRuleDescription(rule: MatchingRuleFormValues): string {
  const location = `${rule.source}.${rule.field}`
  const operator = rule.operator as RuleOperator

  switch (operator) {
    case 'eq':
      return `${location} = '${rule.value ?? ''}'`
    case 'neq':
      return `${location} ≠ '${rule.value ?? ''}'`
    case 'contains':
      return `${location} contém '${rule.value ?? ''}'`
    case 'exists':
      return `${location} existe`
    case 'not_exists':
      return `${location} não existe`
    default: {
      const _exhaustive: never = operator
      return _exhaustive
    }
  }
}

function buildPreviewText(
  method: string,
  path: string,
  rules: MatchingRuleFormValues[]
): string {
  const endpoint = `${method.toUpperCase()} ${path || '/'}`

  if (rules.length === 0) {
    return `${endpoint} — sem regras (fallback)`
  }

  const validRules = rules.filter((r) => r.field.trim() !== '')

  if (validRules.length === 0) {
    return `${endpoint} — sem regras (fallback)`
  }

  const descriptions = validRules.map(formatRuleDescription)
  return `${endpoint} quando ${descriptions.join(' E ')}`
}

export function MatchingRulePreview({ method, path, rules }: MatchingRulePreviewProps) {
  const previewText = buildPreviewText(method, path, rules)

  return (
    <div className="rounded-md bg-muted px-3 py-2">
      <p className="font-mono text-xs text-muted-foreground break-all">{previewText}</p>
    </div>
  )
}
