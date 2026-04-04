# Tasks — Spec 004: Import e Export de Endpoints

**Design aprovado em:** 2026-04-03  
**Estimativa total:** ~18h (9 tarefas backend, 8 tarefas frontend, 3 tarefas testes, 1 revisao)

---

## Pre-requisitos

- [x] Design aprovado (design.md)
- [x] Branch criada: `feat/004-import-export`

---

## Backend

### Schemas e Tipos

- [x] **T01** [S] @backend-dev — Criar schemas Zod para import/export
  - Arquivo: `apps/api/src/schemas/import-export.ts`
  - Conteudo:
    - `exportedEndpointSchema` (endpoint sem id/createdAt/updatedAt)
    - `exportFileSchema` (estrutura completa do arquivo)
    - `looseExportFileSchema` (endpoints: unknown[] para preview)
    - `importPreviewBodySchema` (usa looseExportFileSchema)
    - `importBodySchema` (com strategy)
  - Criterio: tipos exportados, schema valida corretamente um arquivo de exemplo ✓

---

### Service

- [x] **T02** [M] @backend-dev — Implementar `ImportExportService.exportEndpoints()`
  - Arquivo: `apps/api/src/services/import-export-service.ts`
  - Criterio: testes unitarios cobrindo export total e export parcial ✓

- [x] **T03** [M] @backend-dev — Implementar `ImportExportService.previewImport()`
  - Arquivo: `apps/api/src/services/import-export-service.ts`
  - Criterio: testes cobrindo: arquivo valido sem conflitos, arquivo com conflitos, arquivo com erros de validacao ✓

- [x] **T04** [L] @backend-dev — Implementar `ImportExportService.executeImport()`
  - Arquivo: `apps/api/src/services/import-export-service.ts`
  - Criterio: testes cobrindo cada estrategia, teste de rollback em caso de erro ✓

---

### Rotas

- [x] **T05** [S] @backend-dev — Criar rota GET /api/endpoints/export
  - Arquivo: `apps/api/src/routes/endpoints/export.ts`
  - Criterio: testes de integracao com Supertest ✓

- [x] **T06** [S] @backend-dev — Criar rota POST /api/endpoints/import/preview
  - Arquivo: `apps/api/src/routes/endpoints/import-preview.ts`
  - Criterio: testes de integracao com Supertest ✓

- [x] **T07** [S] @backend-dev — Criar rota POST /api/endpoints/import
  - Arquivo: `apps/api/src/routes/endpoints/import.ts`
  - Criterio: testes de integracao com Supertest ✓

- [x] **T08** [S] @backend-dev — Registrar novas rotas no app.ts
  - Arquivo: `apps/api/src/app.ts`
  - Criterio: rotas acessiveis via curl/Postman ✓

---

## Frontend

### Hooks

- [x] **T09** [S] @frontend-dev — Criar hook useExportEndpoints
  - Arquivo: `apps/web/src/hooks/use-export-endpoints.ts`
  - Criterio: funcao de download funciona no browser ✓

- [x] **T10** [S] @frontend-dev — Criar hook useImportEndpoints
  - Arquivo: `apps/web/src/hooks/use-import-endpoints.ts`
  - Criterio: mutations funcionam, invalidacao atualiza lista ✓

---

### Componentes

- [x] **T11** [M] @frontend-dev — Adicionar selecao multipla na EndpointTable
  - Arquivo: `apps/web/src/components/endpoint-table.tsx`
  - Criterio: selecao funciona, visual consistente com design existente ✓

- [x] **T12** [S] @frontend-dev — Criar componente ImportPreviewTable
  - Arquivo: `apps/web/src/components/import-preview-table.tsx`
  - Criterio: renderiza corretamente os tres status ✓

- [x] **T13** [L] @frontend-dev — Criar componente ImportModal
  - Arquivo: `apps/web/src/components/import-modal.tsx`
  - Criterio: fluxo completo funciona, erros mostrados corretamente ✓

- [x] **T14** [M] @frontend-dev — Integrar botoes de export/import na EndpointsList
  - Arquivo: `apps/web/src/pages/endpoints-list.tsx`
  - Criterio: botoes funcionam, selecao reflete no botao de export selecionados ✓

---

### Tipos

- [x] **T15** [S] @frontend-dev — Adicionar tipos de import/export no frontend
  - Arquivo: `apps/web/src/types/import-export.ts`
  - Criterio: tipos alinhados com API (backend) ✓

---

## Testes

- [x] **T16** [M] @tester — Testes de integracao para rotas de export
  - Arquivo: `apps/api/tests/routes/endpoints/export.test.ts`
  - Criterio: cobertura minima 80% ✓ (5 casos)

- [x] **T17** [M] @tester — Testes de integracao para rotas de import
  - Arquivo: `apps/api/tests/routes/endpoints/import.test.ts`
  - Criterio: cobertura minima 80% ✓ (8 casos)

- [x] **T18** [M] @tester — Testes de componentes React
  - Arquivos:
    - `apps/web/tests/components/import-modal.test.tsx` (7 casos)
    - `apps/web/tests/components/import-preview-table.test.tsx` (8 casos)
  - Criterio: cobertura dos fluxos principais ✓

---

## Revisao

- [x] **T19** @code-reviewer — Revisao final antes do merge
  - Checklist:
    - [x] Todos os testes passando (191 api + 108 web = 299 total)
    - [x] Sem `any` no codigo (corrigido: `unknown` com cast seguro no previewImport)
    - [x] Erros da API seguem formato `{ error, code }`
    - [x] Imports absolutos usados corretamente
    - [x] Sem console.log
    - [x] Transacao de import funciona corretamente (better-sqlite3 sincrono)
    - [x] looseExportFileSchema no preview (endpoints: unknown[]) — valida individualmente no service
    - [x] TypeScript sem erros nos arquivos novos
  - Criterio: PR aprovado ✓

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

1. **Transacao SQLite:** O Drizzle com better-sqlite3 usa `db.transaction()` sincrono.

2. **Download no browser:** Usar `Blob` + `URL.createObjectURL` para evitar abrir nova aba.

3. **FileReader:** Usar `readAsText()` e `JSON.parse()` no frontend antes de enviar ao backend.

4. **Invalidacao de cache:** Apos import bem-sucedido, `queryClient.invalidateQueries(['endpoints'])`.

5. **Limite de endpoints:** Schema Zod limita a 1000 endpoints por arquivo.

6. **looseExportFileSchema:** Usado no preview para aceitar endpoints com campos invalidos e retornar status 'invalid' por item — nao rejeitar o arquivo inteiro.
