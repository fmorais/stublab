# Tasks — Spec 008: Record Mode

**Spec:** 008-record-mode  
**Design:** em revisao  
**Data:** 2026-04-04

---

## Pre-requisitos

- [ ] Design aprovado pelo @architect
- [ ] Branch criada: `feat/008-record-mode`
- [ ] Spec 006 (workspaces) implementada e mergeada
- [ ] Spec 007 (proxy mode) implementada e mergeada

---

## Fase 1: Schema e migration

- [ ] **T104** [S] @backend-dev — Adicionar campo `recordEnabled` no schema de workspaces
  - Arquivo: `apps/api/src/db/schema.ts`
  - Adicionar campo `recordEnabled: integer('record_enabled', { mode: 'boolean' }).notNull().default(false)`
  - Criterio: schema compila sem erros TypeScript

- [ ] **T105** [M] @backend-dev — Criar tabela `recorded_interactions` no schema Drizzle
  - Arquivo: `apps/api/src/db/schema.ts`
  - Campos: id, workspaceId, method, path, requestHeaders, requestBody, responseStatus, responseBody, responseHeaders, capturedAt, groupKey, groupCount
  - Indice em `workspaceId` para queries filtradas
  - Indice unico em `(workspaceId, groupKey)` para upsert atomico
  - FK para workspaces com `onDelete: 'cascade'`
  - Criterio: schema compila sem erros TypeScript

- [ ] **T106** [S] @backend-dev — Gerar e aplicar migration
  - Executar `pnpm db:generate` para gerar migration
  - Verificar SQL gerado: CREATE TABLE recorded_interactions, ALTER TABLE workspaces ADD record_enabled
  - Executar `pnpm db:migrate` para aplicar
  - Testar com banco existente (workspaces ja cadastrados devem ter recordEnabled=false)
  - Criterio: migration executa sem erro; workspaces existentes preservados

- [ ] **T107** [S] @backend-dev — Criar tipos TypeScript para recording
  - Arquivo: `apps/api/src/types/recording.ts`
  - Interfaces: `RecordedInteraction`, `RecordInteractionInput`
  - Criterio: tipos exportados e compativeis com schema

- [ ] **T108** [S] @backend-dev — Atualizar tipos de workspace
  - Arquivo: `apps/api/src/types/workspace.ts`
  - Adicionar `recordEnabled: boolean` a interface `Workspace`
  - Adicionar `recordEnabled?: boolean` a interface `UpdateWorkspaceInput`
  - Criterio: tipos compativeis com schema

---

## Fase 2: RecordingService

- [ ] **T109** [S] @backend-dev — Criar funcao computeGroupKey()
  - Arquivo: `apps/api/src/services/recording-service.ts`
  - Usar `crypto.createHash('sha256')` nativo do Node
  - Concatenar: method (uppercase) + path + responseStatus + responseBody
  - Usar separador `\0` entre campos para evitar colisoes
  - Criterio: testes unitarios com casos variados

- [ ] **T110** [S] @backend-dev — Criar funcoes de filtro de headers
  - Arquivo: `apps/api/src/services/recording-service.ts`
  - `filterRequestHeaders()`: remove host, connection, x-stublab-*, x-forwarded-*
  - `filterResponseHeaders()`: remove transfer-encoding, connection, keep-alive, content-length, content-encoding, x-stublab-*, x-forwarded-*
  - Criterio: testes unitarios cobrindo todos os headers filtrados

- [ ] **T111** [S] @backend-dev — Criar funcao truncateBody()
  - Arquivo: `apps/api/src/services/recording-service.ts`
  - Limite: 1MB (1024 * 1024 bytes)
  - Se maior, truncar e adicionar `\n[truncated]`
  - Criterio: testes unitarios com body pequeno e grande

- [ ] **T112** [M] @backend-dev — Implementar RecordingService.record()
  - Arquivo: `apps/api/src/services/recording-service.ts`
  - Calcular groupKey via computeGroupKey()
  - Filtrar headers via funcoes de filtro
  - Truncar bodies se necessario
  - Usar `INSERT ... ON CONFLICT DO UPDATE` para upsert atomico
  - Incrementar groupCount e atualizar capturedAt em duplicatas
  - Criterio: testes unitarios para insercao e upsert

