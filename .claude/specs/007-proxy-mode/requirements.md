# Spec 007 — Proxy mode

**Status:** aguardando design (@architect)
**Depende de:** Spec 001 (endpoints CRUD) — concluída
**Depende de:** Spec 006 (workspaces) — proxy é configurado por workspace
**Relacionada com:** Spec de histórico (futura) — requests proxiados serão registrados
**Criado em:** 2025-04

---

## Contexto

Atualmente, quando uma request chega ao mock server e não encontra nenhum endpoint
correspondente, o StubLab retorna `404`. Isso obriga o time a mockar todos os endpoints de um
sistema antes de conseguir usá-lo em testes — o que cria fricção na adoção.

O proxy mode permite que cada workspace defina uma URL base de serviço real. Quando uma request
não encontra match entre os endpoints mockados, em vez de retornar `404`, o StubLab encaminha a
request para esse serviço real e devolve a resposta ao cliente — de forma transparente.

Isso permite adoção gradual: o time aponta a aplicação para o StubLab desde o primeiro dia e
vai cadastrando mocks progressivamente, sem precisar ter tudo mockado de uma vez.

---

## Comportamento geral

```
Request chega → busca endpoint mockado no workspace
  ├── Encontrou match → responde com o mock (comportamento atual)
  └── Não encontrou →
        ├── Proxy mode ATIVO → encaminha para URL base do workspace + path original
        └── Proxy mode INATIVO → retorna 404 (comportamento atual)
```

---

## User stories

**US-01 — Configurar proxy mode no workspace**
Como desenvolvedor,
quero definir uma URL base de proxy para o workspace,
para que requests sem mock sejam encaminhadas ao serviço real.

Critérios de aceitação:
- QUANDO acesso as configurações do workspace
- ENTÃO vejo campo "URL base de proxy" e toggle "Proxy mode ativo"
- QUANDO preencho `https://api.meuservico.com.br` e ativo o proxy
- ENTÃO o workspace exibe indicador visual de que proxy está ativo
- A URL base aceita HTTP e HTTPS
- A URL base não deve ter trailing slash — validar e remover automaticamente se presente
- QUANDO desativo o toggle sem remover a URL
- ENTÃO o proxy é desativado mas a URL fica salva para reativar depois

**US-02 — Encaminhar request sem match para o serviço real**
Como desenvolvedor,
quero que requests sem endpoint mockado sejam transparentemente encaminhadas,
para que a aplicação em teste não perceba a diferença.

Critérios de aceitação:
- QUANDO proxy mode está ativo e chega `GET /payments-api/transactions/42`
- E não existe endpoint mockado para `GET /transactions/42` nesse workspace
- ENTÃO o StubLab faz `GET https://api.meuservico.com.br/transactions/42`
- E devolve ao cliente exatamente o status, headers e body recebidos do serviço real
- Os headers originais da request do cliente são repassados ao serviço real
- O header `Host` é reescrito para o host da URL base do proxy
- Um header `X-Stublab-Proxied: true` é adicionado à resposta para identificar que veio do proxy

**US-03 — Mock tem prioridade sobre proxy**
Como desenvolvedor,
quero que endpoints mockados sempre respondam antes do proxy,
para garantir que meus stubs nunca sejam ignorados.

Critérios de aceitação:
- QUANDO existe endpoint mockado para `GET /transactions/:id`
- E proxy mode está ativo
- ENTÃO o mock responde — o proxy não é acionado
- O proxy só é acionado quando o algoritmo de resolução não encontra nenhum candidato

**US-04 — Timeout e erro no serviço real**
Como desenvolvedor,
quero receber erros claros quando o serviço real estiver indisponível,
para distinguir falhas do proxy de falhas da minha aplicação.

Critérios de aceitação:
- QUANDO o serviço real não responde em até 10 segundos (timeout configurável via `PROXY_TIMEOUT_MS`)
- ENTÃO o StubLab retorna `504 { "error": "Proxy timeout", "code": "PROXY_TIMEOUT", "target": "https://api.meuservico.com.br/transactions/42" }`
- QUANDO o serviço real é inacessível (connection refused, DNS falhou)
- ENTÃO retorna `502 { "error": "Proxy error", "code": "PROXY_ERROR", "target": "...", "reason": "..." }`
- Em ambos os casos o header `X-Stublab-Proxied: true` está presente na resposta de erro

