# Spec 002 — Matching avançado de requests

**Status:** aguardando design (@architect)
**Depende de:** Spec 001 (endpoints CRUD) — concluída
**Criado em:** 2025-04

---

## Contexto

Na Spec 001 o matching é feito apenas por `method + path`. Isso é suficiente para o caso mais
simples, mas cenários reais de teste exigem mais controle: o mesmo path `/api/pagamentos` deve
retornar 200 para pagamentos aprovados e 422 para pagamentos com cartão inválido — a diferença
está no body da request, não no path.

O matching avançado permite definir **regras adicionais** em um endpoint que, se satisfeitas,
fazem aquele endpoint "ganhar" sobre outros com o mesmo `method + path`. Endpoints sem regras
adicionais continuam funcionando como fallback.

---

## Conceito central — regras e prioridade

Um endpoint pode ter zero ou mais **regras de matching**. Cada regra diz:
"para este endpoint ser escolhido, a request precisa satisfazer esta condição."

Quando uma request chega, o servidor avalia todos os endpoints ativos com aquele `method + path`
e escolhe o **mais específico** que satisfaz todas as suas regras. O endpoint sem regras adicionais
é sempre o fallback de menor prioridade.

```
Request: POST /api/pagamentos  body: { "cartao": "invalido" }

Candidatos:
  Endpoint A — sem regras adicionais           → prioridade 0 (fallback)
  Endpoint B — regra: body.cartao == "invalido" → prioridade 1 ✓ match

Resultado: Endpoint B responde (422 Cartão inválido)
```

---

## User stories

**US-01 — Definir regras de matching por query param**
Como desenvolvedor,
quero que um endpoint só responda quando a request contiver um query param específico,
para simular diferentes comportamentos de um mesmo path.

Critérios de aceitação:
- QUANDO defino a regra `query.status == "ativo"` em um endpoint
- E chega uma request `GET /usuarios?status=ativo`
- ENTÃO esse endpoint responde
- SE chega `GET /usuarios?status=inativo`, ENTÃO o fallback responde
- SE chega `GET /usuarios` sem o param, ENTÃO o fallback responde

**US-02 — Definir regras de matching por header**
Como desenvolvedor,
quero que um endpoint só responda quando a request contiver um header específico,
para simular autenticação, feature flags ou versionamento por header.

Critérios de aceitação:
- QUANDO defino a regra `header.x-tenant-id == "empresa-abc"`
- E chega uma request com esse header
- ENTÃO esse endpoint responde
- SE o header estiver ausente ou com valor diferente, ENTÃO o fallback responde

**US-03 — Definir regras de matching por body (JSON)**
Como desenvolvedor,
quero que um endpoint só responda quando o body da request satisfizer uma condição,
para simular respostas diferentes para diferentes payloads.

Critérios de aceitação:
- QUANDO defino a regra `body.tipo == "PIX"`
- E chega uma request com `{ "tipo": "PIX", "valor": 100 }`
- ENTÃO esse endpoint responde
- SE o body tiver `{ "tipo": "BOLETO" }`, ENTÃO o fallback responde
- QUANDO o body não é JSON válido, ENTÃO a regra de body nunca é satisfeita

**US-04 — Combinar múltiplas regras (AND)**
Como desenvolvedor,
quero definir múltiplas regras em um endpoint,
para cenários que dependem de mais de uma condição simultaneamente.

Critérios de aceitação:
- QUANDO defino duas regras: `query.env == "prod"` E `header.x-force-error == "true"`
- ENTÃO o endpoint só responde se AMBAS forem satisfeitas
- SE apenas uma for satisfeita, o fallback responde

**US-05 — Prioridade por número de regras**
Como desenvolvedor,
quero que o endpoint mais específico sempre ganhe,
para não precisar me preocupar com ordem de cadastro.

Critérios de aceitação:
- QUANDO existem dois endpoints para o mesmo `method + path`:
  - Endpoint A com 1 regra
  - Endpoint B com 2 regras (que incluem a regra do A mais outra)
- E chega uma request que satisfaz ambos
- ENTÃO o Endpoint B responde (mais específico = mais regras satisfeitas)

**US-06 — Gerenciar regras pela UI**
Como desenvolvedor,
quero adicionar, editar e remover regras de matching diretamente na tela de edição do endpoint,
para não precisar escrever JSON ou usar a API diretamente.

