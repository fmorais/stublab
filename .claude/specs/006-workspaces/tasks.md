# Tasks — Spec 006: Workspaces

**Spec:** 006-workspaces  
**Design:** aprovado  
**Data:** 2026-04-04

---

## Pre-requisitos

- [ ] Design aprovado pelo @architect
- [ ] Branch criada: `feat/006-workspaces`

---

## Fase 1: Modelo de dados e migracao

- [ ] **T01** [M] @backend-dev — Criar tabela `workspaces` no schema Drizzle
  - Arquivo: `apps/api/src/db/schema.ts`
  - Adicionar definicao da tabela `workspaces` com campos: id, name, slug, createdAt, updatedAt
  - Slug deve ter constraint UNIQUE
  - Criterio: schema compila sem erros TypeScript

- [ ] **T02** [M] @backend-dev — Adicionar coluna `workspaceId` na tabela `endpoints`
  - Arquivo: `apps/api/src/db/schema.ts`
  - Adicionar foreign key para `workspaces.id` com `onDelete: 'cascade'`
  - Criar indice composto `idx_endpoints_workspace_method_path`
  - Remover indice antigo `idx_endpoints_method_path` (sera substituido pelo novo)
  - Criterio: schema compila sem erros TypeScript

- [ ] **T03** [M] @backend-dev — Gerar e aplicar migration com dados existentes
  - Arquivo: `apps/api/src/db/migrations/XXXX_add_workspaces.sql`
  - Executar `pnpm db:generate` para gerar migration
  - Editar migration manualmente para:
    1. Criar tabela workspaces
    2. Inserir workspace "Default" com UUID fixo `00000000-0000-0000-0000-000000000001`
    3. Adicionar coluna workspace_id em endpoints
    4. UPDATE endpoints SET workspace_id = UUID do Default
    5. Criar novo indice
  - Testar com banco limpo e com banco existente (endpoints ja cadastrados)
  - Criterio: `pnpm db:migrate` executa sem erro; endpoints existentes ficam associados ao workspace Default

- [ ] **T04** [S] @backend-dev — Criar tipo Workspace em `types/workspace.ts`
  - Arquivo: `apps/api/src/types/workspace.ts`
  - Definir interfaces: `Workspace`, `CreateWorkspaceInput`, `UpdateWorkspaceInput`, `WorkspaceWithStats`
  - Criterio: tipos exportados e compativeis com schema Drizzle

---

## Fase 2: WorkspaceService

- [ ] **T05** [M] @backend-dev — Implementar WorkspaceService.create()
  - Arquivo: `apps/api/src/services/workspace-service.ts`
  - Gerar UUID, validar slug unico, inserir no banco
  - Lancar `WorkspaceServiceError` com code `SLUG_CONFLICT` se slug existir
  - Criterio: testes unitarios para caso feliz e conflito de slug

- [ ] **T06** [S] @backend-dev — Implementar WorkspaceService.findAll()
  - Arquivo: `apps/api/src/services/workspace-service.ts`
  - Retornar lista de workspaces com contagem de endpoints (total e ativos)
  - Usar subquery ou join para calcular stats
  - Criterio: teste unitario com 0, 1 e N workspaces

- [ ] **T07** [S] @backend-dev — Implementar WorkspaceService.findBySlug()
  - Arquivo: `apps/api/src/services/workspace-service.ts`
  - Retornar workspace ou null
  - Incluir stats (endpointCount, activeEndpointCount)
  - Criterio: teste unitario para slug existente e inexistente

- [ ] **T08** [S] @backend-dev — Implementar WorkspaceService.update()
  - Arquivo: `apps/api/src/services/workspace-service.ts`
  - Permitir alteracao de name e slug
  - Validar unicidade do novo slug (se alterado)
  - Lancar `NOT_FOUND` se workspace nao existe, `SLUG_CONFLICT` se slug em uso
  - Criterio: testes para rename name, rename slug, conflito de slug

- [ ] **T09** [S] @backend-dev — Implementar WorkspaceService.delete()
  - Arquivo: `apps/api/src/services/workspace-service.ts`
  - Proteger workspace "default" (slug === 'default'): lancar `DEFAULT_WORKSPACE_PROTECTED`
  - Deletar workspace (cascade deleta endpoints automaticamente via FK)
  - Criterio: teste para delete normal, delete do default (erro), delete inexistente

