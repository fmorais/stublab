# Tasks — Spec 007: Proxy Mode

**Spec:** 007-proxy-mode  
**Design:** em revisao  
**Data:** 2026-04-05

---

## Pre-requisitos

- [X] Design aprovado pelo @architect
- [X] Branch criada: `feat/007-proxy-mode`
- [ ] Spec 006 (workspaces) implementada e mergeada

---

## Fase 1: Configuracao e modelo de dados

- [ ] **T70** [S] @backend-dev — Criar modulo de configuracao de ambiente
  - Arquivo: `apps/api/src/config/env.ts`
  - Implementar funcoes `parseBoolean()` e `parseNumber()` para parsing seguro
  - Exportar objeto `env` com `proxyEnabled` e `proxyTimeoutMs`
  - Exportar funcoes `isProxyGloballyEnabled()` e `getProxyTimeoutMs()`
  - Criterio: testes unitarios para parsing de valores validos, invalidos e defaults

- [ ] **T71** [S] @backend-dev — Atualizar schema Drizzle com campos de proxy
  - Arquivo: `apps/api/src/db/schema.ts`
  - Adicionar campo `proxyUrl: text('proxy_url')` (nullable)
  - Adicionar campo `proxyEnabled: integer('proxy_enabled', { mode: 'boolean' }).notNull().default(false)`
  - Criterio: schema compila sem erros TypeScript

- [ ] **T72** [S] @backend-dev — Gerar e aplicar migration para campos de proxy
  - Executar `pnpm db:generate` para gerar migration
  - Verificar SQL gerado: `ALTER TABLE workspaces ADD COLUMN proxy_url TEXT; ALTER TABLE workspaces ADD COLUMN proxy_enabled INTEGER NOT NULL DEFAULT 0;`
  - Executar `pnpm db:migrate` para aplicar
  - Testar com banco existente (workspaces ja cadastrados devem ter proxy_enabled=false)
  - Criterio: migration executa sem erro; workspaces existentes preservados

- [ ] **T73** [S] @backend-dev — Atualizar tipos TypeScript de workspace
  - Arquivo: `apps/api/src/types/workspace.ts`
  - Adicionar `proxyUrl: string | null` a interface `Workspace`
  - Adicionar `proxyEnabled: boolean` a interface `Workspace`
  - Adicionar `proxyUrl?: string | null` a interface `UpdateWorkspaceInput`
  - Adicionar `proxyEnabled?: boolean` a interface `UpdateWorkspaceInput`
  - Criterio: tipos compativeis com schema Drizzle

---

## Fase 2: ProxyService

- [ ] **T74** [M] @backend-dev — Criar ProxyService com interface e tipos
  - Arquivo: `apps/api/src/services/proxy-service.ts`
  - Definir interface `ProxyRequest` com campos: method, path, headers, body, targetBaseUrl, clientIp, originalHost, originalProto, timeoutMs
  - Definir interface `ProxyResponse` com campos: status, headers, body (Readable stream)
  - Definir classe `ProxyServiceError` com codes: `PROXY_TIMEOUT`, `PROXY_ERROR`
  - Criterio: interfaces exportadas e documentadas

- [ ] **T75** [M] @backend-dev — Implementar funcao buildProxyHeaders()
  - Arquivo: `apps/api/src/services/proxy-service.ts`
  - Remover headers `X-Stublab-*` da request original
  - Substituir header `Host` pelo host da URL de destino
  - Adicionar `X-Forwarded-For` com IP do cliente
  - Adicionar `X-Forwarded-Host` com host original
  - Adicionar `X-Forwarded-Proto` com protocolo original
  - Criterio: testes unitarios cobrindo todos os cenarios de headers

- [ ] **T76** [L] @backend-dev — Implementar ProxyService.forward()
  - Arquivo: `apps/api/src/services/proxy-service.ts`
  - Usar `undici.request()` para fazer chamada HTTP
  - Construir URL de destino: `targetBaseUrl + path`
  - Passar headers via `buildProxyHeaders()`
  - Configurar timeout via `AbortController` com signal
  - Retornar status, headers e body (stream) da response
  - Tratar erros:
    - Timeout (AbortError) -> `ProxyServiceError('PROXY_TIMEOUT', ...)`
    - Connection refused -> `ProxyServiceError('PROXY_ERROR', ..., 'ECONNREFUSED')`
    - DNS failed -> `ProxyServiceError('PROXY_ERROR', ..., 'ENOTFOUND')`
    - Outros erros -> `ProxyServiceError('PROXY_ERROR', ..., error.message)`
  - Criterio: testes unitarios com mock do undici para caso feliz e todos os erros

