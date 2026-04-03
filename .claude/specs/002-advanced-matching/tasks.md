# Tasks — Matching avancado de requests

**Spec:** 002-advanced-matching
**Dependencia:** Spec 001 (100% concluida)
**Criado em:** 2026-04-03

---

## Pre-requisitos

- [x] Spec 001 concluida e funcionando
- [ ] Design.md aprovado pelo tech lead
- [ ] Ambiente de dev configurado (`pnpm install`, `pnpm db:migrate`)

---

## Fase 1: Schema e tipos

### T01 [S] @backend-dev — Adicionar tabela `matching_rules` no schema Drizzle

**Arquivo:** `apps/api/src/db/schema.ts`

**O que fazer:**
- Adicionar definicao da tabela `matching_rules` com campos: id, endpointId (FK), source, field, operator, value, createdAt
- Adicionar indice em `endpoint_id`
- Configurar `onDelete: 'cascade'` na foreign key

**Criterio de conclusao:**
- Schema compila sem erros
- `pnpm db:generate` gera migration valida
- `pnpm db:migrate` aplica sem erro

---

### T02 [S] @backend-dev — Garantir foreign keys habilitadas no SQLite

**Arquivos:** `apps/api/src/db/index.ts` ou config do Drizzle

**O que fazer:**
- Verificar/adicionar `PRAGMA foreign_keys = ON` na conexao SQLite
- Testar que delete de endpoint cascateia para regras

**Criterio de conclusao:**
- Teste manual: criar endpoint, criar regra, deletar endpoint, regra some
- Ou: teste automatizado cobrindo cascade

---

### T03 [S] @backend-dev — Atualizar tipos TypeScript para incluir MatchingRule

**Arquivo:** `apps/api/src/types/endpoint.ts`

**O que fazer:**
- Adicionar tipos: `RuleSource`, `RuleOperator`, `MatchingRule`, `MatchingRuleInput`
- Atualizar `Endpoint` para incluir `matchingRules: MatchingRule[]`
- Atualizar `CreateEndpointInput` para incluir `matchingRules?: MatchingRuleInput[]`
- Atualizar `UpdateEndpointInput` para incluir `matchingRules?: MatchingRuleInput[]`

**Criterio de conclusao:**
- Tipos compilam sem erro
- Tipos exportados para uso em services e routes

---

### T04 [S] @frontend-dev — Espelhar tipos de MatchingRule no frontend

**Arquivo:** `apps/web/src/types/endpoint.ts`

**O que fazer:**
- Adicionar mesmos tipos do backend: `RuleSource`, `RuleOperator`, `MatchingRule`, `MatchingRuleInput`
- Atualizar `Endpoint`, `CreateEndpointInput`, `UpdateEndpointInput`

**Criterio de conclusao:**
- Tipos compilam sem erro
- Consistentes com backend

---

## Fase 2: Service layer

### T05 [M] @backend-dev — Implementar MatchingRuleService com operacoes basicas

**Arquivo:** `apps/api/src/services/matching-rule-service.ts` (novo)

**O que fazer:**
- `createMany(endpointId, rules[])`: insere multiplas regras em batch
- `deleteByEndpointId(endpointId)`: remove todas regras de um endpoint
- `findByEndpointId(endpointId)`: retorna regras de um endpoint
- `findByEndpointIds(ids[])`: retorna regras agrupadas por endpoint (para listagem)

**Criterio de conclusao:**
- Testes unitarios para cada metodo
- Validacao de campos (field nao vazio, value obrigatorio para eq/neq/contains)

---

### T06 [M] @backend-dev — Atualizar EndpointService.create para aceitar matchingRules

**Arquivo:** `apps/api/src/services/endpoint-service.ts`

**O que fazer:**
- Receber `matchingRules?: MatchingRuleInput[]` no input
- Apos criar endpoint, chamar `MatchingRuleService.createMany` se rules presentes
- Incluir `matchingRules` no retorno

**Criterio de conclusao:**
- Teste: criar endpoint com 2 regras, verificar que regras foram salvas
- Teste: criar endpoint sem regras, verificar que funciona igual antes

---

### T07 [M] @backend-dev — Atualizar EndpointService.update para gerenciar matchingRules

**Arquivo:** `apps/api/src/services/endpoint-service.ts`

**O que fazer:**
- Se `matchingRules` presente no input (mesmo que []):
  - Deletar regras existentes (`MatchingRuleService.deleteByEndpointId`)
  - Criar novas regras (`MatchingRuleService.createMany`)
- Se `matchingRules` omitido: nao alterar regras
- Incluir `matchingRules` no retorno

