import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { MatchingRuleFormValues } from '@web/schemas/matching-rule'
import { Button } from '@web/components/ui/button'
import { MatchingRuleRow } from '@web/components/matching-rule-row'

const MAX_RULES = 20

interface MatchingRulesSectionProps {
  rules: MatchingRuleFormValues[]
  onAdd: () => void
  onRemove: (index: number) => void
  onUpdate: (index: number, rule: MatchingRuleFormValues) => void
  errors?: Record<number, {
    source?: string
    field?: string
    operator?: string
    value?: string
  }>
}

export function MatchingRulesSection({ rules, onAdd, onRemove, onUpdate, errors }: MatchingRulesSectionProps) {
  const [open, setOpen] = useState(() => rules.length > 0)

  return (
    <div className="rounded-md border border-input">
      {/* Header clicável */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-accent transition-colors rounded-md"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          Regras de matching
          {rules.length > 0 && (
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
              {rules.length}
            </span>
          )}
        </span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Conteúdo expandido */}
      {open && (
        <div className="border-t border-input px-4 py-4 space-y-3">
          {rules.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhuma regra definida — este endpoint responderá como fallback.
            </p>
          )}

          {rules.map((rule, index) => (
            <MatchingRuleRow
              key={index}
              value={rule}
              onChange={(updated) => onUpdate(index, updated)}
              onRemove={() => onRemove(index)}
              errors={errors?.[index]}
            />
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAdd}
            disabled={rules.length >= MAX_RULES}
          >
            + Adicionar regra
          </Button>

          {rules.length >= MAX_RULES && (
            <p className="text-xs text-muted-foreground">
              Limite máximo de {MAX_RULES} regras atingido.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
