# Tasks — Spec 004: Import e Export de Endpoints

**Design aprovado em:** 2026-04-03  
**Estimativa total:** ~18h (9 tarefas backend, 8 tarefas frontend, 3 tarefas testes, 1 revisao)

---

## Pre-requisitos

- [x] Design aprovado (design.md)
- [ ] Branch criada: `feat/004-import-export`

---

## Backend

### Schemas e Tipos

- [ ] **T01** [S] @backend-dev — Criar schemas Zod para import/export
  - Arquivo: `apps/api/src/schemas/import-export.ts`
  - Conteudo:
    - `exportedEndpointSchema` (endpoint sem id/createdAt/updatedAt)
    - `exportFileSchema` (estrutura completa do arquivo)
    - `importPreviewBodySchema`
    - `importBodySchema` (com strategy)
  - Criterio: tipos exportados, schema valida corretamente um arquivo de exemplo

---

### Service

- [ ] **T02** [M] @backend-dev — Implementar `ImportExportService.exportEndpoints()`
  - Arquivo: `apps/api/src/services/import-export-service.ts`
  - Logica:
    - Recebe `ids?: string[]`
    - Se ids fornecidos, valida que todos existem (throw NOT_FOUND se algum falta)
    - Busca endpoints com matchingRules
    - Serializa omitindo `id`, `createdAt`, `updatedAt` dos endpoints
    - Serializa omitindo `id`, `endpointId`, `createdAt` das matchingRules
    - Retorna estrutura `ExportFile`
  - Criterio: testes unitarios cobrindo export total e export parcial

- [ ] **T03** [M] @backend-dev — Implementar `ImportExportService.previewImport()`
  - Arquivo: `apps/api/src/services/import-export-service.ts`
  - Logica:
    - Recebe `ExportFile`
    - Para cada endpoint: valida individualmente, classifica como new/conflict/invalid
    - Detecta conflito por `method + path`
    - Retorna `ImportPreviewResult` com array de previews e summary
  - Criterio: testes cobrindo: arquivo valido sem conflitos, arquivo com conflitos, arquivo com erros de validacao

- [ ] **T04** [L] @backend-dev — Implementar `ImportExportService.executeImport()`
  - Arquivo: `apps/api/src/services/import-export-service.ts`
  - Logica:
    - Recebe `ExportFile` e `strategy`
    - Executa dentro de transacao SQLite (`db.transaction`)
    - Aplica estrategia: skip, overwrite, duplicate
    - Para overwrite: atualiza endpoint existente, deleta regras antigas, cria novas
    - Gera novos UUIDs para todos os endpoints e regras criados
    - Em caso de erro: rollback automatico
    - Retorna `{ created, updated, skipped, errors }`
  - Criterio: testes cobrindo cada estrategia, teste de rollback em caso de erro

---

### Rotas

- [ ] **T05** [S] @backend-dev — Criar rota GET /api/endpoints/export
  - Arquivo: `apps/api/src/routes/endpoints/export.ts`
  - Query param: `ids` (opcional, string com UUIDs separados por virgula)
  - Validacao: se `ids` fornecido, validar formato UUID
  - Chama `ImportExportService.exportEndpoints()`
  - Erros: 400 VALIDATION_ERROR, 404 NOT_FOUND
  - Criterio: testes de integracao com Supertest

- [ ] **T06** [S] @backend-dev — Criar rota POST /api/endpoints/import/preview
  - Arquivo: `apps/api/src/routes/endpoints/import-preview.ts`
  - Body: validado com `importPreviewBodySchema`
  - Chama `ImportExportService.previewImport()`
  - Erros: 400 INVALID_JSON, 400 INVALID_FORMAT
  - Criterio: testes de integracao com Supertest

- [ ] **T07** [S] @backend-dev — Criar rota POST /api/endpoints/import
  - Arquivo: `apps/api/src/routes/endpoints/import.ts`
  - Body: validado com `importBodySchema`
  - Chama `ImportExportService.executeImport()`
  - Erros: 400 INVALID_JSON, 400 INVALID_FORMAT, 400 VALIDATION_ERROR, 500 IMPORT_FAILED
  - Criterio: testes de integracao com Supertest