**Criterio de conclusao:**
- Teste: atualizar endpoint com novas regras, verificar substituicao
- Teste: atualizar endpoint com `matchingRules: []`, verificar que regras foram removidas
- Teste: atualizar endpoint sem campo `matchingRules`, verificar que regras permanecem

---

### T08 [S] @backend-dev — Atualizar EndpointService.findById para incluir matchingRules

**Arquivo:** `apps/api/src/services/endpoint-service.ts`

**O que fazer:**
- Apos buscar endpoint, buscar regras via `MatchingRuleService.findByEndpointId`
- Retornar endpoint com `matchingRules` populado

**Criterio de conclusao:**
- Teste: buscar endpoint com regras, verificar que `matchingRules` esta presente
- Teste: buscar endpoint sem regras, verificar que `matchingRules` e []

---

### T09 [M] @backend-dev — Atualizar EndpointService.findAll para incluir matchingRules

**Arquivo:** `apps/api/src/services/endpoint-service.ts`

**O que fazer:**
- Apos buscar endpoints, coletar IDs
- Buscar regras em batch via `MatchingRuleService.findByEndpointIds`
- Mapear regras para cada endpoint no retorno

**Criterio de conclusao:**
- Teste: listar endpoints, cada um tem `matchingRules` (pode ser [])
- Performance: apenas 2 queries (endpoints + regras), nao N+1

---

## Fase 3: Rotas da API

### T10 [S] @backend-dev — Atualizar rota POST /api/endpoints

**Arquivo:** `apps/api/src/routes/endpoints/create.ts`

**O que fazer:**
- Adicionar `matchingRules` ao schema Zod de validacao
- Validar: value obrigatorio para eq/neq/contains
- Validar: limite de 20 regras por endpoint
- Passar para service

**Criterio de conclusao:**
- Teste de integracao: criar endpoint com regras validas → 201
- Teste de integracao: criar com regra invalida (eq sem value) → 400
- Teste de integracao: criar com 21 regras → 400

---

### T11 [S] @backend-dev — Atualizar rota PUT /api/endpoints/:id

**Arquivo:** `apps/api/src/routes/endpoints/update.ts`

**O que fazer:**
- Adicionar `matchingRules` ao schema Zod (opcional)
- Mesmas validacoes de create
- Passar para service

**Criterio de conclusao:**
- Teste de integracao: atualizar com novas regras → regras substituidas
- Teste de integracao: atualizar com `matchingRules: []` → regras removidas

---

### T12 [S] @backend-dev — Verificar rotas GET (ja devem funcionar)

**Arquivos:** `apps/api/src/routes/endpoints/get.ts`, `list.ts`

**O que fazer:**
- Verificar que responses incluem `matchingRules`
- Ajustar se necessario

**Criterio de conclusao:**
- Teste de integracao: GET /api/endpoints/:id retorna `matchingRules`
- Teste de integracao: GET /api/endpoints retorna `matchingRules` em cada item

---

## Fase 4: Mock engine

### T13 [M] @backend-dev — Implementar funcao de avaliacao de regra

**Arquivo:** `apps/api/src/mock/rule-evaluator.ts` (novo)

**O que fazer:**
- `evaluateRule(rule, queryParams, headers, body)`: retorna boolean
- Implementar logica para cada operator: eq, neq, contains, exists, not_exists
- Implementar `getNestedValue` para body com dot notation
- Headers: busca case-insensitive pelo nome

**Criterio de conclusao:**
- Testes unitarios cobrindo todos os operadores
- Testes para casos de borda: campo inexistente, body nao-JSON, array index

---

### T14 [M] @backend-dev — Atualizar matchEndpoint para usar regras

**Arquivo:** `apps/api/src/mock/engine.ts`

**O que fazer:**
- Alterar assinatura: `matchEndpoint(method, path, queryParams, headers, body, endpoints)`
- Fase 1: filtrar por method + path (existente)
- Fase 2: ordenar por especificidade (existente)
- Fase 3: avaliar regras e calcular score
- Fase 4: selecionar vencedor (maior score, desempate por createdAt)

**Criterio de conclusao:**
- Testes unitarios para cenarios de matching com regras
- Testes para empate de score
- Testes existentes continuam passando (endpoints sem regras)

---

### T15 [S] @backend-dev — Atualizar mockHandler para passar dados extras para engine

**Arquivo:** `apps/api/src/mock/handler.ts`

**O que fazer:**
- Extrair query params, headers, body da request
- Passar para `matchEndpoint`
- Carregar endpoints com suas `matchingRules` (via service atualizado)

