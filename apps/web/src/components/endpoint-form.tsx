import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Endpoint, CreateEndpointInput, UpdateEndpointInput } from '@web/types/endpoint'

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Máximo 100 caracteres'),
  method: z.enum(HTTP_METHODS, { required_error: 'Método é obrigatório' }),
  path: z.string().min(1, 'Path é obrigatório').startsWith('/', 'Path deve começar com /'),
  responseStatus: z.coerce.number().int().min(100, 'Mínimo 100').max(599, 'Máximo 599'),
  responseBody: z.string().default('{}'),
  responseHeaders: z.string().default('{}'),
  delay: z.coerce
    .number()
    .int()
    .min(0, 'Mínimo 0ms')
    .max(30000, 'Máximo 30000ms')
    .default(0),
})

type FormValues = z.infer<typeof formSchema>

interface EndpointFormProps {
  defaultValues?: Partial<Endpoint>
  onSubmit: (data: CreateEndpointInput | UpdateEndpointInput) => void
  isLoading?: boolean
  error?: string | null
  submitLabel?: string
}

export function EndpointForm({
  defaultValues,
  onSubmit,
  isLoading,
  error,
  submitLabel = 'Salvar',
}: EndpointFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      method: defaultValues?.method ?? 'GET',
      path: defaultValues?.path ?? '/',
      responseStatus: defaultValues?.responseStatus ?? 200,
      responseBody: defaultValues?.responseBody ?? '{}',
      responseHeaders: defaultValues?.responseHeaders
        ? JSON.stringify(defaultValues.responseHeaders, null, 2)
        : '{}',
      delay: defaultValues?.delay ?? 0,
    },
  })

  function handleFormSubmit(values: FormValues) {
    let responseHeaders: Record<string, string> = {}
    try {
      responseHeaders = JSON.parse(values.responseHeaders)
    } catch {
      responseHeaders = {}
    }
    onSubmit({
      ...values,
      responseHeaders,
    })
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
          <input
            {...register('name')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: Listar usuários"
          />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Método</label>
          <select
            {...register('method')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {HTTP_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          {errors.method && <p className="mt-1 text-xs text-red-600">{errors.method.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Path</label>
          <input
            {...register('path')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="/api/users/:id"
          />
          {errors.path && <p className="mt-1 text-xs text-red-600">{errors.path.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status HTTP</label>
          <input
            {...register('responseStatus')}
            type="number"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="200"
          />
          {errors.responseStatus && (
            <p className="mt-1 text-xs text-red-600">{errors.responseStatus.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Delay (ms)</label>
          <input
            {...register('delay')}
            type="number"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0"
          />
          {errors.delay && <p className="mt-1 text-xs text-red-600">{errors.delay.message}</p>}
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Response Body</label>
          <textarea
            {...register('responseBody')}
            rows={6}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="{}"
          />
          {errors.responseBody && (
            <p className="mt-1 text-xs text-red-600">{errors.responseBody.message}</p>
          )}
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Response Headers (JSON)
          </label>
          <textarea
            {...register('responseHeaders')}
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder='{ "Content-Type": "application/json" }'
          />
          {errors.responseHeaders && (
            <p className="mt-1 text-xs text-red-600">{errors.responseHeaders.message}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Salvando...' : submitLabel}
        </button>
      </div>
    </form>
  )
}
