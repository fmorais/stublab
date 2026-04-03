# Tasks — Cadastro e gerenciamento de endpoints

**Spec:** 001-endpoint-crud
**Design aprovado em:** 2026-04-02
**Total estimado:** ~20-25h
**Premissas?** Sempre que uma tarefa for concluída, deve ser marcado o checkbox relacionado para melhor controle do que foi implementado.

---

## Pré-requisitos (Setup inicial)

O projeto parte do zero — as primeiras tarefas criam a estrutura base.

- [x] **T00a** [M] @backend-dev — Inicializar monorepo com pnpm workspaces
  - Criar `pnpm-workspace.yaml`, `package.json` raiz, `tsconfig.json` base
  - Critério: `pnpm install` funciona sem erros

- [x] **T00b** [M] @backend-dev — Criar estrutura do app `api`
  - Criar `apps/api/` com package.json, tsconfig.json, Fastify configurado com `@fastify/cors`
  - Critério: `pnpm --filter api dev` sobe servidor em localhost:3000

- [x] **T00c** [M] @frontend-dev — Criar estrutura do app `web`
  - Criar `apps/web/` com Vite + React + TypeScript + Tailwind + shadcn/ui
  - Critério: `pnpm --filter web dev` sobe em localhost:5173

- [x] **T00d** [S] @backend-dev — Configurar Drizzle ORM com SQLite
  - Criar `apps/api/src/db/index.ts` e `drizzle.config.ts`
  - Critério: conexão com SQLite funcionando, scripts `db:generate`, `db:migrate`, `db:studio` no package.json

---

## Backend — Schema e Migrations

- [x] **T01** [S] @backend-dev — Criar schema da tabela `endpoints`
  - Arquivo: `apps/api/src/db/schema.ts`
  - Campos conforme design.md; índice único em (method, path) para endpoints ativos
  - Critério: `pnpm db:generate` cria migration, `pnpm db:migrate` aplica sem erros

- [x] **T02** [S] @backend-dev — Criar tipos TypeScript do domínio
  - Arquivo: `apps/api/src/types/endpoint.ts`
  - Exportar `Endpoint`, `CreateEndpointInput`, `UpdateEndpointInput`, `HttpMethod`
  - Critério: tipos compilam sem erros em strict mode

---

## Backend — Service Layer

- [x] **T03** [M] @backend-dev — Implementar `EndpointService.create()`
  - Arquivo: `apps/api/src/services/endpoint-service.ts`
  - Gera UUID v4, valida unicidade de method+path entre ativos, define timestamps
  - Critério: testes unitários cobrindo caso feliz + conflito 409

- [x] **T04** [S] @backend-dev — Implementar `EndpointService.findAll()`
  - Suporta filtros: `search` (name ou path), `method`, `active`
  - Critério: testes unitários passando para cada combinação de filtro

- [x] **T05** [S] @backend-dev — Implementar `EndpointService.findById()`
  - Retorna `null` se não existe
  - Critério: testes unitários passando

- [x] **T06** [M] @backend-dev — Implementar `EndpointService.update()`
  - Valida conflito ao mudar method/path para combinação já existente em outro ativo
  - Atualiza `updatedAt`
  - Critério: testes unitários cobrindo caso feliz + conflito + not found

- [x] **T07** [S] @backend-dev — Implementar `EndpointService.toggle()`
  - Alterna `active`; ao ativar, valida conflito de method+path
  - Critério: testes unitários passando

- [x] **T08** [S] @backend-dev — Implementar `EndpointService.delete()`
  - Retorna `boolean` indicando se o registro existia
  - Critério: testes unitários passando

---

## Backend — Rotas Admin API

- [x] **T09** [M] @backend-dev — Implementar POST /api/endpoints
  - Arquivo: `apps/api/src/routes/endpoints/create.ts`
  - Validação Zod; retorna 201, 400 ou 409
  - Critério: testes de integração — caso feliz + validação inválida + conflito

- [x] **T10** [S] @backend-dev — Implementar GET /api/endpoints
  - Arquivo: `apps/api/src/routes/endpoints/list.ts`
  - Query params: `search`, `method`, `active`
  - Critério: testes de integração — lista vazia, com itens, com filtros

- [x] **T11** [S] @backend-dev — Implementar GET /api/endpoints/:id
  - Arquivo: `apps/api/src/routes/endpoints/get.ts`
  - Retorna 404 se não existe
  - Critério: testes de integração — encontrado + não encontrado