---

## Fase 3: Rotas de Workspaces

- [ ] **T10** [S] @backend-dev — Criar rota POST /api/workspaces
  - Arquivo: `apps/api/src/routes/workspaces/create.ts`
  - Validar body com Zod (name, slug com regex)
  - Chamar WorkspaceService.create()
  - Retornar 201 com workspace criado ou 409 se slug existir
  - Criterio: teste de integracao com Supertest

- [ ] **T11** [S] @backend-dev — Criar rota GET /api/workspaces
  - Arquivo: `apps/api/src/routes/workspaces/list.ts`
  - Chamar WorkspaceService.findAll()
  - Retornar { data: [...], total: N }
  - Criterio: teste de integracao

- [ ] **T12** [S] @backend-dev — Criar rota GET /api/workspaces/:slug
  - Arquivo: `apps/api/src/routes/workspaces/get.ts`
  - Chamar WorkspaceService.findBySlug()
  - Retornar 200 ou 404
  - Criterio: teste de integracao

- [ ] **T13** [S] @backend-dev — Criar rota PUT /api/workspaces/:slug
  - Arquivo: `apps/api/src/routes/workspaces/update.ts`
  - Validar body com Zod
  - Chamar WorkspaceService.update()
  - Retornar 200, 404 ou 409
  - Criterio: teste de integracao

- [ ] **T14** [S] @backend-dev — Criar rota DELETE /api/workspaces/:slug
  - Arquivo: `apps/api/src/routes/workspaces/delete.ts`
  - Chamar WorkspaceService.delete()
  - Retornar 204, 404 ou 409 (se default)
  - Criterio: teste de integracao

- [ ] **T15** [S] @backend-dev — Registrar rotas de workspaces no app.ts
  - Arquivo: `apps/api/src/app.ts`
  - Importar e registrar todas as rotas de workspaces
  - Manter prefix `/api`
  - Criterio: rotas respondem corretamente via curl ou Supertest

---

## Fase 4: Adaptar EndpointService para workspaces

- [ ] **T16** [M] @backend-dev — Adaptar EndpointService.create() para receber workspaceId
  - Arquivo: `apps/api/src/services/endpoint-service.ts`
  - Adicionar `workspaceId` ao `CreateEndpointInput`
  - Validar unicidade de fallback (sem regras) dentro do workspace
  - Incluir workspaceId no INSERT
  - Criterio: testes existentes adaptados + teste de conflito entre workspaces

- [ ] **T17** [S] @backend-dev — Adaptar EndpointService.findAll() para filtrar por workspaceId
  - Arquivo: `apps/api/src/services/endpoint-service.ts`
  - Adicionar `workspaceId` obrigatorio ao objeto de filtros
  - Filtrar endpoints pelo workspace
  - Criterio: teste que confirma isolamento entre workspaces

- [ ] **T18** [S] @backend-dev — Adaptar EndpointService.findById() para validar workspace
  - Arquivo: `apps/api/src/services/endpoint-service.ts`
  - Receber workspaceId como parametro
  - Retornar null se endpoint existe mas pertence a outro workspace
  - Criterio: teste de acesso cross-workspace retorna null

- [ ] **T19** [S] @backend-dev — Adaptar EndpointService.update() para validar workspace
  - Arquivo: `apps/api/src/services/endpoint-service.ts`
  - Validar que endpoint pertence ao workspace
  - Validar unicidade de fallback dentro do workspace
  - Criterio: teste de update cross-workspace falha

- [ ] **T20** [S] @backend-dev — Adaptar EndpointService.toggle() para validar workspace
  - Arquivo: `apps/api/src/services/endpoint-service.ts`
  - Receber workspaceId, validar pertencimento
  - Criterio: teste de toggle cross-workspace falha

- [ ] **T21** [S] @backend-dev — Adaptar EndpointService.delete() para validar workspace
  - Arquivo: `apps/api/src/services/endpoint-service.ts`
  - Receber workspaceId, validar pertencimento
  - Criterio: teste de delete cross-workspace falha

---

## Fase 5: Adaptar rotas de Endpoints