**Criterio de conclusao:**
- Teste de integracao E2E: request com query param aciona endpoint correto
- Teste de integracao E2E: request com header aciona endpoint correto
- Teste de integracao E2E: request com body JSON aciona endpoint correto

---

## Fase 5: Frontend — Tipos e hooks

### T16 [S] @frontend-dev — Criar schema Zod para validacao de regras no form

**Arquivo:** `apps/web/src/schemas/matching-rule.ts` (novo)

**O que fazer:**
- Schema `matchingRuleSchema` com validacao condicional de `value`
- Exportar para uso no formulario

**Criterio de conclusao:**
- Schema compila
- Validacao correta: eq sem value → erro; exists com value → warning ou clear

---

### T17 [S] @frontend-dev — Atualizar hooks de endpoint para incluir matchingRules

**Arquivos:** `apps/web/src/hooks/use-endpoints.ts` (ou equivalente)

**O que fazer:**
- Verificar que tipos de request/response incluem `matchingRules`
- Ajustar se necessario (provavelmente ja funciona com tipos atualizados)

**Criterio de conclusao:**
- `createEndpoint` aceita `matchingRules`
- `updateEndpoint` aceita `matchingRules`
- Dados retornados incluem `matchingRules`

---

## Fase 6: Frontend — Componentes

### T18 [M] @frontend-dev — Criar componente MatchingRuleRow

**Arquivo:** `apps/web/src/components/matching-rule-row.tsx` (novo)

**O que fazer:**
- Props: rule data, onChange, onRemove, error state
- Select para source (query/header/body)
- Input para field
- Select para operator
- Input para value (desabilitado se operator e exists/not_exists)
- Botao de remover (icone X)
- Usar shadcn/ui: Select, Input, Button

**Criterio de conclusao:**
- Componente renderiza corretamente
- Campos controlados funcionam
- Value desabilitado para exists/not_exists

---

### T19 [M] @frontend-dev — Criar componente MatchingRulesSection

**Arquivo:** `apps/web/src/components/matching-rules-section.tsx` (novo)

**O que fazer:**
- Props: rules array, onChange (para array inteiro)
- Renderiza lista de `MatchingRuleRow`
- Botao "Adicionar regra"
- Limite visual de 20 regras (botao desabilitado)
- Secao colapsavel com Collapsible do shadcn

**Criterio de conclusao:**
- Adicionar regra funciona
- Remover regra funciona
- Limite de 20 regras respeitado
- Colapsa/expande corretamente

---

### T20 [S] @frontend-dev — Criar componente MatchingRulePreview

**Arquivo:** `apps/web/src/components/matching-rule-preview.tsx` (novo)

**O que fazer:**
- Props: rules array, method, path
- Gera texto descritivo de request exemplo
- Ex: "POST /api/pagamentos com header x-tenant-id e body {tipo: 'PIX'}"

**Criterio de conclusao:**
- Preview atualiza ao mudar regras
- Texto legivel e util

---

### T21 [M] @frontend-dev — Integrar MatchingRulesSection no EndpointForm

**Arquivo:** `apps/web/src/components/endpoint-form.tsx` (criar se nao existir)

**O que fazer:**
- Adicionar campo `matchingRules` ao form schema
- Renderizar `MatchingRulesSection` abaixo dos campos de response
- Conectar com react-hook-form (useFieldArray)
- Incluir `MatchingRulePreview`

**Criterio de conclusao:**
- Form de criacao permite adicionar regras
- Form de edicao carrega regras existentes
- Submit envia regras para API
- Erros de validacao exibidos inline

---

### T22 [S] @frontend-dev — Exibir badge de regras na listagem de endpoints

**Arquivo:** `apps/web/src/pages/endpoints-list.tsx` (ou equivalente)

**O que fazer:**
- Na tabela de endpoints, adicionar indicador visual de quantas regras cada endpoint tem
- Ex: badge "2 regras" ou icone com tooltip

**Criterio de conclusao:**
- Usuarios conseguem identificar endpoints com regras na listagem

---

## Fase 7: Testes de integracao

### T23 [M] @tester — Testes de integracao para POST /api/endpoints com regras

**Arquivo:** `apps/api/tests/routes/endpoints/create.test.ts`

**Cenarios:**
- Criar endpoint com 0 regras → funciona igual antes
- Criar endpoint com 1 regra valida → 201, regra salva
- Criar endpoint com 3 regras validas → 201, todas salvas
- Criar com regra eq sem value → 400
- Criar com regra exists com value → 400 (ou aceita e ignora, conforme design)
- Criar com 21 regras → 400
- Criar com field vazio → 400