- [x] **T12** [M] @backend-dev — Implementar PUT /api/endpoints/:id
  - Arquivo: `apps/api/src/routes/endpoints/update.ts`
  - Validação Zod; retorna 200, 400, 404 ou 409
  - Critério: testes de integração — caso feliz + não encontrado + conflito

- [x] **T13** [S] @backend-dev — Implementar PATCH /api/endpoints/:id/toggle
  - Arquivo: `apps/api/src/routes/endpoints/toggle.ts`
  - Retorna 409 se conflito ao ativar
  - Critério: testes de integração — ativar, desativar, conflito ao ativar

- [x] **T14** [S] @backend-dev — Implementar DELETE /api/endpoints/:id
  - Arquivo: `apps/api/src/routes/endpoints/delete.ts`
  - Retorna 204 ou 404
  - Critério: testes de integração — deletado + não encontrado

---

## Backend — Mock Engine

- [x] **T15** [M] @backend-dev — Implementar mock engine core
  - Arquivo: `apps/api/src/mock/engine.ts`
  - Função `matchEndpoint(method, path, endpoints[])` com suporte a params dinâmicos (`:param`)
  - Ordenação por especificidade: paths estáticos têm prioridade sobre paths com params
  - Critério: testes unitários cobrindo match exato, param único, multi-param, sem match