- [ ] **T113** [M] @backend-dev — Implementar RecordingService.findByWorkspace()
  - Arquivo: `apps/api/src/services/recording-service.ts`
  - Aceitar filtros: method, status, search (LIKE no path)
  - Aceitar paginacao: limit (default 50, max 100), offset (default 0)
  - Retornar { data, total, limit, offset }
  - Ordenar por capturedAt DESC (mais recentes primeiro)
  - Criterio: testes unitarios com filtros e paginacao

- [ ] **T114** [S] @backend-dev — Implementar RecordingService.findById()
  - Arquivo: `apps/api/src/services/recording-service.ts`
  - Buscar por id e workspaceId (seguranca: nao retornar de outro workspace)
  - Criterio: teste unitario para caso feliz e not found

- [ ] **T115** [S] @backend-dev — Implementar RecordingService.delete()
  - Arquivo: `apps/api/src/services/recording-service.ts`
  - Deletar por id e workspaceId
  - Retornar boolean indicando se deletou
  - Criterio: teste unitario para caso feliz e not found

- [ ] **T116** [S] @backend-dev — Implementar RecordingService.deleteMany()
  - Arquivo: `apps/api/src/services/recording-service.ts`
  - Deletar por array de ids + workspaceId
  - Retornar quantidade deletada
  - Criterio: teste unitario com ids validos e invalidos

- [ ] **T117** [S] @backend-dev — Implementar RecordingService.deleteAll()
  - Arquivo: `apps/api/src/services/recording-service.ts`
  - Deletar todas gravacoes do workspace
  - Retornar quantidade deletada
  - Criterio: teste unitario

---

## Fase 3: Hook de gravacao no handler

- [ ] **T118** [M] @backend-dev — Modificar forwardToProxy() para suportar gravacao
  - Arquivo: `apps/api/src/mock/handler.ts`
  - Adicionar parametro `recordEnabled: boolean`
  - Quando recordEnabled=true:
    - Bufferizar response body antes de enviar
    - Chamar RecordingService.record() de forma assincrona (nao bloquear)
    - Logar erros de gravacao via request.log.error()
  - Quando recordEnabled=false:
    - Manter comportamento atual (streaming)
  - Criterio: testes de integracao com record on e off

- [ ] **T119** [S] @backend-dev — Passar recordEnabled para forwardToProxy()
  - Arquivo: `apps/api/src/mock/handler.ts`
  - Nos dois pontos onde forwardToProxy() e chamado, passar `workspace.recordEnabled`
  - Criterio: testes de integracao verificam gravacao

---

## Fase 4: Rotas de API para recordings

- [ ] **T120** [M] @backend-dev — Criar rota GET /api/workspaces/:slug/recordings
  - Arquivo: `apps/api/src/routes/recordings/list.ts`
  - Query params: method, status, search, limit, offset
  - Validar limit <= 100
  - Chamar RecordingService.findByWorkspace()
  - Retornar { data, total, limit, offset }
  - Criterio: teste de integracao com filtros e paginacao

- [ ] **T121** [S] @backend-dev — Criar rota GET /api/workspaces/:slug/recordings/:id
  - Arquivo: `apps/api/src/routes/recordings/get.ts`
  - Chamar RecordingService.findById()
  - Retornar 404 se nao encontrado
  - Criterio: teste de integracao caso feliz e not found

- [ ] **T122** [S] @backend-dev — Criar rota DELETE /api/workspaces/:slug/recordings/:id
  - Arquivo: `apps/api/src/routes/recordings/delete.ts`
  - Chamar RecordingService.delete()
  - Retornar 204 se deletou, 404 se nao encontrado
  - Criterio: teste de integracao caso feliz e not found

- [ ] **T123** [S] @backend-dev — Criar rota POST /api/workspaces/:slug/recordings/discard
  - Arquivo: `apps/api/src/routes/recordings/discard.ts`
  - Body: `{ ids: string[] }`
  - Validar ids nao vazio, max 100 ids
  - Chamar RecordingService.deleteMany()
  - Retornar `{ deleted: number }`
  - Criterio: teste de integracao