**Criterio de conclusao:**
- Todos os cenarios cobertos
- Testes passando

---

### T24 [M] @tester — Testes de integracao para PUT /api/endpoints/:id com regras

**Arquivo:** `apps/api/tests/routes/endpoints/update.test.ts`

**Cenarios:**
- Atualizar endpoint: adicionar regras onde nao tinha
- Atualizar endpoint: substituir regras existentes
- Atualizar endpoint: remover todas regras (`matchingRules: []`)
- Atualizar endpoint: omitir `matchingRules` → regras nao alteradas
- Validacoes identicas ao create

**Criterio de conclusao:**
- Todos os cenarios cobertos
- Testes passando

---

### T25 [M] @tester — Testes de integracao para mock engine com regras

**Arquivo:** `apps/api/tests/mock/engine.test.ts`

**Cenarios:**
- Request satisfaz regra de query → endpoint com regra responde
- Request nao satisfaz regra → fallback responde
- Multiplos endpoints, maior score ganha
- Empate de score → createdAt mais recente ganha
- Endpoint sem regras e fallback (score 0)
- Regra de header case-insensitive
- Regra de body com dot notation
- Body nao-JSON → regras de body falham

**Criterio de conclusao:**
- Todos os cenarios cobertos
- Testes passando

---

### T26 [S] @tester — Testes E2E do mock handler com regras

**Arquivo:** `apps/api/tests/mock/handler.test.ts`

**Cenarios:**
- Request real com query param → endpoint correto responde
- Request real com header → endpoint correto responde
- Request real com body JSON → endpoint correto responde

**Criterio de conclusao:**
- Testes de integracao completos com Supertest
- Fluxo E2E validado

---

## Fase 8: Documentacao e revisao

### T27 [S] @backend-dev — Atualizar comentarios de decisao arquitetural

**Arquivos:** schema.ts, engine.ts

**O que fazer:**
- Adicionar comentarios `// Por que:` em decisoes nao obvias
- Documentar limite de 20 regras
- Documentar comportamento de empate

**Criterio de conclusao:**
- Codigo autoexplicativo com decisoes documentadas

---

### T28 [M] @code-reviewer — Revisao de codigo completa

**Escopo:** Todos os arquivos alterados/criados nesta spec

**O que verificar:**
- Convencoes de codigo seguidas (CLAUDE.md)
- Sem `any`, tipos explicitos
- Logs via `fastify.log`
- Testes com cobertura adequada
- Performance: sem N+1 queries
- Seguranca: validacao de input completa

**Criterio de conclusao:**
- PR aprovado
- Nenhum blocker pendente

---

## Resumo de estimativas

| Fase | Tarefas | Estimativa total |
|------|---------|------------------|
| Schema e tipos | T01-T04 | ~2h (4x S) |
| Service layer | T05-T09 | ~5h (2x S + 3x M) |
| Rotas API | T10-T12 | ~1.5h (3x S) |
| Mock engine | T13-T15 | ~4h (1x S + 2x M) |
| Frontend tipos/hooks | T16-T17 | ~1h (2x S) |
| Frontend componentes | T18-T22 | ~5h (2x S + 3x M) |
| Testes integracao | T23-T26 | ~5h (1x S + 3x M) |
| Documentacao/revisao | T27-T28 | ~2h (1x S + 1x M) |
| **Total** | **28 tarefas** | **~25-30h** |

---

## Ordem de execucao sugerida

```
Semana 1 (Backend):
  T01 → T02 → T03 → T05 → T06 → T07 → T08 → T09
  T10 → T11 → T12
  T13 → T14 → T15

Semana 1 (Frontend, paralelo):
  T04 → T16 → T17

Semana 2 (Frontend):
  T18 → T19 → T20 → T21 → T22

Semana 2 (Testes, paralelo):
  T23 → T24 → T25 → T26

Final:
  T27 → T28
```

---

## Notas para implementacao

1. **Migracao sem downtime:** T01 cria tabela nova, nao altera existente. Deploy pode ser feito em qualquer momento.

2. **Backward compatibility:** Endpoints sem regras continuam funcionando identicamente. Nenhuma mudanca de comportamento para usuarios existentes.

3. **Testes existentes:** Todos os testes da Spec 001 devem continuar passando. Se algum quebrar, e bug na implementacao.

4. **Frontend minimo:** Se frontend da Spec 001 ainda nao existe (apenas App.tsx), T18-T22 criam os componentes de regras que serao integrados quando o form for criado.