---

## Fase 3: Integracao com mock handler

- [ ] **T77** [M] @backend-dev — Modificar handler para suportar proxy mode
  - Arquivo: `apps/api/src/mock/handler.ts`
  - Importar `ProxyService`, `ProxyServiceError`
  - Importar `isProxyGloballyEnabled`, `getProxyTimeoutMs` de `config/env.ts`
  - Apos `matchEndpoint()` retornar null:
    1. Verificar se `isProxyGloballyEnabled()` retorna true
    2. Verificar se `workspace.proxyEnabled` e true
    3. Verificar se `workspace.proxyUrl` nao e null
    4. Se todas condicoes satisfeitas, chamar `ProxyService.forward()`
    5. Adicionar header `X-Stublab-Proxied: true` na response
    6. Retornar status, headers e body do proxy
  - Manter comportamento atual (404) se proxy nao aplicavel
  - Criterio: testes de integracao para proxy ativo, proxy inativo, proxy global desabilitado

- [ ] **T78** [S] @backend-dev — Implementar tratamento de erros do proxy no handler
  - Arquivo: `apps/api/src/mock/handler.ts`
  - Capturar `ProxyServiceError` no catch
  - Se `PROXY_TIMEOUT`: retornar 504 com body `{ error: "Proxy timeout", code: "PROXY_TIMEOUT", target: "..." }`
  - Se `PROXY_ERROR`: retornar 502 com body `{ error: "Proxy error", code: "PROXY_ERROR", target: "...", reason: "..." }`
  - Adicionar header `X-Stublab-Proxied: true` mesmo em erros
  - Criterio: testes de integracao para timeout e connection error

---

## Fase 4: Rotas de API

- [ ] **T79** [S] @backend-dev — Atualizar rota PUT /api/workspaces/:slug para aceitar campos de proxy
  - Arquivo: `apps/api/src/routes/workspaces/update.ts`
  - Adicionar `proxyUrl` ao schema Zod com validacao:
    - Deve ser URL valida
    - Protocolo deve ser http ou https
    - Nao deve ter path alem de `/`
    - Remover trailing slash automaticamente
    - Aceitar null para limpar
  - Adicionar `proxyEnabled` ao schema Zod (boolean opcional)
  - Passar campos para `WorkspaceService.update()`
  - Criterio: testes de integracao para URL valida, invalida, com path, trailing slash

- [ ] **T80** [S] @backend-dev — Atualizar WorkspaceService para persistir campos de proxy
  - Arquivo: `apps/api/src/services/workspace-service.ts`
  - Modificar `update()` para aceitar e persistir `proxyUrl` e `proxyEnabled`
  - Modificar `rowToWorkspace()` para incluir campos de proxy no retorno
  - Criterio: testes unitarios para update de proxy settings

- [ ] **T81** [S] @backend-dev — Criar rota GET /api/config/proxy
  - Arquivo: `apps/api/src/routes/config/proxy.ts`
  - Retornar `{ globallyEnabled: boolean, timeoutMs: number }` baseado nas env vars
  - Importar valores de `config/env.ts`
  - Criterio: teste de integracao retorna valores corretos

- [ ] **T82** [S] @backend-dev — Registrar rota de config no app.ts
  - Arquivo: `apps/api/src/app.ts`
  - Importar e registrar `proxyConfigRoute`
  - Prefix: `/api/config`
  - Criterio: rota responde corretamente

---

## Fase 5: Atualizacao de arquivos de configuracao

- [ ] **T83** [S] @backend-dev — Atualizar .env.example com variaveis de proxy
  - Arquivo: `.env.example`
  - Adicionar secao "Proxy Mode" com:
    - `PROXY_ENABLED=true` com comentario explicativo
    - `PROXY_TIMEOUT_MS=10000` com comentario explicativo
  - Criterio: arquivo atualizado e documentado