- [ ] **T08** [S] @backend-dev — Registrar novas rotas no app.ts
  - Arquivo: `apps/api/src/app.ts`
  - Importar e registrar: `exportEndpointsRoute`, `importPreviewRoute`, `importEndpointsRoute`
  - Criterio: rotas acessiveis via curl/Postman

---

## Frontend

### Hooks

- [ ] **T09** [S] @frontend-dev — Criar hook useExportEndpoints
  - Arquivo: `apps/web/src/hooks/use-export-endpoints.ts`
  - Funcoes:
    - `exportAll()`: GET /export, dispara download com nome `stublab-export-YYYY-MM-DD.json`
    - `exportSelected(ids: string[])`: GET /export?ids=..., dispara download
  - Usar `apiClient.get()` existente
  - Criterio: funcao de download funciona no browser

- [ ] **T10** [S] @frontend-dev — Criar hook useImportEndpoints
  - Arquivo: `apps/web/src/hooks/use-import-endpoints.ts`
  - Mutations:
    - `useImportPreview()`: POST /import/preview
    - `useImportExecute()`: POST /import
  - Invalida query `['endpoints']` apos import bem-sucedido
  - Criterio: mutations funcionam, invalidacao atualiza lista

---

### Componentes

- [ ] **T11** [M] @frontend-dev — Adicionar selecao multipla na EndpointTable
  - Arquivo: `apps/web/src/components/endpoint-table.tsx`
  - Novas props:
    - `selectable?: boolean`
    - `selectedIds?: string[]`
    - `onSelectionChange?: (ids: string[]) => void`
  - Nova coluna de checkbox (primeira coluna)
  - Checkbox no header para selecionar/desselecionar todos
  - Manter backward compatibility (props opcionais)
  - Criterio: selecao funciona, visual consistente com design existente

- [ ] **T12** [S] @frontend-dev — Criar componente ImportPreviewTable
  - Arquivo: `apps/web/src/components/import-preview-table.tsx`
  - Props: `preview: ImportPreviewItem[]`
  - Colunas: Method (badge), Path, Nome, Status (badge colorido), Erros
  - Status badges: Novo (verde), Conflito (amarelo), Invalido (vermelho)
  - Criterio: renderiza corretamente os tres status

- [ ] **T13** [L] @frontend-dev — Criar componente ImportModal
  - Arquivo: `apps/web/src/components/import-modal.tsx`
  - Props: `open: boolean`, `onOpenChange: (open: boolean) => void`
  - Estados internos: idle | uploading | previewing | importing | done | error
  - Fluxo:
    1. Input file (aceita .json)
    2. Ao selecionar arquivo: `FileReader.readAsText()` + parse JSON
    3. Chama hook `useImportPreview`
    4. Renderiza `ImportPreviewTable`
    5. Select para estrategia (skip | overwrite | duplicate)
    6. Botao "Confirmar" (desabilitado se nenhum endpoint valido)
    7. Chama hook `useImportExecute`
    8. Mostra resultado (X criados, Y atualizados, Z ignorados)
    9. Fecha modal e atualiza lista
  - Tratamento de erros: JSON invalido, formato nao reconhecido
  - Criterio: fluxo completo funciona, erros mostrados corretamente

- [ ] **T14** [M] @frontend-dev — Integrar botoes de export/import na EndpointsList
  - Arquivo: `apps/web/src/pages/endpoints-list.tsx`
  - Estado: `selectedIds: string[]`
  - Passar props de selecao para EndpointTable
  - Adicionar toolbar com botoes:
    - "Exportar tudo" (sempre visivel)
    - "Exportar selecionados (N)" (visivel quando N > 0)
    - "Importar" (abre ImportModal)
  - Usar hook `useExportEndpoints`
  - Criterio: botoes funcionam, selecao reflete no botao de export selecionados

---

### Tipos