**US-05 — Indicação visual na UI de requests proxiadas**
Como desenvolvedor,
quero identificar facilmente quais requests foram proxiadas e quais foram mockadas,
para entender o comportamento do sistema em testes.

Critérios de aceitação:
- Na tela de configurações do workspace, quando proxy mode está ativo:
  - Badge "Proxy ativo" visível no header do workspace
  - URL base exibida abaixo do badge
- Quando a Spec de histórico for implementada, requests proxiadas devem ter indicação
  visual distinta (ex: badge "Proxiado" vs "Mockado") — preparar o modelo de dados agora

**US-06 — Proxy mode por variável de ambiente (override global)**
Como administrador,
quero poder desativar o proxy mode globalmente via variável de ambiente,
para ambientes onde o acesso ao serviço real não é desejado (ex: CI offline).

Critérios de aceitação:
- QUANDO `PROXY_ENABLED=false` está definido no ambiente
- ENTÃO o proxy mode é desativado em todos os workspaces, independente da configuração individual
- A UI exibe aviso: "Proxy mode desativado globalmente pelo administrador"
- A configuração individual de cada workspace é preservada — ao remover a variável, o proxy volta

---

## Modelo de dados

```
Workspace (alteração)
  + proxyUrl:     string | null   — ex: "https://api.meuservico.com.br"
  + proxyEnabled: boolean         — default false
```

Nenhuma tabela nova necessária. O proxy é comportamento do mock server baseado na
configuração do workspace.

---

## Comportamento de headers no proxy

| Header              | Comportamento                                              |
|---------------------|------------------------------------------------------------|
| `Host`              | Reescrito para o host da URL base do proxy                 |
| `X-Forwarded-For`   | Adicionado com o IP do cliente original                    |
| `X-Forwarded-Host`  | Adicionado com o host original da request                  |
| `X-Stublab-Proxied` | Adicionado na **resposta** com valor `true`                |
| Demais headers      | Repassados sem modificação (request e resposta)            |

Headers que **não** são repassados ao serviço real:
- `X-Stublab-*` — headers internos do StubLab

---

## Construção da URL de destino

```
URL base do workspace:  https://api.meuservico.com.br
Path do endpoint:       /transactions/42?page=1&limit=10

URL de destino:         https://api.meuservico.com.br/transactions/42?page=1&limit=10
```

O path completo (incluindo query string) é preservado. O slug do workspace é removido —
ele é apenas roteamento interno do StubLab.

---

## Variáveis de ambiente

| Variável            | Padrão  | Descrição                                         |
|---------------------|---------|---------------------------------------------------|
| `PROXY_ENABLED`     | `true`  | Permite desativar proxy globalmente               |
| `PROXY_TIMEOUT_MS`  | `10000` | Timeout em ms para chamadas ao serviço real       |

---

## O que está FORA do escopo desta spec

- Modificar a resposta do serviço real antes de devolver ao cliente (spec futura)
- Gravar a resposta real como mock automaticamente ("record mode") (spec futura)
- Autenticação no serviço real (Bearer token, mTLS) (spec futura)
- Proxy por endpoint individual (spec futura — esta spec é apenas por workspace)
- Reescrita de paths (`/v1/` → `/v2/`) (spec futura)

---

## Impacto em features existentes

| Spec | Impacto |
|------|---------|
| Spec 001 — CRUD | Nenhum |
| Spec 002 — Matching | Proxy só é acionado quando o algoritmo de resolução não retorna nenhum candidato |
| Spec 005 — Docker | Adicionar `PROXY_ENABLED` e `PROXY_TIMEOUT_MS` ao `.env.example` e `docker-compose.yml` |
| Spec 006 — Workspaces | Schema do workspace ganha `proxyUrl` e `proxyEnabled`; UI ganha seção de configuração |
| Spec de histórico (futura) | Modelo de dados de log deve incluir campo `proxied: boolean` e `proxyTarget: string` |

---

## Próximo passo

@architect deve ler esta spec e produzir:
1. `.claude/specs/007-proxy-mode/design.md` — biblioteca de proxy recomendada (ex:
   `undici`, `node-http-proxy`), estratégia de streaming de resposta, reescrita de headers,
   integração com o algoritmo de resolução da Spec 002
2. `.claude/specs/007-proxy-mode/tasks.md` — tarefas para @backend-dev, @frontend-dev e @tester