- [x] **T16** [M] @backend-dev — Registrar handler wildcard /mock/*
  - Arquivo: `apps/api/src/mock/handler.ts`
  - Busca endpoints ativos, usa engine para matching, aplica delay, retorna response configurado
  - Retorna `{ error: "No mock found", code: "MOCK_NOT_FOUND" }` com 404 se sem match
  - Critério: testes de integração — mock respondendo + delay aplicado + 404 sem match

---

## Frontend — Infraestrutura

- [ ] **T17** [S] @frontend-dev — Configurar React Router
  - Rotas: `/`, `/endpoints/new`, `/endpoints/:id/edit`
  - Layout base com navbar
  - Critério: navegação entre rotas funcionando

- [ ] **T18** [S] @frontend-dev — Criar `api-client.ts`
  - Arquivo: `apps/web/src/lib/api-client.ts`
  - Wrapper sobre fetch com base URL configurável via env, tratamento de erros padronizado
  - Critério: métodos `get`, `post`, `put`, `patch`, `del` funcionando

- [ ] **T19** [S] @frontend-dev — Configurar TanStack Query
  - Provider no App com configurações de cache adequadas
  - Critério: `useQuery` e `useMutation` disponíveis nos componentes

- [ ] **T20** [S] @frontend-dev — Criar tipos compartilhados
  - Arquivo: `apps/web/src/types/endpoint.ts`
  - Espelha tipos do backend: `Endpoint`, `CreateEndpointInput`, `UpdateEndpointInput`, `HttpMethod`
  - Critério: tipos compilando em strict mode

---

## Frontend — Hooks de API

- [ ] **T21** [S] @frontend-dev — Criar `useEndpoints()` hook
  - Arquivo: `apps/web/src/hooks/use-endpoints.ts`
  - Lista endpoints com filtros (search, method, active)
  - Critério: hook retorna `{ data, isLoading, error }`

- [ ] **T22** [S] @frontend-dev — Criar `useEndpoint(id)` hook
  - Busca endpoint único por ID
  - Critério: funciona com ID válido e retorna erro tratado para ID inválido

- [ ] **T23** [S] @frontend-dev — Criar `useCreateEndpoint()` mutation
  - POST + invalida query de lista após sucesso
  - Critério: mutation cria e lista atualiza automaticamente

- [ ] **T24** [S] @frontend-dev — Criar `useUpdateEndpoint()` mutation
  - PUT + invalida queries de lista e detalhe
  - Critério: mutation atualiza e cache revalida

- [ ] **T25** [S] @frontend-dev — Criar `useToggleEndpoint()` mutation
  - PATCH toggle + atualização otimista do cache
  - Critério: toggle reflete imediatamente na UI, reverte em erro

- [ ] **T26** [S] @frontend-dev — Criar `useDeleteEndpoint()` mutation
  - DELETE + invalida query de lista
  - Critério: mutation remove e lista atualiza

---

## Frontend — Componentes UI

- [ ] **T27** [M] @frontend-dev — Criar componente `EndpointForm`
  - Arquivo: `apps/web/src/components/endpoint-form.tsx`
  - Formulário reutilizável (criar/editar) com react-hook-form + Zod
  - Campos: name, method, path, responseStatus, responseBody (textarea), responseHeaders, delay
  - Critério: todos os campos com validação e mensagens de erro corretas

- [ ] **T28** [S] @frontend-dev — Criar componente `MethodBadge`
  - Arquivo: `apps/web/src/components/method-badge.tsx`
  - Badge colorido por método: GET=verde, POST=azul, PUT=amarelo, PATCH=laranja, DELETE=vermelho
  - Critério: renderiza corretamente para todos os 5 métodos

- [ ] **T29** [S] @frontend-dev — Criar componente `EndpointTable`
  - Arquivo: `apps/web/src/components/endpoint-table.tsx`
  - Colunas: Nome, Método (MethodBadge), Path, Status, Ativo (Switch), Ações (editar/deletar)
  - Critério: renderiza lista, toggle funciona, links de editar navegam corretamente

- [ ] **T30** [S] @frontend-dev — Criar componente `DeleteConfirmDialog`
  - Arquivo: `apps/web/src/components/delete-confirm-dialog.tsx`
  - Usa shadcn/ui AlertDialog; exibe nome do endpoint a ser deletado
  - Critério: abre, confirma (chama callback), cancela sem efeito

- [ ] **T31** [S] @frontend-dev — Criar componente `SearchFilters`
  - Arquivo: `apps/web/src/components/search-filters.tsx`
  - Input de busca + Select de método HTTP + filtro de status
  - Critério: mudanças nos filtros atualizam a query de listagem com debounce no search

---

## Frontend — Páginas

- [ ] **T32** [M] @frontend-dev — Implementar página `/` (lista de endpoints)
  - Arquivo: `apps/web/src/pages/endpoints-list.tsx`
  - Compõe: SearchFilters + EndpointTable
  - Botão "Novo endpoint", estados de loading (skeleton) e erro
  - Critério: lista endpoints do backend, filtros funcionam, ações inline funcionam

- [ ] **T33** [M] @frontend-dev — Implementar página `/endpoints/new`
  - Arquivo: `apps/web/src/pages/endpoint-new.tsx`
  - EndpointForm em modo criação; redireciona para `/` após sucesso
  - Exibe erro de API inline (inclusive 409 com mensagem amigável)
  - Critério: cria endpoint e ele aparece na lista

- [ ] **T34** [M] @frontend-dev — Implementar página `/endpoints/:id/edit`
  - Arquivo: `apps/web/src/pages/endpoint-edit.tsx`
  - Carrega endpoint existente (loading state enquanto busca)
  - EndpointForm em modo edição + botão deletar com DeleteConfirmDialog
  - Critério: edita endpoint, deleta com confirmação, trata 404 se ID inexistente

---

## Testes

- [ ] **T35** [M] @tester — Testes de integração E2E backend
  - Cobrir fluxo completo: criar → listar → editar → toggle → deletar
  - Cobrir mock engine: endpoint ativo responde, inativo não responde, 404 sem match
  - Critério: todos os cenários do requirements.md cobertos, mínimo 80% coverage nas rotas e services

- [ ] **T36** [M] @tester — Testes de componentes React
  - EndpointForm (validações), EndpointTable (render + interações), páginas principais
  - Critério: componentes renderizam e interagem corretamente, erros de API exibidos

---

## Revisão

- [ ] **T37** [S] @code-reviewer — Revisão de código backend
  - Verificar convenções CLAUDE.md, tipagem strict, sem `any`, testes cobrindo erros
  - Critério: nenhum blocker encontrado

- [ ] **T38** [S] @code-reviewer — Revisão de código frontend
  - Verificar hooks customizados, sem fetch direto, acessibilidade básica, Tailwind sem CSS externo
  - Critério: nenhum blocker encontrado

---

## Ordem de execução sugerida

```
Setup:      T00a → T00b + T00c (paralelo) → T00d
Schema:     T01 → T02
Services:   T03 → T04 → T05 → T06 → T07 → T08
Rotas:      T09 → T10 → T11 → T12 → T13 → T14  (após T08)
Mock:       T15 → T16  (pode iniciar após T05)
FE Infra:   T17 → T18 → T19 → T20  (paralelo ao backend)
FE Hooks:   T21..T26  (após rotas prontas)
FE UI:      T27..T31  (paralelo aos hooks)
FE Pages:   T32 → T33 → T34  (após hooks e componentes)
Testes:     T35 → T36
Revisão:    T37 + T38 (paralelo)
```
