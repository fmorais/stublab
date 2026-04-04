import { useFieldArray, useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { matchingRuleSchema } from '@web/schemas/matching-rule'
import type { MatchingRuleFormValues } from '@web/schemas/matching-rule'
import type { CreateEndpointInput, UpdateEndpointInput } from '@web/types/endpoint'
import { Button } from '@web/components/ui/button'
import { Input } from '@web/components/ui/input'
import { Label } from '@web/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@web/components/ui/select'
import { MatchingRulesSection } from '@web/components/matching-rules-section'
import { MatchingRulePreview } from '@web/components/matching-rule-preview'
import { JsonEditor } from '@web/components/json-editor'
import { isValidJson } from '@web/lib/json-utils'

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(200),
  method: z.enum(HTTP_METHODS, { required_error: 'Método é obrigatório' }),
  path: z.string().min(1, 'Path é obrigatório').regex(/^\//, 'Path deve começar com /'),
  responseStatus: z.coerce
    .number({ invalid_type_error: 'Status deve ser um número' })
    .int()
    .min(100, 'Status mínimo é 100')
    .max(599, 'Status máximo é 599'),
  responseBody: z
    .string()
    .refine(isValidJson, { message: 'JSON inválido' })
    .default('{}'),
  delay: z.coerce
    .number({ invalid_type_error: 'Delay deve ser um número' })
    .int()
    .min(0, 'Delay mínimo é 0')
    .max(30000, 'Delay máximo é 30000 ms')
    .optional()
    .default(0),
  matchingRules: z.array(matchingRuleSchema).max(20).optional().default([]),
})

type FormValues = z.infer<typeof formSchema>

interface EndpointFormDefaultValues {
  name?: string
  method?: typeof HTTP_METHODS[number]
  path?: string
  responseStatus?: number
  responseBody?: string
  delay?: number
  matchingRules?: Array<{
    source: MatchingRuleFormValues['source']
    field: string
    operator: MatchingRuleFormValues['operator']
    value?: string | null
  }>
}

interface EndpointFormProps {
  defaultValues?: EndpointFormDefaultValues
  onSubmit: (data: CreateEndpointInput | UpdateEndpointInput) => void
  onCancel?: () => void
  isPending?: boolean
  isLoading?: boolean   // alias para isPending (compatibilidade spec-001)
  isError?: boolean
  error?: string | null // alias para errorMessage (compatibilidade spec-001)
  errorMessage?: string
  submitLabel?: string
}