- [ ] **T124** [S] @backend-dev — Criar rota DELETE /api/workspaces/:slug/recordings?all=true
  - Arquivo: `apps/api/src/routes/recordings/delete-all.ts`
  - Query param `all=true` obrigatorio (previne delecao acidental)
  - Chamar RecordingService.deleteAll()
  - Retornar `{ deleted: number }`
  - Criterio: teste de integracao

- [ ] **T125** [L] @backend-dev — Criar rota POST /api/workspaces/:slug/recordings/:id/save
  - Arquivo: `apps/api/src/routes/recordings/save.ts`
  - Body opcional: `{ name?: string, delay?: number, overwrite?: boolean }`
  - Buscar gravacao pelo id
  - Verificar conflito: endpoint ativo com mesmo method+path
    - Se conflito e overwrite=false: retornar 409 com `existingEndpointId`
    - Se conflito e overwrite=true: desativar endpoint existente
  - Criar endpoint via EndpointService.create()
  - Deletar gravacao
  - Retornar `{ endpoint: Endpoint, recordingDeleted: true }`
  - Criterio: testes de integracao para caso feliz, conflito, overwrite

- [ ] **T126** [L] @backend-dev — Criar rota POST /api/workspaces/:slug/recordings/save-bulk
  - Arquivo: `apps/api/src/routes/recordings/save-bulk.ts`
  - Body: `{ ids: string[], skipConflicts?: boolean }`
  - Validar ids nao vazio, max 50 ids
  - Para cada id:
    - Buscar gravacao
    - Verificar conflito
    - Se skipConflicts=true (default), ignorar conflitos
    - Criar endpoint
    - Deletar gravacao
  - Retornar `{ created: number, skipped: number, deleted: number }`
  - Criterio: testes de integracao com e sem conflitos

- [ ] **T127** [S] @backend-dev — Registrar rotas de recordings no app.ts
  - Arquivo: `apps/api/src/app.ts`
  - Criar novo escopo de rotas com prefix `/api/workspaces/:slug`
  - Registrar todas as rotas de recordings
  - Reutilizar hook de workspace existente
  - Criterio: rotas respondem corretamente

---

## Fase 5: Atualizacao do workspace

- [ ] **T128** [S] @backend-dev — Atualizar WorkspaceService para recordEnabled
  - Arquivo: `apps/api/src/services/workspace-service.ts`
  - Modificar `rowToWorkspace()` para incluir `recordEnabled`
  - Modificar `update()` para aceitar e persistir `recordEnabled`
  - Criterio: testes unitarios

- [ ] **T129** [S] @backend-dev — Atualizar rota PUT /api/workspaces/:slug
  - Arquivo: `apps/api/src/routes/workspaces/update.ts`
  - Adicionar `recordEnabled` ao schema Zod
  - Adicionar validacao: se recordEnabled=true e proxyEnabled=false, retornar erro 400
    `{ error: "Record mode requer proxy mode ativo", code: "VALIDATION_ERROR" }`
  - Criterio: teste de integracao para validacao

---

## Fase 6: Testes de backend

- [ ] **T130** [M] @tester — Criar testes unitarios para computeGroupKey()
  - Arquivo: `apps/api/tests/services/recording-service.test.ts`
  - Cenarios:
    - Hash consistente para mesmos inputs
    - Hash diferente para inputs diferentes
    - Tratamento de body null
  - Criterio: todos os cenarios cobertos

- [ ] **T131** [M] @tester — Criar testes unitarios para funcoes de filtro de headers
  - Arquivo: `apps/api/tests/services/recording-service.test.ts`
  - Cenarios:
    - filterRequestHeaders remove headers corretos
    - filterResponseHeaders remove headers corretos
    - Headers x-stublab-* removidos
    - Headers x-forwarded-* removidos
    - Headers normais preservados
  - Criterio: todos os cenarios cobertos

- [ ] **T132** [M] @tester — Criar testes unitarios para RecordingService.record()
  - Arquivo: `apps/api/tests/services/recording-service.test.ts`
  - Cenarios:
    - Primeira gravacao cria registro
    - Segunda gravacao com mesmo groupKey incrementa counter
    - Bodies grandes sao truncados
  - Criterio: todos os cenarios cobertos