- [ ] **T84** [S] @backend-dev — Atualizar docker-compose.yml com variaveis de proxy
  - Arquivo: `docker-compose.yml`
  - Adicionar na secao `environment`:
    - `PROXY_ENABLED: "${PROXY_ENABLED:-true}"`
    - `PROXY_TIMEOUT_MS: "${PROXY_TIMEOUT_MS:-10000}"`
  - Criterio: variaveis disponiveis no container

---

## Fase 6: Testes de backend

- [ ] **T85** [M] @tester — Criar testes unitarios para config/env.ts
  - Arquivo: `apps/api/tests/config/env.test.ts`
  - Testar `parseBoolean()`: 'true', 'false', '0', '1', undefined, valores invalidos
  - Testar `parseNumber()`: numeros validos, undefined, NaN, strings
  - Testar `isProxyGloballyEnabled()` e `getProxyTimeoutMs()` com env vars mockadas
  - Criterio: cobertura >= 90%

- [ ] **T86** [M] @tester — Criar testes unitarios para buildProxyHeaders()
  - Arquivo: `apps/api/tests/services/proxy-service.test.ts`
  - Cenarios:
    - Headers normais sao preservados
    - Header Host e substituido
    - Headers X-Stublab-* sao removidos
    - X-Forwarded-For, X-Forwarded-Host, X-Forwarded-Proto sao adicionados
  - Criterio: todos os cenarios cobertos

- [ ] **T87** [L] @tester — Criar testes unitarios para ProxyService.forward()
  - Arquivo: `apps/api/tests/services/proxy-service.test.ts`
  - Mockar `undici.request()` com vi.mock
  - Cenarios:
    - Caso feliz: retorna status, headers e body
    - Timeout: AbortError -> ProxyServiceError PROXY_TIMEOUT
    - Connection refused: ECONNREFUSED -> ProxyServiceError PROXY_ERROR
    - DNS failed: ENOTFOUND -> ProxyServiceError PROXY_ERROR
    - Erro generico: -> ProxyServiceError PROXY_ERROR
  - Criterio: cobertura >= 90% do service

- [ ] **T88** [L] @tester — Criar testes de integracao para proxy no handler
  - Arquivo: `apps/api/tests/mock/handler-proxy.test.ts`
  - Setup: criar workspace com proxy configurado, mockar servico externo
  - Cenarios:
    - Request com match de mock: retorna mock (proxy nao acionado)
    - Request sem match, proxy ativo: proxia para servico real
    - Request sem match, proxy inativo: retorna 404
    - Request sem match, proxy global desabilitado: retorna 404
    - Proxy retorna erro: retorna 502/504 com X-Stublab-Proxied header
  - Usar `nock` ou servidor de teste local para simular servico real
  - Criterio: todos os cenarios da spec cobertos