export function EndpointForm({
  defaultValues,
  onSubmit,
  onCancel,
  isPending = false,
  isLoading = false,
  isError = false,
  error,
  errorMessage,
  submitLabel = 'Salvar endpoint',
}: EndpointFormProps) {
  const pending = isPending || isLoading
  const displayError = errorMessage ?? (error ?? undefined)
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      method: defaultValues?.method ?? 'GET',
      path: defaultValues?.path ?? '/',
      responseStatus: defaultValues?.responseStatus ?? 200,
      responseBody: defaultValues?.responseBody ?? '{}',
      delay: defaultValues?.delay ?? 0,
      matchingRules: defaultValues?.matchingRules?.map((r) => ({
        source: r.source,
        field: r.field,
        operator: r.operator,
        value: r.value ?? '',
      })) ?? [],
    },
  })

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: 'matchingRules',
  })

  const watchedMethod = watch('method')
  const watchedPath = watch('path')
  const watchedRules = watch('matchingRules') ?? []

  function handleFormSubmit(data: FormValues) {
    const payload: CreateEndpointInput = {
      name: data.name,
      method: data.method,
      path: data.path,
      responseStatus: data.responseStatus,
      responseBody: data.responseBody,
      delay: data.delay,
      matchingRules: data.matchingRules?.map((r) => ({
        source: r.source,
        field: r.field,
        operator: r.operator,
        value: r.value ?? null,
      })),
    }
    onSubmit(payload)
  }

  function handleRuleAdd() {
    append({ source: 'query', field: '', operator: 'eq', value: '' })
  }

  function handleRuleRemove(index: number) {
    remove(index)
  }

  function handleRuleUpdate(index: number, rule: MatchingRuleFormValues) {
    update(index, rule)
  }

  // Erros das regras indexados por posição
  const rulesErrors: Record<number, {
    source?: string
    field?: string
    operator?: string
    value?: string
  }> = {}

  if (errors.matchingRules && Array.isArray(errors.matchingRules)) {
    errors.matchingRules.forEach((ruleError, index) => {
      if (ruleError) {
        rulesErrors[index] = {
          source: ruleError.source?.message,
          field: ruleError.field?.message,
          operator: ruleError.operator?.message,
          value: ruleError.value?.message,
        }
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {(isError || displayError) && displayError && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {displayError}
        </div>
      )}

      {/* Nome */}
      <div className="space-y-1.5">
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          placeholder="Ex: Listar usuários"
          aria-invalid={!!errors.name}
          {...register('name')}
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* Método + Path */}
      <div className="flex gap-3">
        <div className="space-y-1.5 w-36">
          <Label htmlFor="method">Método</Label>
          <Select
            value={watchedMethod}
            onValueChange={(val) =>
              setValue('method', val as typeof HTTP_METHODS[number], { shouldValidate: true })
            }
          >
            <SelectTrigger id="method" aria-invalid={!!errors.method}>
              <SelectValue placeholder="Método" />
            </SelectTrigger>
            <SelectContent>
              {HTTP_METHODS.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.method && (
            <p className="text-xs text-destructive">{errors.method.message}</p>
          )}
        </div>

        <div className="space-y-1.5 flex-1">
          <Label htmlFor="path">Path</Label>
          <Input
            id="path"
            placeholder="/api/users/:id"
            aria-invalid={!!errors.path}
            {...register('path')}
          />
          {errors.path && (
            <p className="text-xs text-destructive">{errors.path.message}</p>
          )}
        </div>
      </div>

      {/* Seção Response */}
      <div className="space-y-4">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Response
        </p>

        {/* Status + Delay */}
        <div className="flex gap-3">
          <div className="space-y-1.5 w-28">
            <Label htmlFor="responseStatus">Status HTTP</Label>
            <Input
              id="responseStatus"
              type="number"
              placeholder="200"
              aria-invalid={!!errors.responseStatus}
              {...register('responseStatus')}
            />
            {errors.responseStatus && (
              <p className="text-xs text-destructive">{errors.responseStatus.message}</p>
            )}
          </div>

          <div className="space-y-1.5 w-36">
            <Label htmlFor="delay">Delay (ms)</Label>
            <Input
              id="delay"
              type="number"
              placeholder="0"
              aria-invalid={!!errors.delay}
              {...register('delay')}
            />
            {errors.delay && (
              <p className="text-xs text-destructive">{errors.delay.message}</p>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="space-y-1.5">
          <Label htmlFor="responseBody">Body (JSON)</Label>
          <Controller
            control={control}
            name="responseBody"
            render={({ field }) => (
              <JsonEditor
                value={field.value ?? '{}'}
                onChange={field.onChange}
                placeholder='{"status": "ok"}'
                hasError={!!errors.responseBody}
              />
            )}
          />
          {errors.responseBody && (
            <p className="text-xs text-destructive">{errors.responseBody.message}</p>
          )}
        </div>
      </div>

      {/* Seção Regras de Matching */}
      <div className="space-y-3">
        <MatchingRulesSection
          rules={watchedRules}
          onAdd={handleRuleAdd}
          onRemove={handleRuleRemove}
          onUpdate={handleRuleUpdate}
          errors={rulesErrors}
        />

        {watchedRules.length > 0 && (
          <MatchingRulePreview
            method={watchedMethod ?? 'GET'}
            path={watchedPath ?? '/'}
            rules={watchedRules}
          />
        )}
      </div>

      {/* Ações */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? 'Salvando...' : submitLabel}
        </Button>
      </div>
    </form>
  )
}

export type { EndpointFormDefaultValues }