- [ ] **T133** [L] @tester — Criar testes de integracao para hook de gravacao
  - Arquivo: `apps/api/tests/mock/handler-recording.test.ts`
  - Setup: criar workspace com proxy e record ativos, mockar servico externo
  - Cenarios:
    - Request proxiada e gravada quando record ativo
    - Request proxiada mas NAO gravada quando record inativo
    - Gravacao nao bloqueia resposta ao cliente
    - Headers filtrados corretamente na gravacao
  - Criterio: todos os cenarios cobertos

- [ ] **T134** [L] @tester — Criar testes de integracao para rotas de recordings
  - Arquivo: `apps/api/tests/routes/recordings/*.test.ts`
  - Cenarios:
    - GET list com filtros e paginacao
    - GET by id caso feliz e not found
    - DELETE by id caso feliz e not found
    - POST discard com multiplos ids
    - DELETE all com confirmacao
    - POST save caso feliz
    - POST save com conflito (409)
    - POST save com overwrite
    - POST save-bulk com skipConflicts
  - Criterio: todos os cenarios cobertos

- [ ] **T135** [S] @tester — Criar teste de integracao para validacao recordEnabled
  - Arquivo: `apps/api/tests/routes/workspaces/update-record.test.ts`
  - Cenarios:
    - recordEnabled=true com proxyEnabled=true: sucesso
    - recordEnabled=true com proxyEnabled=false: erro 400
  - Criterio: validacao funciona

---

## Fase 7: Frontend — Tipos e hooks

- [ ] **T136** [S] @frontend-dev — Criar tipos TypeScript para recording no frontend
  - Arquivo: `apps/web/src/types/recording.ts`
  - Interfaces: `RecordedInteraction`, `RecordingsListResponse`, `SaveRecordingInput`, `SaveBulkResponse`
  - Criterio: tipos exportados

- [ ] **T137** [S] @frontend-dev — Atualizar tipos de workspace no frontend
  - Arquivo: `apps/web/src/types/workspace.ts`
  - Adicionar `recordEnabled: boolean` a interface `Workspace`
  - Adicionar `recordEnabled?: boolean` a interface `UpdateWorkspaceInput`
  - Criterio: tipos compativeis com API

- [ ] **T138** [M] @frontend-dev — Criar hook useRecordings()
  - Arquivo: `apps/web/src/hooks/use-recordings.ts`
  - Funcoes:
    - `useRecordings(slug, filters)` — lista com React Query
    - `useRecording(slug, id)` — detalhe
    - `useDeleteRecording(slug)` — mutacao de delete
    - `useDiscardRecordings(slug)` — mutacao de discard bulk
    - `useDeleteAllRecordings(slug)` — mutacao de delete all
    - `useSaveRecording(slug)` — mutacao de save
    - `useSaveRecordingsBulk(slug)` — mutacao de save bulk
  - Criterio: hooks funcionam e invalidam cache corretamente

---

## Fase 8: Frontend — Componentes de gravacao

- [ ] **T139** [M] @frontend-dev — Criar componente RecordingTable
  - Arquivo: `apps/web/src/components/recording-table.tsx`
  - Props: recordings, selectedIds, onSelectionChange, onView, onDiscard, onSave
  - Colunas: checkbox, method (badge), path, status, groupCount, capturedAt
  - Selecao multipla via checkbox
  - Badge de contagem quando groupCount > 1
  - Criterio: tabela renderiza e selecao funciona

- [ ] **T140** [M] @frontend-dev — Criar componente RecordingDetailDialog
  - Arquivo: `apps/web/src/components/recording-detail-dialog.tsx`
  - Props: open, onOpenChange, recording
  - Exibir: method, path, status, capturedAt
  - Secoes expansiveis: request headers, request body, response headers, response body
  - Usar JsonEditor em modo readOnly para bodies JSON
  - Criterio: dialog renderiza todos os dados

- [ ] **T141** [L] @frontend-dev — Criar componente RecordingSaveDialog
  - Arquivo: `apps/web/src/components/recording-save-dialog.tsx`
  - Props: open, onOpenChange, recording, onSaved
  - Campos editaveis: name (pre-preenchido com "{METHOD} {path}"), delay
  - Campos readonly: method, path, status
  - JsonEditor para responseBody (editavel)
  - Botoes: Cancelar, Salvar como mock
  - Tratar conflito 409: mostrar dialog de confirmacao para overwrite
  - Criterio: dialog funciona e cria endpoint