- [ ] **T89** [M] @tester — Criar testes de integracao para validacao de proxyUrl
  - Arquivo: `apps/api/tests/routes/workspaces/update-proxy.test.ts`
  - Cenarios:
    - URL valida: aceita e salva
    - URL com protocolo invalido (ftp://): rejeita com erro
    - URL com path (/api/v1): rejeita com erro
    - URL com trailing slash: aceita e remove
    - proxyEnabled true/false: persiste corretamente
    - proxyUrl null: limpa valor existente
  - Criterio: todos os cenarios de validacao cobertos

- [ ] **T90** [S] @tester — Criar teste de integracao para GET /api/config/proxy
  - Arquivo: `apps/api/tests/routes/config/proxy.test.ts`
  - Cenarios:
    - Retorna valores default quando env vars nao definidas
    - Retorna valores corretos quando env vars definidas
  - Criterio: ambos cenarios passam

---

## Fase 7: Frontend — Tipos e hooks

- [ ] **T91** [S] @frontend-dev — Atualizar tipos TypeScript de workspace no frontend
  - Arquivo: `apps/web/src/types/workspace.ts`
  - Adicionar `proxyUrl: string | null` a interface `Workspace`
  - Adicionar `proxyEnabled: boolean` a interface `Workspace`
  - Adicionar `proxyUrl?: string | null` a interface `UpdateWorkspaceInput`
  - Adicionar `proxyEnabled?: boolean` a interface `UpdateWorkspaceInput`
  - Criterio: tipos compativeis com API

- [ ] **T92** [S] @frontend-dev — Criar hook useProxyConfig()
  - Arquivo: `apps/web/src/hooks/use-proxy-config.ts`
  - Chamar GET /api/config/proxy
  - Retornar `{ globallyEnabled: boolean, timeoutMs: number }`
  - Usar React Query com cache de 5 minutos (staleTime)
  - Criterio: hook funciona e retorna dados corretos

---

## Fase 8: Frontend — Componentes

- [ ] **T93** [M] @frontend-dev — Adicionar secao de proxy no WorkspaceEditDialog
  - Arquivo: `apps/web/src/components/workspace-edit-dialog.tsx`
  - Adicionar states: `proxyUrl`, `proxyEnabled`
  - Adicionar secao visual apos campos existentes:
    - Titulo "Proxy Mode" com borda superior
    - Alert de aviso se proxy globalmente desabilitado (usar useProxyConfig)
    - Switch para proxyEnabled com label explicativo
    - Input para proxyUrl (visivel apenas se proxyEnabled=true)
    - Texto de ajuda explicando o comportamento
  - Incluir campos no submit
  - Adicionar validacao client-side da URL (protocolo, sem path)
  - Criterio: UI funciona, validacao funciona, submit persiste

- [ ] **T94** [S] @frontend-dev — Adicionar validacao de proxyUrl no frontend
  - Arquivo: `apps/web/src/components/workspace-edit-dialog.tsx`
  - Validar na funcao validate():
    - Se proxyEnabled=true e proxyUrl vazio: erro "URL e obrigatoria quando proxy esta ativo"
    - Se proxyUrl preenchida: validar formato (URL valida, http/https, sem path)
  - Exibir mensagens de erro abaixo do input
  - Criterio: todas as validacoes funcionam com feedback visual

- [ ] **T95** [S] @frontend-dev — Adicionar badge "Proxy ativo" no WorkspaceSelector
  - Arquivo: `apps/web/src/components/workspace-selector.tsx`
  - Importar Badge e icone ArrowUpRight (ou similar) do lucide-react
  - Condicional: se `workspace.proxyEnabled && workspace.proxyUrl`
    - Renderizar Badge com texto "Proxy ativo" e icone
    - Estilo: variant="secondary", tamanho pequeno
  - Opcional: tooltip com a URL do proxy ao passar o mouse
  - Criterio: badge aparece quando proxy ativo, desaparece quando inativo

- [ ] **T96** [S] @frontend-dev — Adicionar indicacao de proxy global desabilitado na UI
  - Arquivo: `apps/web/src/components/workspace-edit-dialog.tsx`
  - Usar resultado de `useProxyConfig()`
  - Se `globallyEnabled=false`:
    - Mostrar Alert amarelo: "Proxy mode desativado globalmente pelo administrador"
    - Desabilitar Switch de proxyEnabled (disabled=true)
    - Manter Input de proxyUrl editavel (permite salvar para quando for reativado)
  - Criterio: UI reflete estado global corretamente

---

## Fase 9: Testes de frontend

- [ ] **T97** [M] @tester — Criar testes para secao de proxy no WorkspaceEditDialog
  - Arquivo: `apps/web/tests/components/workspace-edit-dialog-proxy.test.tsx`
  - Cenarios:
    - Campos de proxy renderizam corretamente
    - Switch toggle atualiza estado
    - Input de URL aparece/desaparece com toggle
    - Validacao de URL funciona (erro quando invalida)
    - Submit inclui campos de proxy
    - Alert aparece quando proxy global desabilitado
    - Switch desabilitado quando proxy global desabilitado
  - Criterio: todos os cenarios passam

- [ ] **T98** [S] @tester — Criar testes para badge de proxy no WorkspaceSelector
  - Arquivo: `apps/web/tests/components/workspace-selector.test.tsx`
  - Cenarios:
    - Badge aparece quando proxyEnabled=true e proxyUrl nao-null
    - Badge nao aparece quando proxyEnabled=false
    - Badge nao aparece quando proxyUrl=null
  - Criterio: todos os cenarios passam

- [ ] **T99** [S] @tester — Criar testes para hook useProxyConfig
  - Arquivo: `apps/web/tests/hooks/use-proxy-config.test.tsx`
  - Mockar apiClient
  - Cenarios:
    - Retorna dados da API corretamente
    - Loading state funciona
    - Error state funciona
  - Criterio: todos os cenarios passam

---

## Fase 10: Documentacao e finalizacao

- [ ] **T100** [S] @backend-dev — Atualizar CLAUDE.md com informacoes de proxy
  - Arquivo: `CLAUDE.md`
  - Adicionar campos `proxyUrl` e `proxyEnabled` ao modelo de Workspace
  - Adicionar descricao do comportamento de proxy na secao relevante
  - Documentar variaveis de ambiente PROXY_ENABLED e PROXY_TIMEOUT_MS
  - Criterio: documentacao atualizada e clara

- [ ] **T101** [S] @backend-dev — Atualizar README.md com feature de proxy
  - Arquivo: `README.md`
  - Adicionar secao explicando o proxy mode
  - Incluir exemplo de configuracao
  - Mencionar variaveis de ambiente
  - Criterio: README reflete nova funcionalidade

- [ ] **T102** [M] @code-reviewer — Revisao de codigo completa
  - Revisar: schema, services, rotas, hooks, componentes
  - Verificar: tipos TypeScript, tratamento de erros, cobertura de testes
  - Verificar: seguranca (headers removidos, validacao de URL)
  - Criterio: aprovacao do reviewer

- [ ] **T103** [S] @backend-dev — Merge e deploy em ambiente de staging
  - Executar migration em staging
  - Testar fluxo completo E2E:
    1. Criar workspace com proxy configurado
    2. Fazer request sem mock
    3. Verificar que request foi proxiada
  - Criterio: staging funciona corretamente

---

## Resumo

| Fase | Tarefas | Estimativa total |
|------|---------|------------------|
| 1. Configuracao e modelo | T70-T73 | ~3h |
| 2. ProxyService | T74-T76 | ~5h |
| 3. Integracao handler | T77-T78 | ~3h |
| 4. Rotas de API | T79-T82 | ~3h |
| 5. Arquivos de config | T83-T84 | ~1h |
| 6. Testes backend | T85-T90 | ~8h |
| 7. Frontend tipos/hooks | T91-T92 | ~1h |
| 8. Frontend componentes | T93-T96 | ~4h |
| 9. Testes frontend | T97-T99 | ~3h |
| 10. Finalizacao | T100-T103 | ~3h |
| **Total** | **34 tarefas** | **~34h** |

---

## Dependencias entre tarefas

```
T70 (env config) ─────────────────────────────┐
                                              │
T71 (schema) → T72 (migration) → T73 (types) ─┤
                                              │
                                              ▼
                              T74 → T75 → T76 (ProxyService)
                                              │
                                              ▼
                              T77 → T78 (handler integration)
                                              │
                              ┌───────────────┴───────────────┐
                              ▼                               ▼
                T79 → T80 (workspace API)          T81 → T82 (config API)
                              │                               │
                              └───────────────┬───────────────┘
                                              │
                              ┌───────────────┼───────────────┐
                              ▼               ▼               ▼
                    T83-T84 (env files)   T85-T90 (tests)   T91-T92 (frontend types)
                                              │                     │
                                              │                     ▼
                                              │           T93 → T94 → T95 → T96 (components)
                                              │                     │
                                              │                     ▼
                                              │             T97 → T98 → T99 (frontend tests)
                                              │                     │
                                              └──────────┬──────────┘
                                                         ▼
                                            T100 → T101 → T102 → T103 (finalizacao)
```

---

## Notas para implementacao

### Para @backend-dev

1. **undici ja vem com Node 20+**, nao precisa instalar. Importar com `import { request } from 'undici'`
2. **Streaming**: usar `request.raw` do Fastify como body da request para undici, e `reply.send(stream)` para response
3. **Timeout**: `AbortController` com `setTimeout` para cancelar apos PROXY_TIMEOUT_MS

### Para @frontend-dev

1. **Switch**: usar componente do shadcn/ui (`npx shadcn-ui@latest add switch` se nao existir)
2. **Alert**: usar componente do shadcn/ui com variant="warning" para aviso de proxy global
3. **Badge**: ja existe no projeto, usar variant="secondary"

### Para @tester

1. **Mock de servico externo**: usar `nock` para interceptar requests HTTP nos testes de integracao
2. **Env vars em testes**: usar `vi.stubEnv()` ou modificar `process.env` diretamente antes de importar modulos
