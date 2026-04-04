# Spec 006 — Multi-tenant workspaces

**Status:** aguardando design (@architect)
**Depende de:** Spec 001 (endpoints CRUD) — concluída
**Depende de:** Spec 002 (matching avançado) — endpoints com regras pertencem a workspaces
**Depende de:** Spec 004 (import/export) — export e import são por workspace
**Criado em:** 2025-04

---

## Contexto

Atualmente o StubLab tem um único espaço global de endpoints. Times que mockam sistemas
diferentes (ex: `payments-api`, `user-service`, `notifications`) compartilham a mesma listagem
e o mesmo namespace de paths, o que gera conflito e poluição visual.

Workspaces isolam completamente os endpoints por sistema mockado. Cada workspace tem seu próprio
slug, sua própria listagem de endpoints e seu próprio subpath no mock server. As aplicações em
teste apontam para `http://stublab:4000/{slug}/` e recebem apenas os mocks daquele workspace.

---

## User stories

**US-01 — Criar workspace**
Como desenvolvedor,
quero criar um workspace para o sistema que vou mockar,
para isolar seus endpoints dos demais sistemas.

Critérios de aceitação:
- QUANDO preencho nome e slug do workspace e confirmo
- ENTÃO o workspace é criado e aparece na listagem
- E sou redirecionado para a tela de endpoints desse workspace (vazia)
- O slug é gerado automaticamente a partir do nome (ex: "Payments API" → `payments-api`)
- O slug pode ser editado manualmente antes de salvar
- SE o slug já existe, ENTÃO recebo erro: "Este slug já está em uso"

**US-02 — Regras de slug**
Como desenvolvedor,
quero que o slug seja simples e seguro para usar em URLs,
para não ter problemas ao configurar nas aplicações.

Critérios de aceitação:
- Slug aceita apenas letras minúsculas, números e hífens
- Slug não pode começar ou terminar com hífen
- Comprimento: 3–60 caracteres
- Exemplos válidos: `payments-api`, `user-service`, `notifications-v2`
- Exemplos inválidos: `Payments API`, `-api`, `a`, `payments_api`

**US-03 — Listar workspaces**
Como desenvolvedor,
quero ver todos os workspaces disponíveis na tela inicial,
para navegar rapidamente entre os sistemas mockados.

Critérios de aceitação:
- QUANDO acesso `http://stublab:3000/`
- ENTÃO vejo cards de todos os workspaces com: nome, slug, quantidade de endpoints ativos
- E um botão "Novo workspace"
- QUANDO clico em um card
- ENTÃO navego para a listagem de endpoints daquele workspace

**US-04 — Endpoints isolados por workspace**
Como desenvolvedor,
quero que endpoints de workspaces diferentes não se misturem,
para evitar conflitos entre sistemas mockados.

Critérios de aceitação:
- A listagem de endpoints exibe apenas os endpoints do workspace atual
- Dois workspaces diferentes podem ter endpoints com o mesmo `method + path` sem conflito
- A busca e os filtros operam apenas dentro do workspace atual
- O workspace atual é visível na navegação (breadcrumb ou sidebar)

**US-05 — Mock server isolado por workspace via subpath**
Como desenvolvedor,
quero que cada workspace responda em seu próprio subpath,
para apontar as aplicações em teste para o workspace correto.

Critérios de aceitação:
- QUANDO cadastro `GET /usuarios` no workspace `user-service`
- ENTÃO `GET http://stublab:4000/user-service/usuarios` retorna o mock configurado
- E `GET http://stublab:4000/payments-api/usuarios` retorna 404 (não existe nesse workspace)
- O slug do workspace é o primeiro segmento do path — o restante é o path do endpoint
- Requests para `http://stublab:4000/slug-inexistente/qualquer-path` retornam
  `404 { "error": "Workspace não encontrado", "code": "WORKSPACE_NOT_FOUND" }`

**US-06 — Renomear workspace**
Como desenvolvedor,
quero renomear um workspace,
para corrigir o nome sem precisar recriar tudo.

Critérios de aceitação:
- QUANDO edito o nome do workspace e salvo
- ENTÃO o nome é atualizado na listagem e no breadcrumb
- O slug NÃO muda ao renomear — é estável após a criação
- Exceção: o slug pode ser alterado explicitamente em uma edição avançada com aviso:
  "Alterar o slug quebra as URLs já configuradas nas aplicações. Deseja continuar?"