- [ ] **T142** [S] @frontend-dev — Criar componente RecordingBulkActions
  - Arquivo: `apps/web/src/components/recording-bulk-actions.tsx`
  - Props: selectedCount, onDiscard, onSave, disabled
  - Botoes: "Descartar selecionados (N)", "Salvar selecionados como mocks (N)"
  - Confirmacao antes de descartar
  - Criterio: acoes funcionam

---

## Fase 9: Frontend — Pagina de gravacoes

- [ ] **T143** [L] @frontend-dev — Criar pagina RecordingsList
  - Arquivo: `apps/web/src/pages/recordings-list.tsx`
  - Estrutura similar a EndpointsList
  - Header com WorkspaceSelector e badge "Gravando"
  - Filtros: method (select), status (input), search (input)
  - RecordingTable com dados paginados
  - RecordingBulkActions quando ha selecao
  - Botao "Limpar tudo" com confirmacao
  - Paginacao no rodape
  - Criterio: pagina funciona end-to-end

- [ ] **T144** [S] @frontend-dev — Adicionar rota /workspaces/:slug/recordings
  - Arquivo: `apps/web/src/App.tsx`
  - Adicionar Route para RecordingsList
  - Criterio: navegacao funciona

---

## Fase 10: Frontend — Alteracoes em componentes existentes

- [ ] **T145** [M] @frontend-dev — Adicionar toggle recordEnabled no WorkspaceEditDialog
  - Arquivo: `apps/web/src/components/workspace-edit-dialog.tsx`
  - Adicionar state `recordEnabled`
  - Adicionar secao "Record Mode" apos "Proxy Mode"
  - Switch para recordEnabled (desabilitado se proxyEnabled=false)
  - Texto de ajuda: "Ative o proxy mode primeiro para habilitar gravacao"
  - Incluir no submit
  - Tratar erro de validacao do backend
  - Criterio: toggle funciona e valida dependencia de proxy

- [ ] **T146** [S] @frontend-dev — Adicionar badge "Gravando" no WorkspaceSelector
  - Arquivo: `apps/web/src/components/workspace-selector.tsx`
  - Props: adicionar `recordEnabled?: boolean`
  - Condicional: se recordEnabled=true, exibir badge vermelho "Gravando" com icone pulsante
  - Usar Circle do lucide-react com animate-pulse
  - Criterio: badge aparece quando record ativo

- [ ] **T147** [S] @frontend-dev — Adicionar link para gravacoes na EndpointsList
  - Arquivo: `apps/web/src/pages/endpoints-list.tsx`
  - Adicionar botao/link "Ver gravacoes" quando recordEnabled=true
  - Navegar para /workspaces/:slug/recordings
  - Criterio: navegacao funciona

- [ ] **T148** [S] @frontend-dev — Passar recordEnabled para WorkspaceSelector
  - Arquivo: `apps/web/src/pages/endpoints-list.tsx`
  - Passar `recordEnabled={workspace?.recordEnabled}` para WorkspaceSelector
  - Criterio: badge aparece corretamente

---

## Fase 11: Testes de frontend

- [ ] **T149** [M] @tester — Criar testes para RecordingTable
  - Arquivo: `apps/web/tests/components/recording-table.test.tsx`
  - Cenarios:
    - Renderiza lista de gravacoes
    - Checkbox seleciona/deseleciona
    - Badge de contagem aparece quando groupCount > 1
    - Callbacks de view, discard, save sao chamados
  - Criterio: todos os cenarios passam

- [ ] **T150** [M] @tester — Criar testes para RecordingSaveDialog
  - Arquivo: `apps/web/tests/components/recording-save-dialog.test.tsx`
  - Cenarios:
    - Campos pre-preenchidos corretamente
    - Validacao de nome obrigatorio
    - Submit chama API
    - Tratamento de conflito 409
  - Criterio: todos os cenarios passam