- [ ] **T15** [S] @frontend-dev — Adicionar tipos de import/export no frontend
  - Arquivo: `apps/web/src/types/import-export.ts`
  - Tipos:
    - `ExportFile`
    - `ExportedEndpoint`
    - `ImportPreviewItem`
    - `ImportPreviewResult`
    - `ImportResult`
    - `ImportStrategy`
  - Criterio: tipos alinhados com API (backend)

---

## Testes

- [ ] **T16** [M] @tester — Testes de integracao para rotas de export
  - Arquivo: `apps/api/tests/routes/endpoints/export.test.ts`
  - Casos:
    - Export de todos os endpoints (sucesso)
    - Export de IDs especificos (sucesso)
    - Export com ID inexistente (404)
    - Export com ID invalido (400)
  - Criterio: cobertura minima 80%

- [ ] **T17** [M] @tester — Testes de integracao para rotas de import
  - Arquivo: `apps/api/tests/routes/endpoints/import.test.ts`
  - Casos:
    - Preview de arquivo valido sem conflitos
    - Preview de arquivo valido com conflitos
    - Preview de arquivo com endpoints invalidos
    - Preview de arquivo com formato invalido
    - Import com estrategia skip
    - Import com estrategia overwrite
    - Import com estrategia duplicate
    - Import com rollback em caso de erro
  - Criterio: cobertura minima 80%

- [ ] **T18** [M] @tester — Testes de componentes React
  - Arquivos:
    - `apps/web/src/components/__tests__/import-modal.test.tsx`
    - `apps/web/src/components/__tests__/import-preview-table.test.tsx`
  - Casos:
    - ImportModal: upload de arquivo, exibicao de preview, selecao de estrategia, submit
    - ImportPreviewTable: renderizacao dos tres status
  - Criterio: cobertura dos fluxos principais

---

## Revisao

- [ ] **T19** [M] @code-reviewer — Revisao final antes do merge
  - Checklist:
    - [ ] Todos os testes passando
    - [ ] Cobertura >= 80% nas novas funcionalidades
    - [ ] Sem `any` no codigo
    - [ ] Erros da API seguem formato `{ error, code }`
    - [ ] Imports absolutos usados corretamente
    - [ ] Sem console.log (usar fastify.log no backend)
    - [ ] Transacao de import funciona corretamente (testar rollback)
    - [ ] Download de arquivo funciona em Chrome, Firefox, Safari
  - Criterio: PR aprovado, pronto para merge

---

## Ordem de Execucao (dependencias)

```
T01 (schemas)
  |
  v
T02 (export service) ──> T05 (export route)
  |                            |
  v                            v
T03 (preview service) ──> T06 (preview route) ──> T16 (testes export)
  |                            |
  v                            v
T04 (execute service) ──> T07 (import route) ──> T17 (testes import)
                               |
                               v
                          T08 (registrar rotas)
                               |
                               +────────────────────┐
                               |                    |
                               v                    v
                          T09 (hook export)    T15 (tipos frontend)
                               |                    |
                               v                    v
                          T10 (hook import)    T11 (selecao tabela)
                               |                    |
                               +─────────┬──────────+
                                         |
                                         v
                                    T12 (preview table)
                                         |
                                         v
                                    T13 (import modal)
                                         |
                                         v
                                    T14 (integracao lista)
                                         |
                                         v
                                    T18 (testes React)
                                         |
                                         v
                                    T19 (revisao final)
```

---

## Notas para implementacao

1. **Transacao SQLite:** O Drizzle com better-sqlite3 usa `db.transaction()` que encapsula begin/commit/rollback automaticamente.

2. **Download no browser:** Usar `Blob` + `URL.createObjectURL` para evitar abrir nova aba.

3. **FileReader:** Usar `readAsText()` e `JSON.parse()` no frontend antes de enviar ao backend.

4. **Invalidacao de cache:** Apos import bem-sucedido, chamar `queryClient.invalidateQueries(['endpoints'])`.

5. **Limite de endpoints:** O schema Zod limita a 1000 endpoints por arquivo. Mostrar erro amigavel se exceder.