**US-07 — Deletar workspace**
Como desenvolvedor,
quero deletar um workspace que não uso mais,
para manter a listagem limpa.

Critérios de aceitação:
- QUANDO clico em deletar workspace
- ENTÃO vejo confirmação: "Isso irá deletar o workspace e todos os seus N endpoints. Esta ação não pode ser desfeita."
- QUANDO confirmo
- ENTÃO o workspace e todos os seus endpoints (e regras de matching) são deletados em cascata
- Requests para o slug deletado passam a retornar 404 imediatamente

**US-08 — Exportar e importar por workspace**
Como desenvolvedor,
quero que o export/import (Spec 004) opere dentro do contexto do workspace atual,
para trocar configurações entre instâncias do StubLab mantendo o isolamento.

Critérios de aceitação:
- O arquivo exportado inclui o `workspaceSlug` e `workspaceName` como metadado
- QUANDO importo em um workspace diferente do original
- ENTÃO os endpoints são criados no workspace atual — o slug do arquivo é apenas informativo
- A detecção de conflito (Spec 004) opera dentro do workspace de destino

---

## Modelo de dados

```
Workspace
  id:        uuid
  name:      string        — ex: "Payments API"
  slug:      string        — ex: "payments-api" (único, imutável por padrão)
  createdAt: timestamp
  updatedAt: timestamp

Endpoint (alteração)
  + workspaceId: uuid (FK → Workspace, NOT NULL)
```

A unicidade de `method + path` passa a ser por workspace:
`UNIQUE (workspaceId, method, path)` entre endpoints ativos.

---

## Roteamento do mock server

```
Request: GET /payments-api/transactions/42

1. Extrair slug: "payments-api"
2. Buscar workspace pelo slug → encontrado
3. Extrair path do endpoint: "/transactions/42"
4. Resolver endpoint dentro do workspace "payments-api" com path "/transactions/42"
5. Retornar response ou 404 se não houver match
```

O algoritmo de resolução da Spec 002 (score por regras) opera dentro do workspace — nunca
cruza endpoints de workspaces diferentes.

---

## UI — navegação entre workspaces

```
Tela inicial (/)
  └── Cards de workspaces
        └── [clique] → /workspaces/{slug}/endpoints
              └── Listagem de endpoints do workspace
              └── Criação / edição de endpoint
```

O slug do workspace aparece como primeiro nível da navegação na sidebar ou breadcrumb:

```
StubLab > payments-api > endpoints > novo endpoint
```

---

## Migração de dados existentes

Como o StubLab já possui endpoints cadastrados (Spec 001), é necessário migrar os dados:

- Criar um workspace padrão: nome `"Default"`, slug `"default"`
- Associar todos os endpoints existentes a esse workspace (`workspaceId = default.id`)
- A migration deve ser não-destrutiva — nenhum endpoint é perdido

---

## O que está FORA do escopo desta spec

- Autenticação e permissões por workspace (spec futura)
- Limite de endpoints por workspace (spec futura)
- Workspace templates — criar workspace já com endpoints pré-definidos (spec futura)
- Histórico de requests por workspace (depende da Spec de histórico)
- Subdomain por workspace: `payments-api.stublab.company.com` (spec futura)

---

## Impacto em features existentes

| Spec | Impacto |
|------|---------|
| Spec 001 — CRUD | Todos os endpoints ganham `workspaceId`; UI ganha seletor/contexto de workspace |
| Spec 002 — Matching | Unicidade `method+path` passa a ser por workspace; algoritmo de resolução filtra por workspace |
| Spec 003 — JSON editor | Nenhum impacto |
| Spec 004 — Import/Export | Arquivo exportado inclui metadado do workspace; import opera dentro do workspace ativo |
| Spec 005 — Docker | Nenhum impacto no empacotamento; migration roda no startup normalmente |

---

## Próximo passo

@architect deve ler esta spec e produzir:
1. `.claude/specs/006-workspaces/design.md` — mudanças no schema, estratégia de migration dos
   dados existentes, roteamento do mock server por slug, impacto nas rotas da admin API
2. `.claude/specs/006-workspaces/tasks.md` — tarefas ordenadas para @backend-dev,
   @frontend-dev e @tester