- [ ] **T151** [M] @tester — Criar testes para toggle recordEnabled no WorkspaceEditDialog
  - Arquivo: `apps/web/tests/components/workspace-edit-dialog-record.test.tsx`
  - Cenarios:
    - Toggle desabilitado quando proxyEnabled=false
    - Toggle habilitado quando proxyEnabled=true
    - Texto de ajuda aparece quando desabilitado
    - Submit inclui recordEnabled
  - Criterio: todos os cenarios passam

- [ ] **T152** [S] @tester — Criar testes para badge "Gravando" no WorkspaceSelector
  - Arquivo: `apps/web/tests/components/workspace-selector.test.tsx`
  - Cenarios:
    - Badge aparece quando recordEnabled=true
    - Badge nao aparece quando recordEnabled=false
    - Badge tem classe animate-pulse
  - Criterio: todos os cenarios passam

- [ ] **T153** [S] @tester — Criar testes para hook useRecordings
  - Arquivo: `apps/web/tests/hooks/use-recordings.test.tsx`
  - Mockar apiClient
  - Cenarios:
    - Lista retorna dados corretamente
    - Mutacoes invalidam cache
    - Filtros sao passados para API
  - Criterio: todos os cenarios passam

---

## Fase 12: Documentacao e finalizacao

- [ ] **T154** [S] @backend-dev — Atualizar CLAUDE.md com informacoes de record mode
  - Arquivo: `CLAUDE.md`
  - Adicionar campo `recordEnabled` ao modelo de Workspace
  - Adicionar modelo `RecordedInteraction` na secao de modelo de dominio
  - Criterio: documentacao atualizada

- [ ] **T155** [S] @backend-dev — Atualizar README.md com feature de record mode
  - Arquivo: `README.md`
  - Adicionar secao explicando o record mode
  - Incluir exemplo de uso
  - Mencionar pre-requisito de proxy mode
  - Criterio: README reflete nova funcionalidade

- [ ] **T156** [M] @code-reviewer — Revisao de codigo completa
  - Revisar: schema, services, rotas, hooks, componentes
  - Verificar: tipos TypeScript, tratamento de erros, cobertura de testes
  - Verificar: filtro de headers, truncamento de body
  - Criterio: aprovacao do reviewer

- [ ] **T157** [S] @backend-dev — Merge e deploy em ambiente de staging
  - Executar migration em staging
  - Testar fluxo completo E2E:
    1. Criar workspace com proxy e record ativos
    2. Fazer requests sem mock
    3. Verificar gravacoes na fila
    4. Salvar como mock
    5. Verificar endpoint criado
  - Criterio: staging funciona corretamente

---

## Resumo

| Fase | Tarefas | Estimativa total |
|------|---------|------------------|
| 1. Schema e migration | T104-T108 | ~3h |
| 2. RecordingService | T109-T117 | ~6h |
| 3. Hook de gravacao | T118-T119 | ~3h |
| 4. Rotas de API | T120-T127 | ~8h |
| 5. Atualizacao workspace | T128-T129 | ~1h |
| 6. Testes backend | T130-T135 | ~8h |
| 7. Frontend tipos/hooks | T136-T138 | ~2h |
| 8. Frontend componentes | T139-T142 | ~6h |
| 9. Frontend pagina | T143-T144 | ~4h |
| 10. Frontend alteracoes | T145-T148 | ~3h |
| 11. Testes frontend | T149-T153 | ~5h |
| 12. Finalizacao | T154-T157 | ~3h |
| **Total** | **54 tarefas** | **~52h** |

---

## Dependencias entre tarefas

```
T104 (recordEnabled) ─┐
                      │
T105 (schema) ────────┼─→ T106 (migration) → T107 (tipos recording) → T108 (tipos workspace)
                      │
                      ▼
            T109 → T110 → T111 → T112 (RecordingService.record)
                                  │
                      ┌───────────┴───────────┐
                      ▼                       ▼
            T113 → T114 → T115 → T116 → T117  T118 → T119 (hook gravacao)
            (findByWorkspace, delete, etc)           │
                      │                              │
                      ▼                              │
            T120 → T121 → T122 → T123 → T124 ◄──────┘
            (rotas list, get, delete, discard)
                      │
                      ▼
            T125 → T126 → T127 (save, save-bulk, registrar rotas)
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
T128 → T129 (workspace)   T130 → T131 → T132 → T133 → T134 → T135 (testes backend)
          │                       │
          └───────────┬───────────┘
                      ▼
          T136 → T137 → T138 (frontend tipos/hooks)
                      │
                      ▼
          T139 → T140 → T141 → T142 (componentes)
                      │
                      ▼
          T143 → T144 (pagina recordings)
                      │
                      ▼
          T145 → T146 → T147 → T148 (alteracoes componentes)
                      │
                      ▼
          T149 → T150 → T151 → T152 → T153 (testes frontend)
                      │
                      ▼
          T154 → T155 → T156 → T157 (finalizacao)
```