Critérios de aceitação:
- QUANDO estou na tela de criação ou edição de um endpoint
- ENTÃO vejo uma seção "Regras de matching" com botão "Adicionar regra"
- E para cada regra defino: origem (query / header / body), campo, operador, valor
- E posso remover qualquer regra individualmente
- E o preview em tempo real mostra um exemplo de request que satisfaria as regras

---

## Modelo de dados — regra de matching

```
MatchingRule
  id:         uuid
  endpointId: uuid (FK → Endpoint)
  source:     enum  — "query" | "header" | "body"
  field:      string — ex: "status", "x-tenant-id", "pagamento.tipo"
  operator:   enum  — "eq" | "neq" | "contains" | "exists" | "not_exists"
  value:      string | null  — null quando operator é "exists" ou "not_exists"
```

### Operadores suportados

| Operador     | Descrição                                | Exemplo                          |
|--------------|------------------------------------------|----------------------------------|
| `eq`         | igual (case-sensitive)                   | `body.status eq "ativo"`         |
| `neq`        | diferente                                | `query.env neq "prod"`           |
| `contains`   | string contém substring                  | `header.user-agent contains "Mozilla"` |
| `exists`     | campo existe na origem (valor irrelevante)| `header.authorization exists`   |
| `not_exists` | campo não existe na origem               | `query.debug not_exists`         |

### Acesso a campos aninhados (body)

Usar dot notation: `pagamento.cartao.numero`, `itens.0.sku`

---

## Algoritmo de resolução

```
função resolveEndpoint(method, path, request):
  candidatos = endpoints ativos com method+path correspondente

  para cada candidato:
    regras = regras de matching do candidato
    satisfeitas = regras onde avaliarRegra(regra, request) == true
    
    se len(satisfeitas) == len(regras):  // todas satisfeitas
      candidato.score = len(regras)
    senão:
      descartar candidato

  se nenhum candidato:
    retornar 404

  retornar candidato com maior score
  // empate: candidato com createdAt mais recente ganha
```

---

## Regras de negócio

- Endpoint sem `MatchingRule` tem score 0 — é sempre o fallback
- Regras são avaliadas com AND — todas precisam ser satisfeitas
- OR não é suportado nesta spec (pode ser spec futura via grupos de regras)
- Campos de body são avaliados somente se `Content-Type: application/json`
- Campos de header são case-insensitive: `X-Tenant-Id` == `x-tenant-id`
- Campos de query são case-sensitive
- Se o campo não existir na request, a regra falha (exceto `not_exists` que passa)
- Empate de score: o endpoint criado mais recentemente ganha

---

## O que está FORA do escopo desta spec

- Operador OR entre regras (spec futura — grupos de regras)
- Matching por regex (spec futura)
- Matching por XML body (spec futura)
- Matching por path params (`:id == "42"`) — path params não são regras, são parte do path
- Visualização de qual regra foi responsável pelo match no histórico (depende da Spec 003)

---

## Impacto em features existentes

- **Spec 001 — endpoints CRUD:** formulário de endpoint ganha seção de regras; API de criação/edição
  precisa aceitar e persistir `matchingRules[]`
- **Engine de mock (interceptador):** algoritmo de resolução atual (match por method+path) precisa
  ser substituído pelo algoritmo com score descrito acima

---

## Exemplos de uso real

### Cenário 1 — Simular autenticação
```
Endpoint A: POST /api/login — sem regras → responde 401 { "erro": "não autorizado" }
Endpoint B: POST /api/login — regra: body.senha eq "senha123" → responde 200 { "token": "abc" }
```

### Cenário 2 — Simular feature flag por header
```
Endpoint A: GET /api/produto/1 — sem regras → responde versão antiga
Endpoint B: GET /api/produto/1 — regra: header.x-feature-v2 exists → responde versão nova
```

### Cenário 3 — Ambiente de teste vs produção
```
Endpoint A: GET /api/config — regra: query.env eq "staging" → retorna config de staging
Endpoint B: GET /api/config — regra: query.env eq "prod" → retorna config de prod
Endpoint C: GET /api/config — sem regras → retorna config default (fallback)
```

---

## Próximo passo

@architect deve ler esta spec e produzir:
1. `.claude/specs/002-advanced-matching/design.md` — mudanças no schema, contrato da API atualizado, algoritmo detalhado
2. `.claude/specs/002-advanced-matching/tasks.md` — tarefas atômicas para backend, frontend e testes
