import { RULE_SOURCES, RULE_OPERATORS } from '@web/schemas/matching-rule'
import type { MatchingRuleFormValues } from '@web/schemas/matching-rule'
import { Button } from '@web/components/ui/button'
import { Input } from '@web/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@web/components/ui/select'

type RuleSource = typeof RULE_SOURCES[number]
type RuleOperator = typeof RULE_OPERATORS[number]

const SOURCE_LABELS: Record<RuleSource, string> = {
  query: 'Query',
  header: 'Header',
  body: 'Body',
}

const OPERATOR_LABELS: Record<RuleOperator, string> = {
  eq: 'é igual a',
  neq: 'é diferente de',
  contains: 'contém',
  exists: 'existe',
  not_exists: 'não existe',
}

const VALUELESS_OPERATORS: RuleOperator[] = ['exists', 'not_exists']

interface MatchingRuleRowProps {
  value: MatchingRuleFormValues
  onChange: (value: MatchingRuleFormValues) => void
  onRemove: () => void
  errors?: {
    source?: string
    field?: string
    operator?: string
    value?: string
  }
}

export function MatchingRuleRow({ value, onChange, onRemove, errors }: MatchingRuleRowProps) {
  const isValueDisabled = VALUELESS_OPERATORS.includes(value.operator as RuleOperator)

  function handleSourceChange(source: string) {
    onChange({ ...value, source: source as RuleSource })
  }

  function handleFieldChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange({ ...value, field: e.target.value })
  }

  function handleOperatorChange(operator: string) {
    const op = operator as RuleOperator
    const isValueless = VALUELESS_OPERATORS.includes(op)
    onChange({
      ...value,
      operator: op,
      value: isValueless ? null : value.value,
    })
  }

  function handleValueChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange({ ...value, value: e.target.value })
  }

  return (
    <div className="space-y-1">
      <div className="flex items-start gap-2">
        {/* Origem */}
        <div className="flex flex-col gap-1 w-28">
          <Select value={value.source} onValueChange={handleSourceChange}>
            <SelectTrigger aria-label="Origem">
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              {RULE_SOURCES.map((src) => (
                <SelectItem key={src} value={src}>
                  {SOURCE_LABELS[src]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors?.source && (
            <p className="text-xs text-destructive">{errors.source}</p>
          )}
        </div>

        {/* Campo */}
        <div className="flex flex-col gap-1 flex-1">
          <Input
            value={value.field}
            onChange={handleFieldChange}
            placeholder="campo (ex: status)"
            aria-label="Campo"
          />
          {errors?.field && (
            <p className="text-xs text-destructive">{errors.field}</p>
          )}
        </div>

        {/* Operador */}
        <div className="flex flex-col gap-1 w-40">
          <Select value={value.operator} onValueChange={handleOperatorChange}>
            <SelectTrigger aria-label="Operador">
              <SelectValue placeholder="Operador" />
            </SelectTrigger>
            <SelectContent>
              {RULE_OPERATORS.map((op) => (
                <SelectItem key={op} value={op}>
                  {OPERATOR_LABELS[op]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors?.operator && (
            <p className="text-xs text-destructive">{errors.operator}</p>
          )}
        </div>

        {/* Valor */}
        <div className="flex flex-col gap-1 flex-1">
          <Input
            value={isValueDisabled ? '' : (value.value ?? '')}
            onChange={handleValueChange}
            placeholder={isValueDisabled ? '—' : 'valor'}
            disabled={isValueDisabled}
            aria-label="Valor"
            aria-disabled={isValueDisabled}
          />
          {errors?.value && (
            <p className="text-xs text-destructive">{errors.value}</p>
          )}
        </div>

        {/* Botão remover */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          aria-label="Remover regra"
          className="mt-0 shrink-0 text-muted-foreground hover:text-destructive"
        >
          ✕
        </Button>
      </div>
    </div>
  )
}