- [ ] **T22** [M] @backend-dev — Criar pre-handler para extrair workspace das rotas de endpoints
  - Arquivo: `apps/api/src/routes/endpoints/workspace-hook.ts`
  - Implementar hook que busca workspace por slug e anexa ao request
  - Retornar 404 se workspace nao encontrado
  - Declarar tipo estendido de FastifyRequest com campo `workspace`
  - Criterio: hook funciona e tipos TypeScript corretos

- [ ] **T23** [M] @backend-dev — Mover rotas de endpoints para /api/workspaces/:slug/endpoints/*
  - Arquivos: `apps/api/src/routes/endpoints/*.ts`, `apps/api/src/app.ts`
  - Alterar registro no app.ts para novo prefix
  - Registrar workspace-hook no escopo das rotas de endpoints
  - Adaptar cada rota para usar `request.workspace`
  - Criterio: testes de integracao passam com novos paths

- [ ] **T24** [S] @backend-dev — Atualizar rota create para usar workspaceId do request
  - Arquivo: `apps/api/src/routes/endpoints/create.ts`
  - Passar `request.workspace.id` para EndpointService.create()
  - Criterio: teste de integracao cria endpoint no workspace correto

- [ ] **T25** [S] @backend-dev — Atualizar rota list para filtrar por workspace
  - Arquivo: `apps/api/src/routes/endpoints/list.ts`
  - Passar workspaceId para EndpointService.findAll()
  - Criterio: teste de integracao retorna apenas endpoints do workspace

- [ ] **T26** [S] @backend-dev — Atualizar rota get para validar workspace
  - Arquivo: `apps/api/src/routes/endpoints/get.ts`
  - Passar workspaceId para EndpointService.findById()
  - Criterio: teste de integracao retorna 404 para endpoint de outro workspace

- [ ] **T27** [S] @backend-dev — Atualizar rota update para validar workspace
  - Arquivo: `apps/api/src/routes/endpoints/update.ts`
  - Passar workspaceId para EndpointService.update()
  - Criterio: teste de integracao

- [ ] **T28** [S] @backend-dev — Atualizar rota toggle para validar workspace
  - Arquivo: `apps/api/src/routes/endpoints/toggle.ts`
  - Passar workspaceId para EndpointService.toggle()
  - Criterio: teste de integracao

- [ ] **T29** [S] @backend-dev — Atualizar rota delete para validar workspace
  - Arquivo: `apps/api/src/routes/endpoints/delete.ts`
  - Passar workspaceId para EndpointService.delete()
  - Criterio: teste de integracao

---

## Fase 6: Adaptar Import/Export

- [ ] **T30** [M] @backend-dev — Atualizar schema de export para version 2
  - Arquivo: `apps/api/src/schemas/import-export.ts`
  - Adicionar campo `workspace: { name: string, slug: string }` ao schema de export
  - Atualizar version para "2"
  - Manter compatibilidade com version "1" no import (campo workspace opcional)
  - Criterio: schema compila, testes de parsing passam

- [ ] **T31** [S] @backend-dev — Adaptar ImportExportService.exportEndpoints() para incluir workspace
  - Arquivo: `apps/api/src/services/import-export-service.ts`
  - Receber workspaceId como parametro
  - Filtrar endpoints pelo workspace
  - Incluir metadados do workspace no arquivo exportado
  - Criterio: teste de export inclui workspace no JSON

- [ ] **T32** [S] @backend-dev — Adaptar ImportExportService.previewImport() para workspace
  - Arquivo: `apps/api/src/services/import-export-service.ts`
  - Receber workspaceId como parametro
  - Detectar conflitos apenas dentro do workspace de destino
  - Incluir info do workspace de origem no resultado (se presente no arquivo)
  - Criterio: teste de conflito cross-workspace nao detecta conflito

- [ ] **T33** [S] @backend-dev — Adaptar ImportExportService.executeImport() para workspace
  - Arquivo: `apps/api/src/services/import-export-service.ts`
  - Receber workspaceId como parametro
  - Inserir endpoints com o workspaceId de destino
  - Criterio: teste de import cria endpoints no workspace correto

- [ ] **T34** [S] @backend-dev — Atualizar rotas de export/import para usar workspace
  - Arquivos: `apps/api/src/routes/endpoints/export.ts`, `import.ts`, `import-preview.ts`
  - Passar `request.workspace.id` para os services
  - Criterio: testes de integracao passam

---

## Fase 7: Mock Handler

- [ ] **T35** [M] @backend-dev — Adaptar mock handler para roteamento por workspace
  - Arquivo: `apps/api/src/mock/handler.ts`
  - Mudar URL pattern de `/mock/*` para `/mock/:slug/*`
  - Extrair slug e buscar workspace
  - Retornar 404 com `WORKSPACE_NOT_FOUND` se slug invalido
  - Filtrar endpoints por workspaceId antes de passar para engine
  - Criterio: testes de integracao para workspace valido, invalido e mock encontrado/nao encontrado

- [ ] **T36** [S] @backend-dev — Atualizar engine.ts se necessario
  - Arquivo: `apps/api/src/mock/engine.ts`
  - Verificar se alguma alteracao e necessaria (provavelmente nenhuma — filtragem e no handler)
  - Criterio: testes existentes do engine continuam passando

---

## Fase 8: Testes de integracao backend

- [ ] **T37** [L] @tester — Criar suite de testes para WorkspaceService
  - Arquivo: `apps/api/tests/services/workspace-service.test.ts`
  - Cobrir: create, findAll, findBySlug, update, delete
  - Casos de borda: slug duplicado, delete do default, workspace inexistente
  - Criterio: cobertura >= 90% do service

- [ ] **T38** [L] @tester — Criar suite de testes para rotas de workspaces
  - Arquivo: `apps/api/tests/routes/workspaces.test.ts`
  - Testar todos os endpoints CRUD via Supertest
  - Criterio: cobertura >= 90% das rotas

- [ ] **T39** [M] @tester — Adaptar testes de EndpointService para workspaces
  - Arquivo: `apps/api/tests/services/endpoint-service.test.ts`
  - Atualizar fixtures para incluir workspaceId
  - Adicionar testes de isolamento entre workspaces
  - Criterio: todos os testes existentes passam + novos testes de workspace

- [ ] **T40** [M] @tester — Adaptar testes de rotas de endpoints para novos paths
  - Arquivo: `apps/api/tests/routes/endpoints.test.ts`
  - Atualizar URLs para `/api/workspaces/:slug/endpoints/*`
  - Adicionar testes de acesso cross-workspace (deve retornar 404)
  - Criterio: todos os testes existentes passam

- [ ] **T41** [M] @tester — Criar testes de integracao para mock handler com workspaces
  - Arquivo: `apps/api/tests/mock/handler.test.ts`
  - Testar: workspace valido, workspace invalido, isolamento de endpoints
  - Criterio: cobertura dos cenarios descritos na spec

---

## Fase 9: Frontend — Hooks

- [ ] **T42** [S] @frontend-dev — Criar tipo Workspace em types/workspace.ts
  - Arquivo: `apps/web/src/types/workspace.ts`
  - Definir interfaces Workspace e WorkspaceWithStats
  - Criterio: tipos compativeis com API

- [ ] **T43** [S] @frontend-dev — Criar hook useWorkspaces()
  - Arquivo: `apps/web/src/hooks/use-workspaces.ts`
  - Chamar GET /api/workspaces
  - Retornar lista com stats
  - Criterio: hook funciona com React Query

- [ ] **T44** [S] @frontend-dev — Criar hook useWorkspace(slug)
  - Arquivo: `apps/web/src/hooks/use-workspace.ts`
  - Chamar GET /api/workspaces/:slug
  - Criterio: hook funciona, retorna null para slug inexistente

- [ ] **T45** [S] @frontend-dev — Criar hook useCreateWorkspace()
  - Arquivo: `apps/web/src/hooks/use-create-workspace.ts`
  - Mutation para POST /api/workspaces
  - Invalidar cache de workspaces apos sucesso
  - Criterio: hook funciona, invalida cache

- [ ] **T46** [S] @frontend-dev — Criar hook useUpdateWorkspace()
  - Arquivo: `apps/web/src/hooks/use-update-workspace.ts`
  - Mutation para PUT /api/workspaces/:slug
  - Invalidar cache de workspaces apos sucesso
  - Criterio: hook funciona

- [ ] **T47** [S] @frontend-dev — Criar hook useDeleteWorkspace()
  - Arquivo: `apps/web/src/hooks/use-delete-workspace.ts`
  - Mutation para DELETE /api/workspaces/:slug
  - Invalidar cache e navegar para / apos sucesso
  - Criterio: hook funciona

- [ ] **T48** [M] @frontend-dev — Adaptar hooks de endpoints para receber slug
  - Arquivos: `apps/web/src/hooks/use-endpoints.ts`, `use-endpoint.ts`, `use-create-endpoint.ts`, etc.
  - Alterar URLs para `/api/workspaces/:slug/endpoints/*`
  - Incluir slug na queryKey para cache correto
  - Criterio: todos os hooks funcionam com novo path

---

## Fase 10: Frontend — Componentes de Workspace

- [ ] **T49** [M] @frontend-dev — Criar componente WorkspaceCard
  - Arquivo: `apps/web/src/components/workspace-card.tsx`
  - Exibir: nome, slug, contagem de endpoints (ativos/total)
  - Props: workspace, onClick
  - Estilo: card clicavel com hover state
  - Criterio: componente renderiza corretamente

- [ ] **T50** [M] @frontend-dev — Criar componente WorkspaceCreateDialog
  - Arquivo: `apps/web/src/components/workspace-create-dialog.tsx`
  - Campos: name (auto-gera slug), slug (editavel)
  - Validacao: regex de slug, min/max length
  - Usa useCreateWorkspace() para submit
  - Criterio: dialog funciona, valida, cria workspace

- [ ] **T51** [S] @frontend-dev — Criar componente WorkspaceEditDialog
  - Arquivo: `apps/web/src/components/workspace-edit-dialog.tsx`
  - Campos: name, slug (com aviso sobre quebra de URLs)
  - Usa useUpdateWorkspace()
  - Criterio: dialog funciona, mostra aviso ao editar slug

- [ ] **T52** [S] @frontend-dev — Criar componente WorkspaceDeleteDialog
  - Arquivo: `apps/web/src/components/workspace-delete-dialog.tsx`
  - Mostra contagem de endpoints que serao deletados
  - Requer confirmacao explicita
  - Usa useDeleteWorkspace()
  - Criterio: dialog funciona, mostra contagem, deleta

- [ ] **T53** [S] @frontend-dev — Criar componente WorkspaceSelector (breadcrumb)
  - Arquivo: `apps/web/src/components/workspace-selector.tsx`
  - Exibe nome do workspace atual no header
  - Link para voltar a lista de workspaces
  - Criterio: componente funciona, navegacao correta

---

## Fase 11: Frontend — Paginas

- [ ] **T54** [M] @frontend-dev — Criar pagina WorkspaceList (/)
  - Arquivo: `apps/web/src/pages/workspace-list.tsx`
  - Grid de WorkspaceCards
  - Botao "Novo workspace" que abre WorkspaceCreateDialog
  - Usa useWorkspaces()
  - Criterio: pagina renderiza, cria workspace funciona

- [ ] **T55** [M] @frontend-dev — Adaptar pagina EndpointsList para receber slug
  - Arquivo: `apps/web/src/pages/endpoints-list.tsx`
  - Extrair slug via useParams()
  - Passar slug para hooks
  - Adicionar WorkspaceSelector no topo
  - Adicionar botoes para editar/deletar workspace
  - Criterio: pagina funciona com workspace, isolamento visual

- [ ] **T56** [S] @frontend-dev — Adaptar pagina EndpointCreate para receber slug
  - Arquivo: `apps/web/src/pages/endpoint-create.tsx`
  - Extrair slug via useParams()
  - Passar slug para useCreateEndpoint()
  - Navegacao de volta para /workspaces/:slug/endpoints
  - Criterio: criacao funciona no workspace correto

- [ ] **T57** [S] @frontend-dev — Adaptar pagina EndpointEdit para receber slug
  - Arquivo: `apps/web/src/pages/endpoint-edit.tsx`
  - Extrair slug via useParams()
  - Passar slug para hooks
  - Navegacao de volta correta
  - Criterio: edicao funciona

- [ ] **T58** [M] @frontend-dev — Atualizar App.tsx com novas rotas
  - Arquivo: `apps/web/src/App.tsx`
  - Adicionar rotas: `/`, `/workspaces/:slug`, `/workspaces/:slug/endpoints`, etc.
  - Redirect de `/workspaces/:slug` para `/workspaces/:slug/endpoints`
  - Manter rotas antigas temporariamente (redirect para workspace default)
  - Criterio: navegacao funciona corretamente

- [ ] **T59** [S] @frontend-dev — Adaptar ImportModal para mostrar workspace de origem
  - Arquivo: `apps/web/src/components/import-modal.tsx`
  - Exibir nome e slug do workspace de origem (se presente no arquivo)
  - Indicar "(arquivo legado)" se version 1
  - Criterio: modal exibe info de origem

---

## Fase 12: Testes de componentes frontend

- [ ] **T60** [M] @tester — Criar testes para WorkspaceCard
  - Arquivo: `apps/web/tests/components/workspace-card.test.tsx`
  - Testar renderizacao, click handler
  - Criterio: testes passam

- [ ] **T61** [M] @tester — Criar testes para WorkspaceCreateDialog
  - Arquivo: `apps/web/tests/components/workspace-create-dialog.test.tsx`
  - Testar validacao de slug, submit
  - Criterio: testes passam

- [ ] **T62** [M] @tester — Criar testes para WorkspaceList page
  - Arquivo: `apps/web/tests/pages/workspace-list.test.tsx`
  - Testar loading, lista vazia, lista com itens
  - Criterio: testes passam

- [ ] **T63** [M] @tester — Adaptar testes existentes de EndpointsList
  - Arquivo: `apps/web/tests/pages/endpoints-list.test.tsx`
  - Mockar useParams para retornar slug
  - Criterio: testes existentes passam

---

## Fase 13: Documentacao e finalizacao

- [ ] **T64** [S] @backend-dev — Atualizar CLAUDE.md com informacoes de workspaces
  - Arquivo: `CLAUDE.md`
  - Adicionar Workspace ao modelo de dominio
  - Atualizar descricao das rotas
  - Criterio: documentacao atualizada

- [ ] **T65** [S] @backend-dev — Criar arquivo de migracao para rollback (opcional)
  - Arquivo: `apps/api/src/db/migrations/XXXX_revert_workspaces.sql`
  - SQL para reverter a migracao (caso necessario)
  - Criterio: rollback funciona em ambiente de teste

- [ ] **T66** [M] @code-reviewer — Revisao de codigo completa
  - Revisar: schema, services, rotas, hooks, componentes
  - Verificar: tipos TypeScript, tratamento de erros, cobertura de testes
  - Criterio: aprovacao do reviewer

- [ ] **T67** [S] @backend-dev — Merge e deploy em ambiente de staging
  - Executar migration em staging
  - Testar fluxo completo E2E
  - Criterio: staging funciona corretamente

---

## Resumo

| Fase | Tarefas | Estimativa total |
|------|---------|------------------|
| 1. Modelo de dados | T01-T04 | ~5h |
| 2. WorkspaceService | T05-T09 | ~4h |
| 3. Rotas de Workspaces | T10-T15 | ~4h |
| 4. Adaptar EndpointService | T16-T21 | ~4h |
| 5. Adaptar rotas de Endpoints | T22-T29 | ~5h |
| 6. Adaptar Import/Export | T30-T34 | ~4h |
| 7. Mock Handler | T35-T36 | ~3h |
| 8. Testes backend | T37-T41 | ~8h |
| 9. Frontend Hooks | T42-T48 | ~4h |
| 10. Frontend Componentes | T49-T53 | ~4h |
| 11. Frontend Paginas | T54-T59 | ~5h |
| 12. Testes frontend | T60-T63 | ~4h |
| 13. Finalizacao | T64-T67 | ~3h |
| **Total** | **67 tarefas** | **~57h** |

---

## Dependencias entre tarefas

```
T01 → T02 → T03 → T04
                   ↓
              T05-T09 (WorkspaceService)
                   ↓
              T10-T15 (rotas workspaces)
                   ↓
              T16-T21 (adaptar EndpointService) → T22-T29 (adaptar rotas endpoints)
                   ↓
              T30-T34 (import/export)
                   ↓
              T35-T36 (mock handler)
                   ↓
              T37-T41 (testes backend)

T04 → T42 (tipos frontend)
         ↓
      T43-T48 (hooks frontend)
         ↓
      T49-T53 (componentes)
         ↓
      T54-T59 (paginas)
         ↓
      T60-T63 (testes frontend)

T41 + T63 → T66 (code review) → T67 (deploy)
```