---

## Notas para implementacao

### Para @backend-dev

1. **Drizzle ON CONFLICT:** Usar `onConflictDoUpdate()` com `sql` template para incremento atomico:
   ```typescript
   import { sql } from 'drizzle-orm'
   
   .onConflictDoUpdate({
     target: [recordedInteractions.workspaceId, recordedInteractions.groupKey],
     set: {
       groupCount: sql`${recordedInteractions.groupCount} + 1`,
       capturedAt: new Date().toISOString(),
     },
   })
   ```

2. **Buffer do response body:** Cuidado com `Readable` stream — uma vez consumido, nao pode ser lido novamente. Coletar chunks antes de enviar:
   ```typescript
   const chunks: Buffer[] = []
   for await (const chunk of result.body) {
     chunks.push(chunk)
   }
   const bodyBuffer = Buffer.concat(chunks)
   ```

3. **Gravacao assincrona:** Usar `.catch()` para nao bloquear a resposta:
   ```typescript
   RecordingService.record({...}).catch(err => 
     request.log.error({ err }, 'Falha ao gravar interacao')
   )
   ```

4. **Validacao cruzada:** No PUT /workspaces/:slug, validar que recordEnabled=true requer proxyEnabled=true:
   ```typescript
   if (body.data.recordEnabled === true) {
     const current = await WorkspaceService.findBySlug(slug)
     const proxyWillBeEnabled = body.data.proxyEnabled ?? current.proxyEnabled
     if (!proxyWillBeEnabled) {
       return reply.status(400).send({
         error: 'Record mode requer proxy mode ativo',
         code: 'VALIDATION_ERROR',
       })
     }
   }
   ```

### Para @frontend-dev

1. **Badge pulsante:** Usar classes Tailwind:
   ```tsx
   <Badge variant="destructive" className="text-xs gap-1">
     <Circle className="w-2 h-2 fill-current animate-pulse" />
     Gravando
   </Badge>
   ```

2. **JsonEditor readonly:** O componente ja suporta prop `readOnly`:
   ```tsx
   <JsonEditor value={recording.responseBody ?? '{}'} readOnly />
   ```

3. **Confirmacao de overwrite:** Usar Alert dialog do shadcn/ui:
   ```tsx
   <AlertDialog>
     <AlertDialogContent>
       <AlertDialogHeader>
         <AlertDialogTitle>Endpoint ja existe</AlertDialogTitle>
         <AlertDialogDescription>
           Ja existe um mock para {method} {path}. Deseja sobrescrever?
         </AlertDialogDescription>
       </AlertDialogHeader>
       <AlertDialogFooter>
         <AlertDialogCancel>Cancelar</AlertDialogCancel>
         <AlertDialogAction onClick={handleOverwrite}>Sobrescrever</AlertDialogAction>
       </AlertDialogFooter>
     </AlertDialogContent>
   </AlertDialog>
   ```

4. **Invalidacao de cache:** Apos salvar como mock, invalidar tanto recordings quanto endpoints:
   ```typescript
   queryClient.invalidateQueries({ queryKey: ['recordings', slug] })
   queryClient.invalidateQueries({ queryKey: ['endpoints', slug] })
   ```

### Para @tester

1. **Mock de servico externo:** Usar `nock` para interceptar requests HTTP nos testes de integracao do handler
2. **Verificar gravacao assincrona:** Usar `vi.waitFor()` ou `setTimeout` para aguardar gravacao antes de verificar banco
3. **Teste de truncamento:** Criar body com mais de 1MB e verificar que fica truncado com `[truncated]`
